const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const app = express();
app.use(express.json());
app.use(cors());

const API_KEY = 'rxMchZBLlVQgh23U9KDdfbTD';
const SECRET_KEY = '7TAOotMxEFHmepilZPxSxMwdupf9mpSg';

let accessToken = '';
let tokenExpire = 0;
const USER_DATA_FILE = path.join(__dirname, 'user-data.json');

function readUserData() {
    if (!fs.existsSync(USER_DATA_FILE)) return { users: [] };
    try {
        return JSON.parse(fs.readFileSync(USER_DATA_FILE, 'utf-8'));
    } catch (e) {
        return { users: [] };
    }
}
function writeUserData(data) {
    fs.writeFileSync(USER_DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// 获取access_token
async function getAccessToken() {
    if (Date.now() < tokenExpire && accessToken) return accessToken;
    const res = await axios.get(
        `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${API_KEY}&client_secret=${SECRET_KEY}`
    );
    accessToken = res.data.access_token;
    tokenExpire = Date.now() + (res.data.expires_in - 60) * 1000;
    return accessToken;
}

// 合成语音
app.post('/tts', async (req, res) => {
    const { text, lang, per, spd, pit, vol } = req.body;
    if (!text) return res.status(400).json({ error: 'text required' });
    try {
        const token = await getAccessToken();
        const params = new URLSearchParams({
            tex: text,
            tok: token,
            cuid: 'speakcards',
            ctp: 1,
            lan: lang || 'zh',
            per: per != null ? per : 0,
            spd: spd != null ? spd : 5,
            pit: pit != null ? pit : 5,
            vol: vol != null ? vol : 5,
            aue: 6 // mp3
        });
        const ttsRes = await axios.post(
            'https://tsn.baidu.com/text2audio',
            params,
            { responseType: 'arraybuffer' }
        );
        res.set('Content-Type', 'audio/mp3');
        res.send(ttsRes.data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 注册账号
app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: '手机号和密码不能为空' });
    
    // 验证手机号格式
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(username)) {
        return res.status(400).json({ error: '请输入正确的11位手机号格式' });
    }
    
    // 验证密码长度
    if (password.length < 6) {
        return res.status(400).json({ error: '密码至少需要6位字符' });
    }
    
    const data = readUserData();
    if (data.users.find(u => u.username === username)) {
        return res.status(409).json({ error: '该手机号已被注册' });
    }
    const user = {
        username,
        password, // 明文存储，生产环境请加密
        progress: {}, // 单词掌握、场景等
    };
    data.users.push(user);
    writeUserData(data);
    res.json({ success: true });
});

// 登录
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: '用户名和密码不能为空' });
    const data = readUserData();
    const user = data.users.find(u => u.username === username && u.password === password);
    if (!user) return res.status(401).json({ error: '用户名或密码错误' });
    res.json({ success: true, user: { username: user.username, progress: user.progress || {} } });
});

// 保存用户操作（如掌握单词、场景等）
app.post('/api/save-progress', (req, res) => {
    const { username, progress } = req.body;
    if (!username) return res.status(400).json({ error: '用户名不能为空' });
    const data = readUserData();
    const user = data.users.find(u => u.username === username);
    if (!user) return res.status(404).json({ error: '用户不存在' });
    user.progress = progress;
    writeUserData(data);
    res.json({ success: true });
});

// 获取用户进度
app.post('/api/get-progress', (req, res) => {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: '用户名不能为空' });
    const data = readUserData();
    const user = data.users.find(u => u.username === username);
    if (!user) return res.status(404).json({ error: '用户不存在' });
    res.json({ 
        success: true, 
        progress: user.progress || { masteredWords: [], learningWords: {} } 
    });
});

// 静态文件服务
app.use(express.static(path.join(__dirname)));

// 获取本机IP地址
function getLocalIP() {
  const os = require('os');
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

app.listen(3000, '0.0.0.0', () => {
  const localIP = getLocalIP();
  console.log('🚀 SpeakCards服务器启动成功！');
  console.log('📱 本地访问地址: http://localhost:3000');
  console.log('🌐 局域网访问地址: http://' + localIP + ':3000');
  console.log('📋 停止服务器请按: Ctrl+C');
  console.log('-----------------------------------');
});
