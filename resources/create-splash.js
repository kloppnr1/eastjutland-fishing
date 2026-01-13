import Jimp from 'jimp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function createSplash() {
  try {
    // Create a 2732x2732 splash screen with colored background
    const backgroundColor = 0xFFFFFFFF; // White - change to your color (0xRRGGBBAA format)
    const splash = new Jimp(2732, 2732, backgroundColor);
    
    // Load your icon
    const icon = await Jimp.read(join(__dirname, 'resources', 'icon.png'));
    
    // Resize icon to 40% of splash size (centered and prominent)
    const iconSize = Math.floor(2732 * 0.4);
    icon.resize(iconSize, iconSize);
    
    // Center the icon
    const x = Math.floor((2732 - iconSize) / 2);
    const y = Math.floor((2732 - iconSize) / 2);
    
    splash.composite(icon, x, y);
    
    // Save splash screen
    await splash.writeAsync(join(__dirname, 'resources', 'splash.png'));
    
    console.log('✅ Splash screen created at resources/splash.png');
    console.log('🎨 To change background color, edit backgroundColor in create-splash.js');
    console.log('   Format: 0xRRGGBBAA (e.g., 0x0066CCFF for blue)');
  } catch (error) {
    console.error('❌ Error creating splash screen:', error.message);
  }
}

createSplash();
