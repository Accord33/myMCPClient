# アプリケーションのビルド手順

このドキュメントでは、AI チャットアシスタントアプリケーションをmacOS用パッケージ（.appファイル）にビルドする方法を説明します。

## 前提条件

- Node.js 16以上
- Python 3.10以上
- Homebrew（macOSパッケージマネージャー）

## 準備

1. 依存関係をインストール

```bash
# Node.js依存関係
npm install

# Python依存関係
pip install -e .

# ImageMagick（アイコン生成用）
brew install imagemagick
```

2. Pythonの仮想環境をセットアップ

```bash
# 環境準備スクリプトを実行
chmod +x prepare_python_env.sh
./prepare_python_env.sh
```

3. アプリケーションアイコンを生成

```bash
chmod +x create_icon.sh
./create_icon.sh
```

## ビルド

以下のコマンドを実行して、macOS用のアプリケーションをビルドします：

```bash
# DMGファイルを作成
npm run dist:mac
```

ビルドが完了すると、`dist`ディレクトリに以下のファイルが生成されます：
- `AI Chat Assistant-x.x.x.dmg` - インストーラーディスクイメージ
- `AI Chat Assistant-x.x.x-mac.zip` - 圧縮されたアプリケーション
- `mac` ディレクトリ内に `.app` アプリケーションファイル

## 注意事項

- アプリケーションを初回起動する際には、macOSのセキュリティ警告が表示される場合があります。「システム環境設定」>「セキュリティとプライバシー」からアプリの実行を許可してください。
- アプリケーションを起動する前に、`.env`ファイルに有効なAnthropicのAPIキーを設定してください。
