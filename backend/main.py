from langchain_mcp_adapters.client import MultiServerMCPClient
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn
from pydantic import BaseModel
import os
import sqlite3
from datetime import datetime
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
import sys
import pathlib
import json
import logging
import time  # 追加: ミドルウェア用

from mcp.client.stdio import stdio_client
from langchain_mcp_adapters.tools import load_mcp_tools
from langgraph.prebuilt import create_react_agent
from langchain_anthropic import ChatAnthropic
import dotenv
import asyncio
from langchain.schema import SystemMessage, HumanMessage, AIMessage

# MCPサーバー設定を格納するグローバル変数
mcp_servers_config = {}

# MCPサーバー設定をJSONファイルから読み込む関数
def load_mcp_servers_config():
    config_path = os.path.join(os.path.dirname(__file__), "mcp_servers.json")
    try:
        with open(config_path, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        # デフォルト設定を返す
        return {}

# バックエンドディレクトリに基づいて.envファイルを読み込む
dotenv.load_dotenv(os.path.join(os.path.dirname(__file__), "../.env"))

# データベースの初期設定
DB_PATH = os.path.join(os.path.dirname(__file__), "chat_history.db")


def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # 会話セッションテーブル
    cursor.execute(
        """
    CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """
    )

    # メッセージテーブル
    cursor.execute(
        """
    CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER,
        role TEXT,
        content TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES sessions (id)
    )
    """
    )

    conn.commit()
    conn.close()


# データベース初期化
init_db()

# ログの設定
logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("debug.log"),
        logging.StreamHandler()
    ]
)

app = FastAPI()

# リクエストとエラーのログ記録用ミドルウェアを追加
@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger = logging.getLogger("backend")
    start_time = time.time()
    try:
        response = await call_next(request)
    except Exception as exc:
        logger.exception(f"{request.method} {request.url} でエラー発生")
        raise exc
    process_time = time.time() - start_time
    logger.info(f"{request.method} {request.url.path} {response.status_code} 完了 (処理時間: {process_time:.2f}秒)")
    return response

# CORSミドルウェアを追加
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # すべてのオリジンを許可
    allow_credentials=True,
    allow_methods=["*"],  # すべてのメソッドを許可
    allow_headers=["*"],  # すべてのヘッダーを許可
)

model = ChatAnthropic(model="claude-3-5-sonnet-20241022")
client = None


class QueryRequest(BaseModel):
    query: str
    session_id: int = None


class SessionResponse(BaseModel):
    session_id: int


# 新しいセッションを作成するエンドポイント
@app.post("/create_session", response_model=SessionResponse)
async def create_session():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("INSERT INTO sessions DEFAULT VALUES")
    session_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return {"session_id": session_id}


# セッション一覧を取得するエンドポイント
@app.get("/sessions")
async def get_sessions():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT id, created_at FROM sessions ORDER BY created_at DESC")
    sessions = [{"id": row[0], "created_at": row[1]} for row in cursor.fetchall()]
    conn.close()
    return {"sessions": sessions}


# 会話履歴を取得するエンドポイント
@app.get("/history/{session_id}")
async def get_history(session_id: int):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "SELECT role, content FROM messages WHERE session_id = ? ORDER BY timestamp",
        (session_id,),
    )
    messages = [
        {"role": role, "content": content} for role, content in cursor.fetchall()
    ]
    conn.close()
    return {"session_id": session_id, "messages": messages}


async def stream_agent_response(query: str, session_id: int):
    # DBにユーザーメッセージを保存
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO messages (session_id, role, content) VALUES (?, ?, ?)",
        (session_id, "user", query),
    )
    conn.commit()

    # 会話ログを取得
    cursor.execute(
        "SELECT role, content FROM messages WHERE session_id = ? ORDER BY id",
        (session_id,),
    )
    conversation_history = [
        {"role": row[0], "content": row[1]} for row in cursor.fetchall()
    ]

    conversation_messages = []
    with open(os.path.join(os.path.dirname(__file__), "system_prompt.txt"), "r") as f:
            conversation_messages.append(SystemMessage(content=f.read()))
    for msg in conversation_history:
        role = msg["role"]
        content = msg["content"]
        if role == "system":
            conversation_messages.append(SystemMessage(content=content))
        elif role == "user":
            conversation_messages.append(HumanMessage(content=content))
        else:
            conversation_messages.append(AIMessage(content=content))

    # AIの応答用の変数
    ai_response = ""

    # JSONから読み込んだMCPサーバー設定を使用
    async with MultiServerMCPClient(mcp_servers_config) as client:
        agent = create_react_agent(model, client.get_tools())
        # 会話履歴を指定
        async for event in agent.astream_events({"messages": conversation_messages}):
            if event["event"] == "on_chat_model_stream":
                mess = event["data"]["chunk"].content
                if len(mess) > 0 and mess[0]["type"] == "text":
                    chunk = mess[0]["text"]
                    ai_response += chunk
                    yield f"data: {chunk}\n\n"
                elif len(mess) > 0 and mess[0]["type"] == "tool_use":
                    tool_str = mess[0].__str__() + "\n"
                    # ai_response += tool_str
                    # yield f"data: {tool_str}\n\n"

    # 完全な応答をDBに保存
    cursor.execute(
        "INSERT INTO messages (session_id, role, content) VALUES (?, ?, ?)",
        (session_id, "assistant", ai_response),
    )
    conn.commit()
    conn.close()


@app.post("/query")
async def query_agent(request: QueryRequest):
    # セッションIDがない場合は新規作成
    if request.session_id is None:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("INSERT INTO sessions DEFAULT VALUES")
        session_id = cursor.lastrowid
        conn.commit()
        conn.close()
    else:
        session_id = request.session_id

    return StreamingResponse(
        stream_agent_response(request.query, session_id), media_type="text/event-stream"
    )


# ヘルスチェック用のエンドポイント（Electronからの接続確認用）
@app.get("/health")
async def health_check():
    return {"status": "ok"}

# アプリケーション起動時にMCPサーバー設定を読み込む
mcp_servers_config = load_mcp_servers_config()

if __name__ == "__main__":
    port = 8000
    # コマンドライン引数からポートを取得（オプション）
    if len(sys.argv) > 2 and sys.argv[1] == "api" and sys.argv[2].isdigit():
        port = int(sys.argv[2])

    # APIモードで起動
    if len(sys.argv) > 1 and sys.argv[1] == "api":
        uvicorn.run(app, host="0.0.0.0", port=port)
