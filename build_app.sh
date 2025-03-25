#!/bin/bash

# エラー時に中断
set -e

echo "====== AI Chat Assistant ビルドプロセス開始 ======"

# 1. 依存関係の確認
if ! command -v node &> /dev/null; then
    echo "Node.jsがインストールされていません"
    exit 1
fi

if ! command -v python3 &> /dev/null; then
    echo "Python 3がインストールされていません"
    exit 1
fi

if ! command -v convert &> /dev/null; then
    echo "ImageMagickがインストールされていません。インストールしてください: brew install imagemagick"
    exit 1
fi

# 2. Node.js依存関係のインストール
echo "Node.js依存関係をインストールしています..."
npm install

# 3. Python環境の準備
echo "Python環境を準備しています..."
chmod +x prepare_python_env.sh
./prepare_python_env.sh

# 4. アイコンの生成
echo "アプリケーションアイコンを生成しています..."
chmod +x create_icon.sh
./create_icon.sh

# 5. アプリケーションのビルド
echo "macOS用アプリケーションをビルドしています..."
npm run dist:mac

echo "====== ビルドプロセス完了 ======"
echo "アプリケーションは dist/ ディレクトリに生成されました"
