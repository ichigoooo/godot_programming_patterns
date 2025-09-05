const fs = require('fs');
const path = require('path');

// 读取Markdown文件
const markdownContent = fs.readFileSync('./docs/godot_game_programming_patterns_dual_lang.md', 'utf-8');

// 解析章节
function parseChapters(content) {
    const chapters = [];
    const lines = content.split('\n');
    let currentChapter = null;
    let currentContent = [];
    
    for (const line of lines) {
        // 检测章节标题 (### 第X章 - 标题)
        const match = line.match(/^### 第(\d+)章 - (.+)$/);
        if (match) {
            // 保存之前的章节
            if (currentChapter) {
                currentChapter.content = currentContent.join('\n');
                chapters.push(currentChapter);
            }
            // 开始新章节
            const titleOnly = match[2].replace(/\s*\([^)]*\)/g, ''); // 移除英文部分
            let slug;
            // 为每个章节创建特定的slug
            const slugMap = {
                '命令模式': 'command',
                '享元模式': 'flyweight', 
                '观察者模式': 'observer',
                '原型': 'prototype',
                '游戏循环': 'game-loop',
                '更新方法': 'update-method',
                '字节码': 'bytecode',
                '子类沙盒': 'subclass-sandbox',
                '类型对象': 'type-object',
                '组件': 'component',
                '事件队列': 'event-queue',
                '服务定位器': 'service-locator',
                '数据局部性': 'data-locality',
                '脏标记': 'dirty-flag',
                '对象池': 'object-pool',
                '空间分区': 'spatial-partition'
            };
            slug = slugMap[titleOnly] || `chapter-${match[1]}`;
            
            currentChapter = {
                number: match[1],
                title: match[2],
                slug: slug
            };
            currentContent = [line];
        } else if (currentChapter) {
            currentContent.push(line);
        }
    }
    
    // 保存最后一个章节
    if (currentChapter) {
        currentChapter.content = currentContent.join('\n');
        chapters.push(currentChapter);
    }
    
    return chapters;
}

