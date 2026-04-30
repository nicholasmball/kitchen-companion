const sharp = require('sharp')
const path = require('path')

const SOURCE = path.join(__dirname, '..', 'public', 'images', 'branding', 'mascot circle.png')
const OUT_DIR = path.join(__dirname, '..', 'public', 'icons')
const BG = '#FAF6F1'
const SAFE_ZONE = 0.8

async function generateStandard(size) {
  await sharp(SOURCE)
    .resize(size, size, { fit: 'contain', background: BG })
    .png()
    .toFile(path.join(OUT_DIR, `icon-${size}x${size}.png`))
  console.log(`  icon-${size}x${size}.png`)
}

async function generateMaskable(size) {
  const inner = Math.round(size * SAFE_ZONE)
  const resized = await sharp(SOURCE).resize(inner, inner, { fit: 'contain', background: BG }).png().toBuffer()
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: BG,
    },
  })
    .composite([{ input: resized, gravity: 'center' }])
    .png()
    .toFile(path.join(OUT_DIR, `icon-maskable-${size}x${size}.png`))
  console.log(`  icon-maskable-${size}x${size}.png`)
}

;(async () => {
  console.log('Generating PWA icons from', path.basename(SOURCE))
  await generateStandard(192)
  await generateStandard(512)
  await generateMaskable(192)
  await generateMaskable(512)
  console.log('Done.')
})().catch((err) => {
  console.error(err)
  process.exit(1)
})
