const fs = require('fs');
const path = require('path');

const dirs = [
  'dist',
  'release',
  'python'
];

dirs.forEach(dir => {
  const dirPath = path.join(__dirname, '..', dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Created directory: ${dirPath}`);
  }
}); 