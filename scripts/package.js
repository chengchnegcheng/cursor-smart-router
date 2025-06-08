const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

// 创建输出目录
const outputDir = path.join(__dirname, '../dist');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// 创建输出流
const output = fs.createWriteStream(path.join(outputDir, 'cursor-smart-router.vsix'));
const archive = archiver('zip', {
  zlib: { level: 9 }
});

output.on('close', () => {
  console.log(`📦 打包完成！大小: ${archive.pointer()} bytes`);
});

archive.on('error', (err) => {
  throw err;
});

// 将文件添加到压缩包
archive.pipe(output);

// 添加必要文件
archive.file('package.json', { name: 'package.json' });
archive.file('README.md', { name: 'README.md' });
archive.directory('dist/', 'dist');
archive.directory('config/', 'config');

// 完成打包
archive.finalize();