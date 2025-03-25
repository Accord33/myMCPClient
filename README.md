# AI チャットアシスタント

Electronを使用したデスクトップAIチャットアプリケーションです。このアプリケーションはChatGPTのようなインターフェースを持ち、LangChainとAnthropicのClaudeモデルを使用して会話を行います。

## 機能
- ChatGPTライクなモダンUI
- 会話履歴の保存と読み込み
- ストリーミング応答によるリアルタイム表示
- マークダウン形式のテキスト表示
- バックエンドはLangChainを使用
- Claude 3.5 Sonnetモデルを利用

## 開発環境のセットアップ

### 前提条件
- Node.js 16以上
- Python 3.10以上
- Anthropic API キー

### インストール

1. リポジトリをクローン
```bash
git clone <repository-url>
cd myMCPClient
```

2. フロントエンドの依存関係をインストール
```bash
npm install
```

3. バックエンドの依存関係をインストール
```bash
pip install -e .
```

4. `.env`ファイルを作成し、APIキーを設定
```
ANTHROPIC_API_KEY="your-api-key-here"
```

### アプリケーションの実行

開発モードで実行:
```bash
npm run start
```

これにより、バックエンドサーバーとElectronアプリケーションが同時に起動します。

## 技術スタック

### フロントエンド
- Electron
- HTML/CSS/JavaScript
- Marked.js (マークダウンレンダリング)

### バックエンド
- FastAPI
- LangChain
- SQLite (会話履歴の保存)
- Anthropic API (Claude 3.5 Sonnet)

## ライセンス
ISC
