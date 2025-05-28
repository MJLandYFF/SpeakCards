# SpeakCards 部署指南

## 🌐 在线访问部署方案

### 方案一：GitHub Pages（推荐）

1. **GitHub仓库设置**
   ```bash
   git remote add origin https://github.com/yangfeifan/SpeakCards.git
   git push -u origin master
   ```

2. **启用GitHub Pages**
   - 进入GitHub仓库 Settings → Pages
   - Source选择 "Deploy from a branch"
   - Branch选择 "master"
   - Folder选择 "/ (root)"
   - 保存设置

3. **访问地址**
   - 主页面：`https://yangfeifan.github.io/SpeakCards/`
   - 直接使用index.html作为入口

### 方案二：Vercel部署（更快速）

1. **安装Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **登录并部署**
   ```bash
   vercel login
   vercel --prod
   ```

3. **自动获得访问链接**
   - Vercel会自动分配一个域名
   - 例如：`https://speak-cards-xxx.vercel.app`

### 方案三：Netlify部署

1. **访问 netlify.com**
2. **拖拽项目文件夹到部署区域**
3. **自动获得访问链接**

## 📱 手机访问优化

### TTS服务配置
由于百度TTS需要服务器支持，手机访问时有以下选项：

1. **使用浏览器内置TTS（推荐）**
   - 修改 `tts-config.js` 启用 Web Speech API
   - 无需服务器，直接在手机浏览器工作

2. **云服务器部署百度TTS**
   - 将 `baidu-tts-server.js` 部署到云服务器
   - 修改前端配置指向云服务器地址

## 🛠 配置修改

### 1. 修改TTS配置（适配在线访问）

在 `tts-config.js` 中添加在线模式：

```javascript
// 检测是否在线访问
const isOnlineMode = window.location.protocol === 'https:' || window.location.hostname !== 'localhost';

if (isOnlineMode) {
    // 使用浏览器内置TTS
    window.ttsConfig = {
        useWebSpeechAPI: true,
        baiduTTSEnabled: false
    };
} else {
    // 本地开发模式
    window.ttsConfig = {
        useWebSpeechAPI: false,
        baiduTTSEnabled: true,
        baiduTTSServer: 'http://localhost:8000'
    };
}
```

### 2. 创建PWA配置（支持手机安装）

创建 `manifest.json`：

```json
{
  "name": "SpeakCards",
  "short_name": "SpeakCards",
  "description": "智能单词卡片学习应用",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#667eea",
  "icons": [
    {
      "src": "LOGO.ico",
      "sizes": "32x32",
      "type": "image/x-icon"
    }
  ]
}
```

## 🚀 部署步骤总结

1. **推送到GitHub**
   ```bash
   git add .
   git commit -m "准备部署到GitHub Pages"
   git push origin master
   ```

2. **启用GitHub Pages**
   - 在GitHub仓库设置中启用Pages
   - 选择master分支

3. **手机访问**
   - 访问 `https://yangfeifan.github.io/SpeakCards/`
   - 建议添加到手机主屏幕

## 📋 注意事项

- GitHub Pages只支持静态文件，不支持Node.js服务器
- 百度TTS服务器需要单独部署到云服务器
- 建议启用浏览器内置TTS作为备选方案
- 确保所有资源使用相对路径

## 🔧 故障排除

如果遇到问题：
1. 检查浏览器控制台错误信息
2. 确认GitHub Pages设置正确
3. 验证所有文件路径都是相对路径
4. 检查移动端兼容性