// 生成HTML模板
function generateHTMLTemplate(title, content, chapters, currentSlug) {
    // 生成导航HTML，包含"返回首页"和引言
    let navigationHTML = `<li class="home-link">
                    <a href="index.html">🏠 返回首页</a>
                </li>
                <li class="divider"></li>`;
    
    navigationHTML += chapters.map(chapter => {
        const isActive = chapter.slug === currentSlug;
        const displayTitle = chapter.number === '0' ? 
            `📖 ${chapter.title}` : 
            `${chapter.number}. ${chapter.title}`;
        return `<li class="${isActive ? 'active' : ''}">
                    <a href="${chapter.slug}.html">${displayTitle}</a>
                </li>`;
    }).join('\n                ');
    
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - Godot游戏编程模式</title>
    <!-- Prism.js CSS for syntax highlighting -->
    <link href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css" rel="stylesheet" />
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
            background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%);
            color: #e0e0e0;
            line-height: 1.6;
            min-height: 100vh;
        }
        
        .hero-header {
            background: linear-gradient(135deg, #0a0a0a 0%, #1a0a2e 50%, #0f1419 100%);
            border-bottom: 3px solid #00ffcc;
            padding: 35px 0;
            position: relative;
            overflow: hidden;
            box-shadow: 0 8px 32px rgba(0, 255, 204, 0.3), inset 0 1px 0 rgba(0, 255, 204, 0.2);
            border-top: 1px solid #00ffcc;
            z-index: 998; /* 降低z-index，确保sidebar在更高层 */
            min-height: 180px;
        }
        
        /* 扫描线效果 */
        .hero-header::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 2px;
            background: linear-gradient(90deg, transparent, #00ffcc, #ff00ff, #00ffcc, transparent);
            animation: scanline 4s infinite;
            z-index: 3;
        }
        
        /* 数据流背景 */
        .hero-header::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: 
                linear-gradient(90deg, transparent 98%, rgba(0, 255, 204, 0.03) 100%),
                linear-gradient(180deg, transparent 98%, rgba(255, 0, 255, 0.03) 100%);
            background-size: 20px 20px;
            animation: dataflow 20s linear infinite;
            z-index: 1;
        }
        
        /* 额外的装饰层 */
        .hero-header .decorative-grid {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-image: 
                linear-gradient(rgba(0, 255, 204, 0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0, 255, 204, 0.1) 1px, transparent 1px);
            background-size: 50px 50px;
            animation: gridMove 10s linear infinite;
            z-index: 1;
        }
        
        .hero-header .glitch-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(45deg, 
                transparent 30%, 
                rgba(255, 0, 255, 0.1) 50%, 
                transparent 70%);
            animation: glitchScan 3s ease-in-out infinite;
            z-index: 2;
        }
        
        @keyframes scanline {
            0% { left: -100%; opacity: 0; }
            50% { opacity: 1; }
            100% { left: 100%; opacity: 0; }
        }
        
        @keyframes dataflow {
            0% { transform: translate(0, 0); }
            100% { transform: translate(20px, 20px); }
        }
        
        @keyframes subtitleFlicker {
            0%, 100% { opacity: 1; }
            90% { opacity: 1; }
            95% { opacity: 0.7; }
            97% { opacity: 1; }
        }
        
        @keyframes diamondSpin {
            0% { transform: translateY(-50%) rotate(0deg); }
            100% { transform: translateY(-50%) rotate(360deg); }
        }
        
        @keyframes descriptionGlow {
            0% { box-shadow: 0 0 10px rgba(0, 255, 204, 0.2); }
            100% { box-shadow: 0 0 20px rgba(0, 255, 204, 0.4); }
        }
        
        @keyframes cursorBlink {
            0%, 50% { opacity: 1; }
            51%, 100% { opacity: 0; }
        }
        
        @keyframes gridMove {
            0% { transform: translate(0, 0); }
            100% { transform: translate(50px, 50px); }
        }
        
        @keyframes glitchScan {
            0%, 100% { transform: translateX(-100%); }
            50% { transform: translateX(100%); }
        }
        
        @keyframes hudLineGlow {
            0%, 100% { opacity: 0.3; box-shadow: 0 0 5px rgba(0, 255, 204, 0.5); }
            50% { opacity: 1; box-shadow: 0 0 15px rgba(0, 255, 204, 0.8); }
        }
        
        .cyberpunk-container {
            position: relative;
            z-index: 2;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-direction: column;
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 20px;
        }
        
        .hero-title {
            font-size: 3.5em;
            color: #00ffcc;
            text-shadow: 
                0 0 10px #00ffcc,
                0 0 20px #00ffcc,
                0 0 40px #00ffcc,
                0 0 60px #00ffcc,
                0 0 80px rgba(0, 255, 204, 0.8);
            margin-bottom: 12px;
            font-weight: bold;
            letter-spacing: 4px;
            font-family: 'Courier New', monospace;
            text-transform: uppercase;
            animation: titleGlow 3s ease-in-out infinite alternate, titlePulse 2s ease-in-out infinite;
            position: relative;
        }
        
        .hero-title::before {
            content: '🎮';
            position: absolute;
            left: -60px;
            top: 50%;
            transform: translateY(-50%);
            font-size: 0.8em;
            animation: iconFloat 3s ease-in-out infinite;
        }
        
        .hero-title::after {
            content: '⚡';
            position: absolute;
            right: -60px;
            top: 50%;
            transform: translateY(-50%);
            font-size: 0.8em;
            animation: iconFloat 3s ease-in-out infinite reverse;
        }
        
        @keyframes titleGlow {
            0% { text-shadow: 0 0 10px #00ffcc, 0 0 20px #00ffcc, 0 0 40px #00ffcc; }
            100% { text-shadow: 0 0 20px #00ffcc, 0 0 40px #00ffcc, 0 0 60px #00ffcc, 0 0 80px rgba(0, 255, 204, 0.8); }
        }
        
        @keyframes titlePulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.02); }
            100% { transform: scale(1); }
        }
        
        @keyframes iconFloat {
            0%, 100% { transform: translateY(-50%) rotate(0deg); }
            50% { transform: translateY(-60%) rotate(10deg); }
        }
        
        .hero-subtitle {
            font-size: 1.3em;
            color: #ff00ff;
            text-shadow: 0 0 15px rgba(255, 0, 255, 0.8), 0 0 25px rgba(255, 0, 255, 0.6);
            margin-bottom: 25px;
            font-family: 'Courier New', monospace;
            letter-spacing: 2px;
            text-transform: uppercase;
            animation: subtitleFlicker 4s ease-in-out infinite;
            position: relative;
        }
        
        .hero-subtitle::before,
        .hero-subtitle::after {
            content: '◆';
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            color: #00ffcc;
            font-size: 0.7em;
            animation: diamondSpin 6s linear infinite;
        }
        
        .hero-subtitle::before {
            left: -30px;
        }
        
        .hero-subtitle::after {
            right: -30px;
            animation-direction: reverse;
        }
        
        .hero-description {
            font-size: 1.0em;
            color: #a0a0a0;
            max-width: 800px;
            margin: 0 auto 25px;
            line-height: 1.6;
            font-family: 'Courier New', monospace;
            text-shadow: 0 0 5px rgba(0, 255, 204, 0.3);
            position: relative;
            padding: 15px;
            border: 1px solid rgba(0, 255, 204, 0.2);
            border-radius: 8px;
            background: rgba(0, 255, 204, 0.05);
            animation: descriptionGlow 5s ease-in-out infinite alternate;
        }
        
        .hero-description::before {
            content: '> ';
            color: #00ffcc;
            font-weight: bold;
            animation: cursorBlink 1s infinite;
        }
        
        .hero-description br::after {
            content: '> ';
            color: #00ffcc;
            font-weight: bold;
            animation: cursorBlink 1s infinite;
        }
        
        /* HUD 装饰元素 */
        .hud-elements {
            display: flex;
            justify-content: space-between;
            align-items: center;
            width: 100%;
            max-width: 1000px;
            margin: 20px auto;
            font-family: 'Courier New', monospace;
            font-size: 0.8em;
            position: relative;
            z-index: 10;
        }
        
        /* HUD边框装饰 */
        .hud-elements::before,
        .hud-elements::after {
            content: '';
            position: absolute;
            height: 1px;
            background: linear-gradient(90deg, transparent, #00ffcc, transparent);
            width: 100%;
            left: 0;
        }
        
        .hud-elements::before {
            top: -10px;
            animation: hudLineGlow 3s ease-in-out infinite;
        }
        
        .hud-elements::after {
            bottom: -10px;
            animation: hudLineGlow 3s ease-in-out infinite reverse;
        }
        
        .hud-left, .hud-right {
            display: flex;
            align-items: center;
            gap: 20px;
        }
        
        /* 电量指示器 */
        .battery-indicator {
            display: flex;
            align-items: center;
            gap: 8px;
            color: #00ffcc;
        }
        
        .battery {
            width: 30px;
            height: 12px;
            border: 1px solid #00ffcc;
            border-radius: 2px;
            position: relative;
            box-shadow: 0 0 8px rgba(0, 255, 204, 0.4);
        }
        
        .battery::after {
            content: '';
            position: absolute;
            right: -3px;
            top: 3px;
            width: 2px;
            height: 6px;
            background: #00ffcc;
            border-radius: 0 1px 1px 0;
        }
        
        .battery-fill {
            height: 100%;
            background: linear-gradient(90deg, #ff00ff, #00ffcc);
            border-radius: 1px;
            animation: batteryCharge 2s ease-in-out infinite;
            box-shadow: 0 0 8px rgba(0, 255, 204, 0.6);
        }
        
        @keyframes batteryCharge {
            0% { width: 70%; }
            50% { width: 100%; }
            100% { width: 70%; }
        }
        
        /* 像素风进度条 */
        .progress-bar {
            display: flex;
            align-items: center;
            gap: 8px;
            color: #ff00ff;
        }
        
        .progress-container {
            width: 80px;
            height: 8px;
            background: rgba(0, 0, 0, 0.5);
            border: 1px solid #ff00ff;
            position: relative;
            overflow: hidden;
        }
        
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #ff00ff, #00ffcc, #ff00ff);
            background-size: 200% 100%;
            animation: progressFlow 3s linear infinite;
            width: 65%;
            box-shadow: 0 0 8px rgba(255, 0, 255, 0.6);
        }
        
        @keyframes progressFlow {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
        }
        
        /* 系统状态指示 */
        .system-status {
            color: #00ffcc;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        
        .status-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: #00ffcc;
            animation: statusBlink 2s ease-in-out infinite;
            box-shadow: 0 0 8px rgba(0, 255, 204, 0.8);
        }
        
        @keyframes statusBlink {
            0%, 50% { opacity: 1; }
            51%, 100% { opacity: 0.3; }
        }
        
        /* 数据传输指示 */
        .data-transfer {
            color: #ff00ff;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        
        .transfer-icon {
            font-size: 10px;
            animation: dataTransfer 1s linear infinite;
        }
        
        @keyframes dataTransfer {
            0% { transform: translateX(-3px); opacity: 0.3; }
            50% { opacity: 1; }
            100% { transform: translateX(3px); opacity: 0.3; }
        }
        
        .geometric-line {
            height: 1px;
            background: linear-gradient(90deg, transparent, #00ffcc, #ff00ff, #00ffcc, transparent);
            margin: 8px auto;
            width: 400px;
            box-shadow: 0 0 8px rgba(0, 255, 204, 0.5);
            animation: geometricPulse 4s ease-in-out infinite;
        }
        
        @keyframes geometricPulse {
            0%, 100% { opacity: 0.6; width: 400px; }
            50% { opacity: 1; width: 500px; }
        }
        
        /* 角落装饰 */
        .corner-decoration {
            position: absolute;
            width: 40px;
            height: 40px;
            border: 2px solid #00ffcc;
            z-index: 2;
        }
        
        .corner-tl {
            top: 10px;
            left: 10px;
            border-right: none;
            border-bottom: none;
        }
        
        .corner-tr {
            top: 10px;
            right: 10px;
            border-left: none;
            border-bottom: none;
        }
        
        .corner-bl {
            bottom: 10px;
            left: 10px;
            border-right: none;
            border-top: none;
        }
        
        .corner-br {
            bottom: 10px;
            right: 10px;
            border-left: none;
            border-top: none;
        }
        
        /* 额外的装饰元素 - 内层 */
        .corner-tl2 {
            top: 25px;
            left: 25px;
            width: 20px;
            height: 20px;
            border: 1px solid #ff00ff;
            z-index: 3;
        }
        
        .corner-tr2 {
            top: 25px;
            right: 25px;
            width: 20px;
            height: 20px;
            border: 1px solid #ff00ff;
            z-index: 3;
            border-right: none;
            border-top: none;
        }
        
        .corner-bl2 {
            bottom: 25px;
            left: 25px;
            width: 20px;
            height: 20px;
            border: 1px solid #ff00ff;
            z-index: 3;
            border-left: none;
            border-bottom: none;
        }
        
        .corner-br2 {
            bottom: 25px;
            right: 25px;
            width: 20px;
            height: 20px;
            border: 1px solid #ff00ff;
            z-index: 3;
            border-right: none;
            border-bottom: none;
        }
        
        /* 电路板线条效果 */
        .circuit-lines {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            pointer-events: none;
            z-index: 1;
        }
        
        .circuit-lines::before {
            content: '';
            position: absolute;
            top: 50%;
            left: 0;
            right: 0;
            height: 1px;
            background: linear-gradient(90deg, 
                transparent 0%, 
                rgba(0, 255, 204, 0.2) 20%, 
                rgba(255, 0, 255, 0.2) 50%, 
                rgba(0, 255, 204, 0.2) 80%, 
                transparent 100%);
            animation: circuitFlow 8s linear infinite;
        }
        
        .circuit-lines::after {
            content: '';
            position: absolute;
            top: 0;
            bottom: 0;
            left: 50%;
            width: 1px;
            background: linear-gradient(180deg, 
                transparent 0%, 
                rgba(255, 0, 255, 0.1) 30%, 
                rgba(0, 255, 204, 0.1) 70%, 
                transparent 100%);
            animation: circuitFlow 6s linear infinite reverse;
        }
        
        @keyframes circuitFlow {
            0% { opacity: 0.2; }
            50% { opacity: 0.8; }
            100% { opacity: 0.2; }
        }
        
        /* 加强响应式设计 */
        @media (max-width: 768px) {
            .hud-elements {
                flex-direction: column;
                gap: 10px;
                font-size: 0.7em;
            }
            
            .hud-left, .hud-right {
                gap: 15px;
            }
            
            .hero-title {
                font-size: 2.2em;
                letter-spacing: 2px;
            }
            
            .corner-decoration {
                width: 25px;
                height: 25px;
            }
            
            .sidebar {
                width: 100%;
                height: auto;
                position: relative;
                top: 0;
                border-right: none;
                border-bottom: 2px solid #00ffcc;
                margin-bottom: 20px;
                padding: 15px;
                z-index: 9999; /* 确保移动端sidebar也在最高层 */
            }
            
            .main-content {
                margin-left: 0;
                max-width: 100%;
                padding: 15px;
                margin-top: 0;
            }
            
            .container {
                display: block;
                min-height: calc(100vh - 150px);
            }
            
            /* 移动端目录切换按钮 */
            .sidebar-toggle {
                display: block;
                background: linear-gradient(90deg, #00ffcc 0%, #00cc99 100%);
                color: #0a0a0a;
                border: none;
                padding: 10px 15px;
                font-family: 'Courier New', monospace;
                font-weight: bold;
                cursor: pointer;
                margin-bottom: 15px;
                border-radius: 6px;
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
                text-align: center;
            }
            
            .sidebar-toggle:hover {
                background: linear-gradient(90deg, #00cc99 0%, #00ffcc 100%);
            }
            
            .sidebar.collapsed {
                display: none;
            }
        }
        
        @media (min-width: 769px) {
            .sidebar-toggle {
                display: none;
            }
        }
        
        .container {
            display: flex;
            min-height: calc(100vh - 150px);
        }
        
        .sidebar {
            width: 300px;
            background: linear-gradient(180deg, #16213e 0%, #0f1419 100%);
            border-right: 2px solid #00ffcc;
            padding: 20px;
            box-shadow: 5px 0 15px rgba(0, 255, 204, 0.1);
            position: fixed;
            height: calc(100vh - 200px);
            overflow-y: auto;
            top: 200px;
            z-index: 9999; /* 确保sidebar在最高层 */
            border-top: 2px solid #00ffcc;
        }
        
        .sidebar h2 {
            color: #00ffcc;
            text-align: center;
            margin-bottom: 25px;
            font-size: 1.1em;
            text-shadow: 0 0 10px rgba(0, 255, 204, 0.5);
            border-bottom: 1px solid #00ffcc;
            padding-bottom: 10px;
        }
        
        .sidebar ul {
            list-style: none;
        }
        
        .sidebar li {
            margin-bottom: 6px;
        }
        
        .sidebar .divider {
            height: 1px;
            background: linear-gradient(90deg, transparent, #00ffcc, transparent);
            margin: 15px 0;
        }
        
        .sidebar .home-link a {
            color: #ffaa00;
            background: rgba(255, 170, 0, 0.1);
            border-left: 3px solid #ffaa00;
            font-weight: bold;
        }
        
        .sidebar .home-link a:hover {
            background: rgba(255, 170, 0, 0.2);
            color: #ffcc44;
            text-shadow: 0 0 8px rgba(255, 170, 0, 0.6);
        }
        
        .sidebar a {
            color: #a0a0a0;
            text-decoration: none;
            padding: 8px 12px;
            display: block;
            border-radius: 6px;
            transition: all 0.3s ease;
            border-left: 3px solid transparent;
            font-size: 0.9em;
        }
        
        .sidebar a:hover {
            background: rgba(0, 255, 204, 0.1);
            color: #00ffcc;
            border-left-color: #00ffcc;
            text-shadow: 0 0 5px rgba(0, 255, 204, 0.3);
        }
        
        .sidebar .active a {
            background: rgba(0, 255, 204, 0.2);
            color: #00ffcc;
            border-left-color: #00ffcc;
            text-shadow: 0 0 8px rgba(0, 255, 204, 0.6);
        }
        
        .main-content {
            flex: 1;
            margin-left: 300px;
            padding: 40px;
            max-width: calc(100% - 300px);
            margin-top: 20px;
            position: relative;
            z-index: 1; /* 确保主内容在sidebar下方 */
        }
        
        .page-header {
            background: linear-gradient(90deg, #16213e 0%, #0f1419 100%);
            border: 1px solid #00ffcc;
            border-radius: 12px;
            padding: 25px;
            margin-bottom: 25px;
            box-shadow: 0 8px 32px rgba(0, 255, 204, 0.1);
        }
        
        .page-header h1 {
            color: #00ffcc;
            font-size: 2.2em;
            margin-bottom: 8px;
            text-shadow: 0 0 15px rgba(0, 255, 204, 0.4);
        }
        
        .content {
            background: rgba(22, 33, 62, 0.3);
            border: 1px solid rgba(0, 255, 204, 0.2);
            border-radius: 12px;
            padding: 30px;
            margin-bottom: 30px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            word-wrap: break-word;
            overflow-wrap: break-word;
        }
        
        .content h1, .content h2, .content h3, .content h4, .content h5, .content h6 {
            color: #00ffcc;
            margin: 30px 0 15px 0;
            text-shadow: 0 0 5px rgba(0, 255, 204, 0.3);
        }
        
        .content h1 { font-size: 2em; }
        .content h2 { font-size: 1.7em; }
        .content h3 { font-size: 1.4em; }
        .content h4 { font-size: 1.2em; color: #88ffaa; }
        .content h5 { font-size: 1.1em; color: #88ffaa; }
        .content h6 { font-size: 1em; color: #88ffaa; }
        
        .content-paragraph {
            margin-bottom: 15px;
            color: #e0e0e0;
            line-height: 1.8;
        }
        
        .content-list {
            margin: 15px 0;
            padding-left: 25px;
            color: #d0d0d0;
        }
        
        .content-list li {
            margin-bottom: 8px;
            line-height: 1.6;
        }
        
        .content-list.numbered {
            list-style-type: decimal;
        }
        
        .inline-code {
            background: rgba(0, 255, 204, 0.15);
            color: #00ff88;
            padding: 3px 6px;
            border-radius: 4px;
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 0.9em;
            border: 1px solid rgba(0, 255, 204, 0.3);
        }
        
        .code-block-wrapper {
            margin: 20px 0;
            border-radius: 8px;
            overflow: hidden;
            border: 1px solid #00ffcc;
            box-shadow: 0 4px 15px rgba(0, 255, 204, 0.1);
        }
        
        .code-block-header {
            background: linear-gradient(90deg, #00ffcc 0%, #00cc99 100%);
            color: #0a0a0a;
            padding: 8px 15px;
            font-size: 0.85em;
            font-weight: bold;
            text-align: left;
        }
        
        .code-language {
            font-family: 'Consolas', 'Monaco', monospace;
            letter-spacing: 1px;
        }
        
        .code-block {
            background: #0d1421;
            margin: 0;
            padding: 20px;
            overflow-x: auto;
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 0.9em;
            line-height: 1.4;
            color: #e0e0e0;
        }
        
        .code-block code {
            background: none;
            padding: 0;
            color: inherit;
            border: none;
        }
        
        .collapsible-section {
            margin: 20px 0;
            border: 1px solid rgba(0, 255, 204, 0.3);
            border-radius: 8px;
            background: rgba(22, 33, 62, 0.2);
        }
        
        .collapsible-header {
            background: rgba(0, 255, 204, 0.1);
            color: #00ffcc;
            padding: 12px 20px;
            cursor: pointer;
            font-weight: bold;
            border-bottom: 1px solid rgba(0, 255, 204, 0.2);
            transition: background 0.3s ease;
        }
        
        .collapsible-header:hover {
            background: rgba(0, 255, 204, 0.2);
        }
        
        .collapsible-content {
            padding: 15px 20px;
        }
        
        .quote-block {
            border-left: 4px solid #00ffcc;
            background: rgba(0, 255, 204, 0.05);
            padding: 15px 20px;
            margin: 20px 0;
            border-radius: 0 8px 8px 0;
            color: #d0d0d0;
            font-style: italic;
        }
        
        .content-link {
            color: #00ffcc;
            text-decoration: none;
            border-bottom: 1px dotted #00ffcc;
            transition: all 0.3s ease;
        }
        
        .content-link:hover {
            color: #ffffff;
            border-bottom-style: solid;
            text-shadow: 0 0 5px rgba(0, 255, 204, 0.5);
        }

        
        .qr-section {
            background: linear-gradient(90deg, #16213e 0%, #0f1419 100%);
            border: 1px solid #00ffcc;
            border-radius: 12px;
            padding: 30px;
            text-align: center;
            margin-top: 40px;
            box-shadow: 0 8px 32px rgba(0, 255, 204, 0.1);
        }
        
        .qr-section img {
            max-width: 200px;
            border-radius: 8px;
            margin-bottom: 15px;
            border: 2px solid #00ffcc;
            box-shadow: 0 0 20px rgba(0, 255, 204, 0.3);
        }
        
        .qr-section p {
            color: #00ffcc;
            font-size: 1.1em;
            text-shadow: 0 0 5px rgba(0, 255, 204, 0.3);
        }
        
        @media (max-width: 768px) {
            .hero-title {
                font-size: 2.2em;
            }
            .sidebar {
                width: 250px;
            }
            .main-content {
                margin-left: 250px;
                max-width: calc(100% - 250px);
                padding: 20px;
            }
        }
    </style>
</head>
<body>
    <header class="hero-header">
        <!-- 电路板线条背景 -->
        <div class="circuit-lines"></div>
        
        <!-- 装饰网格层 -->
        <div class="decorative-grid"></div>
        
        <!-- 故障艺术扫描层 -->
        <div class="glitch-overlay"></div>
        
        <!-- 角落装饰 -->
        <div class="corner-decoration corner-tl"></div>
        <div class="corner-decoration corner-tr"></div>
        <div class="corner-decoration corner-bl"></div>
        <div class="corner-decoration corner-br"></div>
        
        <!-- 额外的装饰元素 -->
        <div class="corner-decoration corner-tl2"></div>
        <div class="corner-decoration corner-tr2"></div>
        <div class="corner-decoration corner-bl2"></div>
        <div class="corner-decoration corner-br2"></div>
        
        <div class="cyberpunk-container">
            <!-- HUD 上部状态栏 -->
            <div class="hud-elements">
                <div class="hud-left">
                    <div class="system-status">
                        <div class="status-dot"></div>
                        <span>SYSTEM: ONLINE</span>
                    </div>
                    <div class="battery-indicator">
                        <span>PWR:</span>
                        <div class="battery">
                            <div class="battery-fill"></div>
                        </div>
                        <span>87%</span>
                    </div>
                </div>
                <div class="hud-right">
                    <div class="progress-bar">
                        <span>DATA:</span>
                        <div class="progress-container">
                            <div class="progress-fill"></div>
                        </div>
                    </div>
                    <div class="data-transfer">
                        <span class="transfer-icon">▲▼</span>
                        <span>SYNC</span>
                    </div>
                </div>
            </div>
            
            <!-- 主标题区域 -->
            <h1 class="hero-title">🎮 Godot游戏编程模式</h1>
            <div class="geometric-line"></div>
            <p class="hero-subtitle">[ NEURAL LINK ESTABLISHED ]</p>
            <p class="hero-description">
                > ACCESSING DESIGN PATTERNS DATABASE...<br>
                > CYBERPUNK PROGRAMMING PROTOCOLS LOADED<br>
                > STATUS: READY FOR NEURAL DOWNLOAD
            </p>
        </div>
    </header>
    
    <div class="container">
        <nav class="sidebar" id="sidebar">
            <button class="sidebar-toggle" id="sidebarToggle">📚 教程目录</button>
            <h2>📚 教程目录</h2>
            <ul>
                ${navigationHTML}
            </ul>
        </nav>
        
        <main class="main-content">
            <header class="page-header">
                <h1>${title}</h1>
            </header>
            
            <div class="content">
                ${convertMarkdownToHTML(content)}
            </div>
            
            <div class="qr-section">
                <img src="qr_code.png" alt="Buy Me A Coffee QR Code" />
                <p>如果对你有帮助，Buy Me A Coffee～</p>
            </div>
        </main>
    </div>
    
    <script>
        // 移动端目录切换功能
        document.addEventListener('DOMContentLoaded', function() {
            const sidebar = document.getElementById('sidebar');
            const sidebarToggle = document.getElementById('sidebarToggle');
            
            if (sidebarToggle) {
                sidebarToggle.addEventListener('click', function() {
                    sidebar.classList.toggle('collapsed');
                });
            }
        });
    </script>
    
    <!-- Prism.js for syntax highlighting -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-csharp.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-gdscript.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-javascript.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-typescript.min.js"></script>
</body>
</html>`;
}

// 改进的Markdown到HTML转换器
function convertMarkdownToHTML(markdown) {
    let html = markdown;
    
    // 首先处理代码块，并使用占位符保护
    const codeBlocks = [];
    
    // 处理带语言标识的代码块
    html = html.replace(/```(\w+)\n([\s\S]*?)```/g, function(match, lang, code) {
        const index = codeBlocks.length;
        const language = lang || 'text';
        // 转义HTML特殊字符
        const escapedCode = code.trim()
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
        codeBlocks.push(`<div class="code-block-wrapper">
            <div class="code-block-header">
                <span class="code-language">${language.toUpperCase()}</span>
            </div>
            <pre class="code-block"><code class="language-${language}">${escapedCode}</code></pre>
        </div>`);
        return `__CODEBLOCK_${index}__`;
    });
    
    // 处理不带语言标识的代码块
    html = html.replace(/```\n([\s\S]*?)```/g, function(match, code) {
        const index = codeBlocks.length;
        // 转义HTML特殊字符
        const escapedCode = code.trim()
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
        codeBlocks.push(`<div class="code-block-wrapper">
            <div class="code-block-header">
                <span class="code-language">CODE</span>
            </div>
            <pre class="code-block"><code>${escapedCode}</code></pre>
        </div>`);
        return `__CODEBLOCK_${index}__`;
    });
    
    // 保护内联代码
    const inlineCodes = [];
    html = html.replace(/`([^`]+)`/g, function(match, code) {
        const index = inlineCodes.length;
        // 转义HTML特殊字符
        const escapedCode = code
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
        inlineCodes.push(`<code class="inline-code">${escapedCode}</code>`);
        return `__INLINECODE_${index}__`;
    });
    
    // 处理折叠内容（details/summary）
    html = html.replace(/<details>\s*<summary>(.+?)<\/summary>([\s\S]*?)<\/details>/g, function(match, summary, content) {
        return `<details class="collapsible-section" open>
            <summary class="collapsible-header">${summary}</summary>
            <div class="collapsible-content">
                ${content.trim()}
            </div>
        </details>`;
    });
    
    // 处理所有级别的标题（从六级到一级，避免冲突）
    html = html.replace(/^###### (.+)$/gm, '<h6>$1</h6>');
    html = html.replace(/^##### (.+)$/gm, '<h5>$1</h5>');
    html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    
    // 处理粗体和斜体
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, '<em>$1</em>');
    
    // 处理引用
    html = html.replace(/^> (.+)$/gm, '<blockquote class="quote-block">$1</blockquote>');
    
    // 处理链接
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="content-link">$1</a>');
    
    // 处理无序列表
    html = html.replace(/^\s*[-*+] (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>[\s\S]*?<\/li>)/g, function(match) {
        if (!match.includes('<ul') && !match.includes('<ol')) {
            return `<ul class="content-list">${match}</ul>`;
        }
        return match;
    });
    
    // 处理有序列表
    html = html.replace(/^\s*\d+\. (.+)$/gm, '<li class="numbered-item">$1</li>');
    html = html.replace(/(<li class="numbered-item">[\s\S]*?<\/li>)/g, function(match) {
        return `<ol class="content-list numbered">${match.replace(/class="numbered-item"/g, '')}</ol>`;
    });
    
    // 改进段落处理
    const sections = html.split(/\n\s*\n/);
    html = sections.map(section => {
        section = section.trim();
        if (!section) return '';
        
        // 跳过已经是HTML标签、代码块或内联代码占位符的内容
        if (section.match(/^<(h[1-6]|div|details|pre|blockquote|ul|ol|li)/) || section.includes('__CODEBLOCK_') || section.includes('__INLINECODE_')) {
            return section;
        }
        
        // 处理普通段落
        if (section.length > 0) {
            return `<p class="content-paragraph">${section.replace(/\n/g, '<br>')}</p>`;
        }
        return '';
    }).filter(s => s).join('\n\n');
    
    // 最后恢复代码块和内联代码
    codeBlocks.forEach((codeBlock, index) => {
        html = html.replace(`__CODEBLOCK_${index}__`, codeBlock);
    });
    
    inlineCodes.forEach((inlineCode, index) => {
        html = html.replace(`__INLINECODE_${index}__`, inlineCode);
    });
    
    return html;
}

// 生成首页HTML
function generateIndexHTML(chapters) {
    const chaptersHTML = chapters.map(chapter => {
        // 为引言创建特殊的卡片样式
        if (chapter.number === '0') {
            return `<div class="chapter-card introduction-card">
                <h3><a href="${chapter.slug}.html">📖 ${chapter.title}</a></h3>
                <p class="chapter-intro-desc">学习设计模式的最佳指南和入门教程</p>
            </div>`;
        } else {
            return `<div class="chapter-card">
                <h3><a href="${chapter.slug}.html">${chapter.number}. ${chapter.title}</a></h3>
            </div>`;
        }
    }).join('\n        ');
    
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Godot游戏编程模式 - 首页</title>
    <!-- Prism.js CSS for syntax highlighting -->
    <link href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css" rel="stylesheet" />
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
            background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%);
            color: #e0e0e0;
            line-height: 1.6;
            min-height: 100vh;
            padding: 40px 20px;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        
        .header {
            text-align: center;
            margin-bottom: 50px;
            background: linear-gradient(90deg, #16213e 0%, #0f1419 100%);
            border: 2px solid #00ffcc;
            border-radius: 20px;
            padding: 60px 50px;
            box-shadow: 0 15px 50px rgba(0, 255, 204, 0.2);
            position: relative;
            overflow: hidden;
        }
        
        /* 首页装饰元素 */
        .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-image: 
                linear-gradient(rgba(0, 255, 204, 0.05) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0, 255, 204, 0.05) 1px, transparent 1px);
            background-size: 30px 30px;
            animation: gridMove 15s linear infinite;
        }
        
        .header::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(45deg, 
                transparent 30%, 
                rgba(255, 0, 255, 0.05) 50%, 
                transparent 70%);
            animation: glitchScan 4s ease-in-out infinite;
        }
        
        .header h1 {
            color: #00ffcc;
            font-size: 3.5em;
            margin-bottom: 20px;
            text-shadow: 0 0 30px rgba(0, 255, 204, 0.6);
            position: relative;
            z-index: 5;
            animation: titleGlow 3s ease-in-out infinite alternate;
        }
        
        .header h1::before {
            content: '🎮';
            position: absolute;
            left: -50px;
            top: 50%;
            transform: translateY(-50%);
            font-size: 0.8em;
            animation: iconFloat 3s ease-in-out infinite;
        }
        
        .header h1::after {
            content: '⚡';
            position: absolute;
            right: -50px;
            top: 50%;
            transform: translateY(-50%);
            font-size: 0.8em;
            animation: iconFloat 3s ease-in-out infinite reverse;
        }
        
        .header p {
            font-size: 1.2em;
            color: #a0a0a0;
        }
        
        .chapters-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 25px;
            margin-bottom: 50px;
        }
        
        .chapter-card {
            background: linear-gradient(145deg, #16213e 0%, #0f1419 100%);
            border: 1px solid rgba(0, 255, 204, 0.3);
            border-radius: 15px;
            padding: 25px;
            transition: all 0.3s ease;
            box-shadow: 0 5px 20px rgba(0, 0, 0, 0.3);
        }
        
        .chapter-card:hover {
            border-color: #00ffcc;
            box-shadow: 0 10px 40px rgba(0, 255, 204, 0.2);
            transform: translateY(-5px);
        }
        
        .chapter-card h3 {
            margin-bottom: 15px;
        }
        
        .chapter-card a {
            color: #00ffcc;
            text-decoration: none;
            font-size: 1.1em;
            transition: all 0.3s ease;
        }
        
        .chapter-card:hover a {
            text-shadow: 0 0 10px rgba(0, 255, 204, 0.8);
        }
        
        /* 引言卡片特殊样式 */
        .introduction-card {
            background: linear-gradient(145deg, #1a2e4a 0%, #16213e 100%);
            border: 2px solid rgba(255, 170, 0, 0.5);
            box-shadow: 0 8px 25px rgba(255, 170, 0, 0.15);
            position: relative;
            overflow: hidden;
        }
        
        .introduction-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 170, 0, 0.1), transparent);
            animation: introductionShine 3s ease-in-out infinite;
        }
        
        .introduction-card h3 a {
            color: #ffaa00;
            font-size: 1.2em;
        }
        
        .introduction-card:hover h3 a {
            color: #ffcc44;
            text-shadow: 0 0 15px rgba(255, 170, 0, 0.8);
        }
        
        .chapter-intro-desc {
            color: #ffcc88;
            font-size: 0.9em;
            margin-top: 8px;
            font-style: italic;
            opacity: 0.8;
        }
        
        @keyframes introductionShine {
            0% { left: -100%; }
            50% { left: 100%; }
            100% { left: 100%; }
        }
        
        .qr-section {
            background: linear-gradient(90deg, #16213e 0%, #0f1419 100%);
            border: 2px solid #00ffcc;
            border-radius: 20px;
            padding: 40px;
            text-align: center;
            box-shadow: 0 15px 50px rgba(0, 255, 204, 0.2);
        }
        
        .qr-section img {
            max-width: 200px;
            border-radius: 10px;
            margin-bottom: 20px;
            border: 2px solid #00ffcc;
            box-shadow: 0 0 20px rgba(0, 255, 204, 0.3);
        }
        
        .qr-section p {
            color: #00ffcc;
            font-size: 1.2em;
            text-shadow: 0 0 10px rgba(0, 255, 204, 0.4);
        }
        
        /* 首页动画 */
        @keyframes gridMove {
            0% { transform: translate(0, 0); }
            100% { transform: translate(30px, 30px); }
        }
        
        @keyframes glitchScan {
            0%, 100% { transform: translateX(-100%); }
            50% { transform: translateX(100%); }
        }
        
        @keyframes titleGlow {
            0% { text-shadow: 0 0 20px #00ffcc, 0 0 40px #00ffcc; }
            100% { text-shadow: 0 0 30px #00ffcc, 0 0 60px #00ffcc, 0 0 80px rgba(0, 255, 204, 0.8); }
        }
        
        @keyframes iconFloat {
            0%, 100% { transform: translateY(-50%) rotate(0deg); }
            50% { transform: translateY(-60%) rotate(10deg); }
        }
    </style>
</head>
<body>
    <div class="container">
        <header class="header">
            <h1>🎮 Godot游戏编程模式</h1>
            <p>专业游戏开发者的设计模式指南</p>
        </header>
        
        <div class="chapters-grid">
            ${chaptersHTML}
        </div>
        
        <div class="qr-section">
            <img src="qr_code.png" alt="Buy Me A Coffee QR Code" />
            <p>如果对你有帮助，Buy Me A Coffee～</p>
        </div>
    </div>
    
    <!-- Prism.js for syntax highlighting -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-csharp.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-gdscript.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-javascript.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-typescript.min.js"></script>
</body>
</html>`;
}

// 主要构建函数
function build() {
    console.log('🚀 开始构建多页面网站...');
    
    // 创建输出目录
    const outputDir = './website-output';
    if (fs.existsSync(outputDir)) {
        fs.rmSync(outputDir, { recursive: true });
    }
    fs.mkdirSync(outputDir, { recursive: true });
    
    // 解析章节
    console.log('📖 解析Markdown章节...');
    const chapters = parseChapters(markdownContent);
    
    // 添加引言章节在最前面
    const introductionContent = fs.readFileSync('./introduction_content.md', 'utf-8');
    const introductionChapter = {
        number: '0',
        title: '引言',
        slug: 'introduction',
        content: introductionContent
    };
    
    const allChapters = [introductionChapter, ...chapters];
    console.log(`发现 ${allChapters.length} 个章节（包括引言）`);
    
    // 生成每个章节的HTML文件
    console.log('🏗️ 生成章节HTML文件...');
    allChapters.forEach(chapter => {
        const html = generateHTMLTemplate(
            chapter.number === '0' ? chapter.title : `${chapter.number}. ${chapter.title}`,
            chapter.content,
            allChapters,
            chapter.slug
        );
        fs.writeFileSync(path.join(outputDir, `${chapter.slug}.html`), html);
        console.log(`✅ 生成: ${chapter.slug}.html`);
    });
    
    // 生成首页
    console.log('🏠 生成首页...');
    const indexHTML = generateIndexHTML(allChapters); // 首页包含引言和所有设计模式
    fs.writeFileSync(path.join(outputDir, 'index.html'), indexHTML);
    
    // 复制QR码图片
    console.log('🖼️ 复制QR码图片...');
    fs.copyFileSync('./qr_code.png', path.join(outputDir, 'qr_code.png'));
    
    console.log(`✨ 构建完成！输出目录: ${outputDir}`);
    console.log(`📋 生成的文件:`);
    console.log(`   - index.html (首页)`);
    allChapters.forEach(chapter => {
        const displayTitle = chapter.number === '0' ? chapter.title : `${chapter.number}. ${chapter.title}`;
        console.log(`   - ${chapter.slug}.html (${displayTitle})`);
    });
    console.log(`   - qr_code.png (付款码图片)`);
}

// 执行构建
build();