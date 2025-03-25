#!/bin/bash

# ディレクトリ作成
mkdir -p build/icon.iconset

# サイズごとのアイコンを作成（サンプル）
# 実際にはデザインツールで適切なサイズのアイコンを作成することをお勧めします
# このスクリプトは簡易的なものです

# 簡易的なアイコン用のテンプレート作成
convert -size 1024x1024 xc:skyblue -fill white -gravity center -font "Arial" -pointsize 300 -annotate 0 "AI" build/icon1024.png

# 各サイズにリサイズ
convert build/icon1024.png -resize 16x16 build/icon.iconset/icon_16x16.png
convert build/icon1024.png -resize 32x32 build/icon.iconset/icon_16x16@2x.png
convert build/icon1024.png -resize 32x32 build/icon.iconset/icon_32x32.png
convert build/icon1024.png -resize 64x64 build/icon.iconset/icon_32x32@2x.png
convert build/icon1024.png -resize 128x128 build/icon.iconset/icon_128x128.png
convert build/icon1024.png -resize 256x256 build/icon.iconset/icon_128x128@2x.png
convert build/icon1024.png -resize 256x256 build/icon.iconset/icon_256x256.png
convert build/icon1024.png -resize 512x512 build/icon.iconset/icon_256x256@2x.png
convert build/icon1024.png -resize 512x512 build/icon.iconset/icon_512x512.png
convert build/icon1024.png -resize 1024x1024 build/icon.iconset/icon_512x512@2x.png

# .icnsファイルを作成
iconutil -c icns build/icon.iconset

# 一時ファイルを削除
rm build/icon1024.png
