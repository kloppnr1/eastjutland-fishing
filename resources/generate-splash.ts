import sharp from 'sharp';

async function createTextSplash() {
  try {
    const width = 2732;
    const height = 2732;
    
    // Create SVG with text
    const svg = `
      <svg width="${width}" height="${height}">
        <rect width="100%" height="100%" fill="#ffffff"/>
        <text
          x="50%"
          y="50%"
          font-family="Arial, Helvetica, sans-serif"
          font-size="120"
          font-weight="bold"
          fill="#000000"
          text-anchor="middle"
          dominant-baseline="middle">
          Østjylland
        </text>
        <text
          x="50%"
          y="54%"
          font-family="Arial, Helvetica, sans-serif"
          font-size="100"
          font-weight="normal"
          fill="#333333"
          text-anchor="middle"
          dominant-baseline="middle">
          LYSTFISKERGUIDE
        </text>
      </svg>
    `;
    
    await sharp(Buffer.from(svg))
      .png()
      .toFile('resources/splash.png');
    
    console.log('✅ Splash screen created at resources/splash.png');
    console.log('💡 Customize colors and fonts in the SVG code');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createTextSplash();
