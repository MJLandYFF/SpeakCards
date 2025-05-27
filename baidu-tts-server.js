const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();
app.use(express.json());
app.use(cors());

const API_KEY = 'rxMchZBLlVQgh23U9KDdfbTD';
const SECRET_KEY = '7TAOotMxEFHmepilZPxSxMwdupf9mpSg';

let accessToken = '';
let tokenExpire = 0;

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
    const { text, lang, per, gender } = req.body;
    if (!text) return res.status(400).json({ error: 'text required' });
    try {
        const token = await getAccessToken();
        
        // 处理性别参数 - 增强兼容性
        let voiceType = 0; // 默认女声
        
        // 处理各种可能的性别参数格式
        if (per !== undefined) {
            // 数字格式
            voiceType = parseInt(per);
        } else if (gender) {
            // 字符串格式
            if (gender === 'male' || gender === '男') {
                voiceType = 1;  // 男声
            } else if (gender === 'female' || gender === '女') {
                voiceType = 0;  // 女声
            }
        }
        
        // 日志记录参数
        console.log('[BaiduTTS] 请求参数:', { text, lang, per, gender, voiceType });
        
        const params = new URLSearchParams({
            tex: text,
            tok: token,
            cuid: 'speakcards',
            ctp: 1,
            lan: lang || 'zh',
            per: voiceType, // 0女 1男 3度逍遥 4度丫丫
            spd: 5,
            pit: 5,
            vol: 5,
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

// 健康检查端点
app.get('/health', (req, res) => {
    res.json({ status: 'OK', service: 'Baidu TTS Server', timestamp: new Date().toISOString() });
});

app.listen(8000, () => console.log('Baidu TTS server running on port 8000'));
