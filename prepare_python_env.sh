#!/bin/bash

# ビルドディレクトリを作成
mkdir -p build

# Python仮想環境を作成
python3 -m venv app_venv

# 仮想環境をアクティベート
source app_venv/bin/activate

# 必要なパッケージをインストール（-eオプションなしで通常インストール）
pip install wheel
pip install .

# 依存関係一覧をファイルに出力
pip freeze > requirements-app.txt

# 仮想環境を非アクティベート
deactivate

echo "Python環境のセットアップが完了しました"
