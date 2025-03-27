# myMCPClient API ドキュメント

このAPIは、MCPクライアントを操作するためのインターフェースを提供します。

## 基本情報
- ベースURL: `http://localhost:8000`
- レスポンス形式: JSON
- イベントストリーム: テキストイベントストリーム（`text/event-stream`）

## エンドポイント一覧

### セッション管理

#### 新しいセッションの作成
- **URL:** `/create_session`
- **メソッド:** POST
- **レスポンス:** `{ "session_id": 数値 }`

#### セッション一覧の取得
- **URL:** `/sessions`
- **メソッド:** GET
- **レスポンス:** `{ "sessions": [{ "id": 数値, "created_at": 日時 }] }`

#### 会話履歴の取得
- **URL:** `/history/{session_id}`
- **メソッド:** GET
- **パラメータ:** `session_id` - セッションID（数値）
- **レスポンス:** `{ "session_id": 数値, "messages": [{ "role": 文字列, "content": 文字列 }] }`

### AIとの対話

#### AIに質問する
- **URL:** `/query`
- **メソッド:** POST
- **リクエスト本文:**
```json
{
  "query": "質問内容",
  "session_id": 数値（省略可）
}
```
- **レスポンス:** テキストイベントストリーム（AIの応答がチャンクごとに送信される）
- **注意:** `session_id`を省略すると新しいセッションが自動的に作成される

### ツール管理

#### ツール情報の取得
- **URL:** `/tools`
- **メソッド:** GET
- **レスポンス:** `{ "tools": { "ツール名": 使用状態(真偽値) } }`

#### ツールの使用状態変更
- **URL:** `/tools/{tool_name}`
- **メソッド:** POST
- **クエリパラメータ:** `use` - 使用状態（真偽値）
- **レスポンス:** `{ "status": "success", "tool": "ツール名", "use": 使用状態 }`

### システム

#### ヘルスチェック
- **URL:** `/health`
- **メソッド:** GET
- **レスポンス:** `{ "status": "ok" }`

## 使用例

### AIに質問する（cURLの例）
```bash
curl -X POST "http://localhost:8000/query" \
     -H "Content-Type: application/json" \
     -d '{"query": "こんにちは、今日の天気は？", "session_id": 1}'
```

### 新しいセッションを作成する
```bash
curl -X POST "http://localhost:8000/create_session"
```