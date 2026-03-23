# アイコン設置手順

## 現在の状態
- `icon.svg` → 作成済み（SVG形式、すぐ使える）

## PNG版が必要な場合（iOS Safari の apple-touch-icon 用）

以下のどちらかの方法でPNGを用意してください。

### 方法A: オンラインツールで変換
1. https://svgtopng.com/ を開く
2. `icon.svg` をアップロード
3. 512×512 でダウンロード → `icon-512.png` として保存
4. 192×192 でダウンロード → `icon-192.png` として保存
5. 180×180 でダウンロード → `apple-touch-icon.png` として保存
6. この `icons/` フォルダに配置

### 方法B: PowerShell スクリプト（Inkscapeが必要）
```powershell
inkscape icon.svg --export-png=icon-512.png --export-width=512
inkscape icon.svg --export-png=icon-192.png --export-width=192
inkscape icon.svg --export-png=apple-touch-icon.png --export-width=180
```

## SVGだけでも動く
Chromeなど主要ブラウザはSVGアイコンをPWAアイコンとして認識します。
iOSのホーム画面追加では apple-touch-icon.png が使われますが、
ない場合はスクリーンショットが使われます（機能には影響なし）。
