const fs = require('fs')
const path = require('path')
const heicConvert = require('heic-convert')
const sharp = require('sharp')

// どの npm script で実行されたか
const mode = process.env.npm_lifecycle_event

// デフォルト値（変えたいならここを編集）
const DEFAULT_MAX_SIZE = 2000 // min または mincomp のとき
const DEFAULT_QUALITY = 80 // comp または mincomp のとき

let maxSize = null
let quality = null

if (mode === 'min') {
  maxSize = DEFAULT_MAX_SIZE
}
if (mode === 'comp') {
  quality = DEFAULT_QUALITY
}
if (mode === 'mincomp') {
  maxSize = DEFAULT_MAX_SIZE
  quality = DEFAULT_QUALITY
}

// 入出力ディレクトリ
const inputDir = path.join(__dirname, './image')
const outputDir = path.join(inputDir, '../dist')

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
}

fs.readdir(inputDir, async (err, files) => {
  if (err) {
    console.error('フォルダ読み込みエラー:', err)
    return
  }

  for (const file of files) {
    const ext = path.extname(file).toLowerCase()
    const baseName = path.basename(file).replace(/\.[^.]+$/i, '')
    const inputPath = path.join(inputDir, file)

    let outputExt = ext
    let buffer

    try {
      // HEIC → JPG
      if (ext === '.heic') {
        const inputBuffer = fs.readFileSync(inputPath)
        buffer = await heicConvert({
          buffer: inputBuffer,
          format: 'JPEG',
          quality: 1,
        })
        outputExt = '.jpg'
      }
      // JPG / JPEG → JPG
      else if (ext === '.jpg' || ext === '.jpeg') {
        buffer = fs.readFileSync(inputPath)
        outputExt = '.jpg'
      }
      // PNG → PNG
      else if (ext === '.png') {
        buffer = fs.readFileSync(inputPath)
        outputExt = '.png'
      } else {
        console.log(`スキップ: ${file}`)
        continue
      }

      // sharpで処理
      let sharpImg = sharp(buffer)

      // サイズ変更
      if (maxSize) {
        sharpImg = sharpImg.resize({
          width: maxSize,
          height: maxSize,
          fit: 'inside',
          withoutEnlargement: true,
        })
      }

      // 圧縮設定
      if (outputExt === '.jpg') {
        sharpImg = sharpImg.jpeg({
          quality: quality || 90,
          mozjpeg: true,
        })
      } else if (outputExt === '.png') {
        sharpImg = sharpImg.png({
          compressionLevel: quality ? Math.floor(quality / 10) : 6,
          palette: true, // パレット化してファイルサイズ削減
          adaptiveFiltering: true, // フィルタ自動最適化
        })
      }

      const outBuffer = await sharpImg.toBuffer()

      const outputPath = path.join(outputDir, `${baseName}${outputExt}`)
      fs.writeFileSync(outputPath, outBuffer)

      console.log(`✅ 変換完了: ${file} → ${baseName}${outputExt}`)
    } catch (error) {
      console.error(`❌ 変換失敗: ${file}`, error)
    }
  }
})
