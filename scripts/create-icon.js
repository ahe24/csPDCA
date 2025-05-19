const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

// Create a 256x256 canvas
const size = 256;
const canvas = createCanvas(size, size);
const ctx = canvas.getContext('2d');

// Draw a blue background
ctx.fillStyle = '#3f51b5';
ctx.fillRect(0, 0, size, size);

// Add text in the center
ctx.fillStyle = '#ffffff';
ctx.font = 'bold 100px Arial';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText('PDCA', size/2, size/2);

// Save as PNG first
const pngPath = path.join(__dirname, '../build/icons/app-icon.png');
const out = fs.createWriteStream(pngPath);
const stream = canvas.createPNGStream();
stream.pipe(out);

console.log(`Created new icon at ${pngPath}`);
console.log('Note: This is a PNG file. For production, convert it to ICO format using an online converter or image editor.');
