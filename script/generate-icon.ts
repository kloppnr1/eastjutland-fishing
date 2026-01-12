import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const size = 1024;
const padding = 150; // Padding around the icon
const iconSize = size - (padding * 2);

// Create an app icon with background and the fish SVG
async function generateIcon() {
  const svgPath = path.resolve('client/public/favicon.svg');
  const outputPath = path.resolve('resources/icon.png');

  // Ensure resources directory exists
  if (!fs.existsSync('resources')) {
    fs.mkdirSync('resources', { recursive: true });
  }

  // Read and modify SVG to be larger
  let svgContent = fs.readFileSync(svgPath, 'utf-8');

  // Update viewBox and size for better rendering
  svgContent = svgContent
    .replace(/width="64"/, `width="${iconSize}"`)
    .replace(/height="64"/, `height="${iconSize}"`);

  // Create the icon with a nice background
  const background = Buffer.from(`
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#2563eb;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#1e3a5f;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="${size}" height="${size}" rx="180" fill="url(#bg)"/>
    </svg>
  `);

  // Render the fish SVG with white stroke
  const whiteFishSvg = svgContent
    .replace(/stroke="#1e3a5f"/g, 'stroke="white"')
    .replace(/fill="#1e3a5f"/g, 'fill="white"');

  const fishBuffer = await sharp(Buffer.from(whiteFishSvg))
    .resize(iconSize, iconSize, { fit: 'contain' })
    .png()
    .toBuffer();

  // Composite: background + fish
  await sharp(background)
    .composite([
      {
        input: fishBuffer,
        top: padding,
        left: padding,
      }
    ])
    .png()
    .toFile(outputPath);

  console.log(`Generated ${outputPath} (${size}x${size})`);

  // Also generate a splash screen (simple solid color for now)
  const splashPath = path.resolve('resources/splash.png');
  await sharp({
    create: {
      width: 2732,
      height: 2732,
      channels: 4,
      background: { r: 37, g: 99, b: 235, alpha: 1 } // #2563eb
    }
  })
    .png()
    .toFile(splashPath);

  console.log(`Generated ${splashPath} (2732x2732)`);
}

generateIcon().catch(console.error);
