const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 8080;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
};

const server = http.createServer((req, res) => {
  try {
    // 解析URL
    const parsedUrl = url.parse(req.url);
    let filePath = parsedUrl.pathname;
    
    // 安全检查：防止目录遍历攻击
    if (filePath.includes('..')) {
      res.writeHead(403, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h1>403 Forbidden</h1><p>访问被拒绝</p>');
      return;
    }
    
    // 构建完整的文件路径
    filePath = path.join(__dirname, 'website-output', filePath);
    
    // 如果请求根路径或目录，返回index.html
    if (filePath.endsWith('/') || fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
    
    // 获取文件扩展名
    const extname = path.extname(filePath);
    
    // 设置Content-Type
    const contentType = MIME_TYPES[extname] || 'application/octet-stream';
    
    // 检查文件是否存在
    fs.access(filePath, fs.constants.F_OK, (err) => {
      if (err) {
        // 文件不存在
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
          <h1>404 Not Found</h1>
          <p>页面不存在: ${parsedUrl.pathname}</p>
          <p><a href="/">返回首页</a></p>
        `);
        return;
      }
      
      // 读取文件
      fs.readFile(filePath, (err, content) => {
        if (err) {
          // 服务器错误
          console.error('读取文件错误:', err);
          res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end('<h1>500 Internal Server Error</h1><p>服务器内部错误</p>');
          return;
        }
        
        // 成功响应
        res.writeHead(200, { 
          'Content-Type': contentType,
          'Content-Length': content.length
        });
        res.end(content);
      });
    });
    
  } catch (error) {
    console.error('服务器错误:', error);
    res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h1>500 Internal Server Error</h1><p>服务器内部错误</p>');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Node.js 服务器启动成功！`);
  console.log(`\n📱 访问地址：`);
  console.log(`   本地访问: http://localhost:${PORT}`);
  console.log(`   网络访问: http://127.0.0.1:${PORT}`);
  console.log(`\n📋 可用页面：`);
  console.log(`   - 首页: http://localhost:${PORT}/`);
  console.log(`   - 引言: http://localhost:${PORT}/introduction.html`);
  console.log(`   - 命令模式: http://localhost:${PORT}/command.html`);
  console.log(`   - 其他章节...`);
  console.log(`\n⏹️  按 Ctrl+C 停止服务器\n`);
});

// 处理服务器错误
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ 端口 ${PORT} 已被占用，请尝试其他端口`);
    process.exit(1);
  } else {
    console.error('❌ 服务器启动失败:', err);
    process.exit(1);
  }
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n🛑 正在关闭服务器...');
  server.close(() => {
    console.log('✅ 服务器已关闭');
    process.exit(0);
  });
});