const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

// This is a simplified ICO file structure
// For production, consider using a proper ICO encoder
async function convertToIco() {
  try {
    const pngPath = path.join(__dirname, '../build/icons/app-icon.png');
    const icoPath = path.join(__dirname, '../build/icons/app-icon.ico');
    
    // Load the PNG
    const image = await loadImage(pngPath);
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);
    
    // Get the PNG buffer
    const pngBuffer = canvas.toBuffer('image/png');
    
    // Create a simple ICO file (this is a minimal implementation)
    // ICO header (6 bytes)
    const header = Buffer.alloc(6);
    header.writeUInt16LE(0, 0); // Reserved (0)
    header.writeUInt16LE(1, 2); // Image type (1 = ICO)
    header.writeUInt16LE(1, 4); // Number of images (1)
    
    // Image entry (16 bytes)
    const entry = Buffer.alloc(16);
    entry.writeUInt8(image.width, 0);   // Width (0 = 256)
    entry.writeUInt8(image.height, 1);  // Height (0 = 256)
    entry.writeUInt8(0, 2);             // Color palette
    entry.writeUInt8(0, 3);             // Reserved (0)
    entry.writeUInt16LE(1, 4);          // Color planes
    entry.writeUInt16LE(32, 6);          // Bits per pixel
    entry.writeUInt32LE(pngBuffer.length, 8); // Size of image data
    entry.writeUInt32LE(22, 12);         // Offset to image data (6 + 16)
    
    // Combine everything
    const icoBuffer = Buffer.concat([header, entry, pngBuffer]);
    
    // Write the ICO file
    fs.writeFileSync(icoPath, icoBuffer);
    
    console.log(`Created ICO file at ${icoPath}`);
  } catch (error) {
    console.error('Error converting to ICO:', error);
    // Fallback: Just copy the PNG as is
    const pngPath = path.join(__dirname, '../build/icons/app-icon.png');
    const icoPath = path.join(__dirname, '../build/icons/app-icon.ico');
    fs.copyFileSync(pngPath, icoPath);
    console.log(`Copied PNG to ICO at ${icoPath} (fallback)`);
  }
}

convertToIco();
