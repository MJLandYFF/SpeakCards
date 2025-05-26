const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
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

// 静态文件服务
app.use(express.static(path.join(__dirname)));

app.listen(3000, '0.0.0.0', () => {
  console.log('Server running at http://0.0.0.0:3000/');
});
