// SpeakCards TTS配置文件
// TTS Configuration for SpeakCards

const TTS_CONFIG = {
    // ElevenLabs 配置
    elevenlabs: {
        // 在这里输入您的ElevenLabs API密钥
        // 获取方式: https://elevenlabs.io → Profile → API Keys
        apiKey: 'YOUR_FREE_API_KEY', // 替换为您的真实API密钥
        
        // 预设语音ID
        voices: {
            english: {
                female: 'EXAVITQu4vr4xnSDxMaL', // Sarah
                male: 'VR6AewLTigWG4xSOukaG',   // Adam
            },
            chinese: {
                female: 'pNInz6obpgDQGcFmaJgB', // Adam (多语言)
                male: 'pNInz6obpgDQGcFmaJgB',   // Adam (多语言)
            }
        },
        
        // 语音参数设置
        settings: {
            stability: 0.5,         // 稳定性 (0-1)
            similarity_boost: 0.5,  // 相似度增强 (0-1)
            style: 0.0,             // 风格强度 (0-1) 
            use_speaker_boost: true // 说话人增强
        }
    },
    
    // ResponsiveVoice 配置
    responsiveVoice: {
        // 免费版本无需API密钥
        voices: {
            english: {
                female: 'US English Female',
                male: 'US English Male'
            },
            chinese: {
                female: 'Chinese Female',
                male: 'Chinese Male'
            }
        },
        
        // 语音参数
        settings: {
            pitch: 1,    // 音调 (0-2)
            rate: 0.9,   // 语速 (0-1.5)
            volume: 1    // 音量 (0-1)
        }
    },
    
    // 增强浏览器语音配置
    enhancedBrowser: {
        // 英文首选语音列表 (按优先级排序)
        englishVoices: [
            'Microsoft Aria Online (Natural) - English (United States)',
            'Microsoft Jenny Online (Natural) - English (United States)', 
            'Microsoft Guy Online (Natural) - English (United States)',
            'Microsoft Zira - English (United States)',
            'Microsoft David - English (United States)',
            'Google US English',
            'Alex',           // macOS
            'Samantha',       // macOS
            'Karen',          // macOS
            'Victoria',       // macOS
            'Daniel'          // macOS
        ],
        
        // 中文首选语音列表
        chineseVoices: [
            'Microsoft Yunxi Online (Natural) - Chinese (Mainland)',
            'Microsoft Xiaoxiao Online (Natural) - Chinese (Mainland)',
            'Microsoft Xiaoyi Online (Natural) - Chinese (Mainland)',
            'Google 中文（中国大陆）',
            'Ting-Ting',      // macOS
            'Sin-ji'          // macOS
        ],
        
        // 语音参数
        settings: {
            english: {
                rate: 0.85,   // 英文稍慢，便于学习
                pitch: 1.0,
                volume: 1.0
            },
            chinese: {
                rate: 0.9,    // 中文正常语速
                pitch: 1.0,
                volume: 1.0
            }
        }
    },
    
    // 百度TTS配置
    baidu: {
        // 语音人员编号
        speakers: {
            chinese: {
                female: 4,    // 度丫丫
                male: 3       // 度逍遥
            },
            english: {
                female: 110,  // 英文女声
                male: 106     // 英文男声
            }
        },
        
        // 语音参数
        settings: {
            spd: 4,  // 语速 (0-15)
            pit: 5,  // 音调 (0-15) 
            vol: 5,  // 音量 (0-15)
            aue: 6   // 音频格式 (6=mp3)
        }
    }
};

// 百度语音API配置
window.TTS_CONFIG = window.TTS_CONFIG || {};
window.TTS_CONFIG.baidu = {
  apiKey: 'rxMchZBLlVQgh23U9KDdfbTD',
  secretKey: '7TAOotMxEFHmepilZPxSxMwdupf9mpSg',
  serverUrl: 'http://localhost:8000/tts' // 本地后端服务地址
};

// 导出配置 (如果在模块环境中使用)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TTS_CONFIG;
}

// 使用说明:
// 1. 将您的ElevenLabs API密钥替换 'YOUR_FREE_API_KEY'
// 2. 可以根据需要调整语音参数
// 3. 可以添加或移除首选语音列表中的选项
// 4. 保存文件后刷新页面生效