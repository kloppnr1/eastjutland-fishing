import sharp from 'sharp';
import { join } from 'path';

async function createSplash() {
  try {
    // Background color (RGB format)
    const bgColor = { r: 255, g: 255, b: 255 }; // White - change as needed
    
    const splashSize = 2732;
    const iconSize = Math.floor(splashSize * 0.4);
    const position = Math.floor((splashSize - iconSize) / 2);
    
    // Resize icon
    const resizedIcon = await sharp('resources/icon.png')
      .resize(iconSize, iconSize)
      .toBuffer();
    
    // Create splash screen with centered icon
    await sharp({
      create: {
        width: splashSize,
        height: splashSize,
        channels: 4,
        background: bgColor
      }
    })
    .composite([{
      input: resizedIcon,
      top: position,
      left: position
    }])
    .png()
    .toFile('resources/splash.png');
    
    console.log('✅ Splash screen created at resources/splash.png');
    console.log('🎨 To change background color, edit bgColor in script/create-splash.ts');
    console.log('   Format: { r: 255, g: 255, b: 255 } (e.g., { r: 0, g: 102, b: 204 } for blue)');
  } catch (error) {
    console.error('❌ Error creating splash screen:', error);
  }
}

createSplash();
