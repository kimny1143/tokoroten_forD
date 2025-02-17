const fs = require('fs');
const path = require('path');

const sourceFile = path.join(__dirname, '..', 'python', 'dist', 'api');
const targetDir = path.join(__dirname, '..', 'python');

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const targetFile = path.join(targetDir, 'api');
fs.copyFileSync(sourceFile, targetFile);

// Set executable permissions (755)
fs.chmodSync(targetFile, '755');

console.log('Python executable copied successfully'); 