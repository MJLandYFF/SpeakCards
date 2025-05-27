// SpeakCards 音频缓存系统
// Audio Caching System for SpeakCards

// 音频缓存管理器 - 用于减少TTS API调用，提高响应速度，支持离线使用
const AudioCache = {
    // 内存缓存
    cache: new Map(),
    
    // 存储限制 (默认50MB)
    maxCacheSize: 50 * 1024 * 1024, // 50MB
    
    // 当前缓存大小
    currentSize: 0,
    
    // IndexedDB存储名称
    dbName: 'SpeakCardsAudioCache',
    dbVersion: 1,
    storeName: 'audioFiles',
    
    // 初始化IndexedDB
    async init() {
        try {
            return new Promise((resolve, reject) => {
                const request = indexedDB.open(this.dbName, this.dbVersion);
                
                request.onerror = (event) => {
                    console.error('IndexedDB error:', event);
                    reject(new Error('无法打开音频缓存数据库'));
                };
                
                request.onsuccess = (event) => {
                    this.db = event.target.result;
                    this.loadCacheSizeInfo();
                    resolve();
                };
                
                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    
                    // 创建音频缓存存储
                    if (!db.objectStoreNames.contains(this.storeName)) {
                        const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
                        store.createIndex('provider', 'provider', { unique: false });
                        store.createIndex('timestamp', 'timestamp', { unique: false });
                    }
                    
                    // 创建元数据存储
                    if (!db.objectStoreNames.contains('metadata')) {
                        db.createObjectStore('metadata', { keyPath: 'key' });
                    }
                };
            });
        } catch (error) {
            console.error('Cache initialization error:', error);
            // 出错时返回解决的Promise，允许应用继续运行
            return Promise.resolve();
        }
    },
    
    // 保存缓存大小信息到IndexedDB
    async saveCacheSizeInfo() {
        if (!this.db) return;
        
        try {
            const transaction = this.db.transaction('metadata', 'readwrite');
            const store = transaction.objectStore('metadata');
            
            await store.put({ 
                key: 'cacheSize', 
                value: this.currentSize 
            });
        } catch (error) {
            console.warn('Error saving cache size info:', error);
        }
    },
    
    // 从IndexedDB加载缓存大小信息
    async loadCacheSizeInfo() {
        if (!this.db) return;
        
        try {
            const transaction = this.db.transaction('metadata', 'readonly');
            const store = transaction.objectStore('metadata');
            
            const request = store.get('cacheSize');
            request.onsuccess = () => {
                if (request.result) {
                    this.currentSize = request.result.value;
                    console.log(`已加载缓存大小信息: ${this.formatSize(this.currentSize)}`);
                }
            };
        } catch (error) {
            console.warn('Error loading cache size info:', error);
        }
    },
    
    // 生成缓存键
    generateKey(text, lang, provider) {
        // 使用text+lang+provider作为唯一键
        return `${text}_${lang}_${provider}`;
    },
    
    // 向缓存添加音频
    async add(text, audioBlob, lang, provider) {
        try {
            const key = this.generateKey(text, lang, provider);
            const size = audioBlob.size;
            
            // 如果添加会超过缓存限制，先清理一些旧的缓存
            if (this.currentSize + size > this.maxCacheSize) {
                await this.cleanup((this.currentSize + size) - this.maxCacheSize);
            }
            
            // 先添加到内存缓存
            this.cache.set(key, {
                blob: audioBlob,
                timestamp: Date.now(),
                size: size
            });
            
            // 更新缓存大小
            this.currentSize += size;
            
            // 保存到IndexedDB
            if (this.db) {
                const transaction = this.db.transaction(this.storeName, 'readwrite');
                const store = transaction.objectStore(this.storeName);
                
                const item = {
                    id: key,
                    text: text,
                    audio: audioBlob,
                    lang: lang,
                    provider: provider,
                    timestamp: Date.now(),
                    size: size
                };
                
                await store.put(item);
                await this.saveCacheSizeInfo();
            }
            
            console.log(`已缓存音频: "${text.substring(0, 20)}..." (${this.formatSize(size)})`);
        } catch (error) {
            console.error('Error adding to cache:', error);
        }
    },
    
    // 从缓存获取音频
    async get(text, lang, provider) {
        try {
            const key = this.generateKey(text, lang, provider);
            
            // 先检查内存缓存
            if (this.cache.has(key)) {
                const cachedItem = this.cache.get(key);
                console.log(`从内存中获取缓存: "${text.substring(0, 20)}..."`);
                
                // 更新访问时间戳 (LRU策略)
                cachedItem.timestamp = Date.now();
                return cachedItem.blob;
            }
            
            // 然后检查IndexedDB
            if (this.db) {
                const transaction = this.db.transaction(this.storeName, 'readonly');
                const store = transaction.objectStore(this.storeName);
                
                return new Promise((resolve, reject) => {
                    const request = store.get(key);
                    
                    request.onsuccess = (event) => {
                        const item = event.target.result;
                        if (item) {
                            console.log(`从IndexedDB中获取缓存: "${text.substring(0, 20)}..."`);
                            
                            // 添加到内存缓存
                            this.cache.set(key, {
                                blob: item.audio,
                                timestamp: Date.now(),
                                size: item.size
                            });
                            
                            // 更新访问时间戳 (LRU策略)
                            const updateTx = this.db.transaction(this.storeName, 'readwrite');
                            const updateStore = updateTx.objectStore(this.storeName);
                            item.timestamp = Date.now();
                            updateStore.put(item);
                            
                            resolve(item.audio);
                        } else {
                            resolve(null);
                        }
                    };
                    
                    request.onerror = (event) => {
                        console.warn('Error getting from cache:', event);
                        resolve(null);
                    };
                });
            }
            
            return null;
        } catch (error) {
            console.error('Error retrieving from cache:', error);
            return null;
        }
    },
    
    // 清理缓存
    async cleanup(bytesToFree = 0) {
        try {
            if (!this.db) return;
            
            const transaction = this.db.transaction(this.storeName, 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const index = store.index('timestamp');
            
            // 获取所有缓存项，按时间戳排序
            const request = index.openCursor(null, 'next');
            
            let freedSpace = 0;
            
            return new Promise((resolve) => {
                const itemsToDelete = [];
                
                request.onsuccess = (event) => {
                    const cursor = event.target.result;
                    
                    if (cursor && (bytesToFree === 0 || freedSpace < bytesToFree)) {
                        itemsToDelete.push({
                            key: cursor.value.id,
                            size: cursor.value.size
                        });
                        freedSpace += cursor.value.size;
                        cursor.continue();
                    } else {
                        // 删除收集的项目
                        let deletedCount = 0;
                        
                        // 如果没有需要删除的项目
                        if (itemsToDelete.length === 0) {
                            resolve();
                            return;
                        }
                        
                        // 优先删除最旧的项目直到释放足够空间
                        for (const item of itemsToDelete) {
                            // 如果已经释放足够的空间且不是全量清理 (bytesToFree > 0)，退出循环
                            if (bytesToFree > 0 && freedSpace >= bytesToFree && deletedCount > 0) {
                                break;
                            }
                            
                            // 从内存缓存中删除
                            if (this.cache.has(item.key)) {
                                this.cache.delete(item.key);
                            }
                            
                            // 从IndexedDB中删除
                            store.delete(item.key);
                            deletedCount++;
                            
                            // 更新缓存大小
                            this.currentSize -= item.size;
                        }
                        
                        this.saveCacheSizeInfo();
                        console.log(`已清理缓存: ${deletedCount}项, ${this.formatSize(freedSpace)}`);
                        resolve();
                    }
                };
                
                request.onerror = () => {
                    console.warn('Error during cache cleanup');
                    resolve();
                };
            });
        } catch (error) {
            console.error('Cache cleanup error:', error);
        }
    },
    
    // 清空所有缓存
    async clearAll() {
        try {
            // 清空内存缓存
            this.cache.clear();
            this.currentSize = 0;
            
            if (this.db) {
                // 清空IndexedDB
                const transaction = this.db.transaction(this.storeName, 'readwrite');
                const store = transaction.objectStore(this.storeName);
                store.clear();
                
                await this.saveCacheSizeInfo();
                console.log('已清空所有缓存');
            }
        } catch (error) {
            console.error('Error clearing cache:', error);
        }
    },
    
    // 获取缓存统计信息
    async getStats() {
        try {
            const stats = {
                itemCount: this.cache.size,
                memorySize: this.currentSize,
                maxSize: this.maxCacheSize,
                usagePercentage: (this.currentSize / this.maxCacheSize) * 100,
                formattedSize: this.formatSize(this.currentSize),
                formattedMaxSize: this.formatSize(this.maxCacheSize)
            };
            
            // 如果IndexedDB可用，获取更准确的统计信息
            if (this.db) {
                const transaction = this.db.transaction(this.storeName, 'readonly');
                const store = transaction.objectStore(this.storeName);
                
                return new Promise((resolve) => {
                    const countRequest = store.count();
                    countRequest.onsuccess = () => {
                        stats.itemCount = countRequest.result;
                        resolve(stats);
                    };
                    
                    countRequest.onerror = () => {
                        resolve(stats);
                    };
                });
            }
            
            return stats;
        } catch (error) {
            console.error('Error getting cache stats:', error);
            return {
                itemCount: 0,
                memorySize: 0,
                maxSize: this.maxCacheSize,
                usagePercentage: 0,
                formattedSize: '0 B',
                formattedMaxSize: this.formatSize(this.maxCacheSize)
            };
        }
    },
    
    // 辅助方法：格式化字节大小
    formatSize(bytes) {
        if (bytes === 0) return '0 B';
        
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        
        return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
    }
};

// TTS音频缓存增强器 - 为不同TTS函数增加缓存功能
const TTSWithCache = {
    // 初始化缓存系统
    async init() {
        await AudioCache.init();
        console.log('TTS缓存系统已初始化');
    },
      // 播放缓存音频
    async playAudioFromCache(audioBlob) {
        try {
            if (!audioBlob) return false;
            
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = window.MobileAudioFix 
                ? window.MobileAudioFix.createCompatibleAudio(audioUrl)
                : new Audio(audioUrl);
            
            // 播放结束时释放URL
            audio.onended = () => {
                URL.revokeObjectURL(audioUrl);
            };
            
            // 使用移动端兼容的播放方法
            if (window.MobileAudioFix && window.MobileAudioFix.playAudio) {
                await window.MobileAudioFix.playAudio(audio);
            } else {
                await audio.play();
            }
            return true;
        } catch (error) {
            console.error('Error playing cached audio:', error);
            return false;
        }
    },
    
    // 增强浏览器TTS (带缓存)
    async playEnhancedBrowserTTS(text, lang, useCache = true) {
        try {
            // 尝试从缓存获取
            if (useCache) {
                const cachedAudio = await AudioCache.get(text, lang, 'enhancedBrowser');
                if (cachedAudio && await this.playAudioFromCache(cachedAudio)) {
                    return true;
                }
            }
            
            // 如果没有缓存或禁用缓存，使用原始TTS
            if (typeof speechSynthesis === 'undefined') {
                throw new Error('浏览器不支持语音合成');
            }
            
            return new Promise((resolve, reject) => {
                // 获取语音列表
                let voices = speechSynthesis.getVoices();
                
                // 如果语音列表为空，等待加载
                if (!voices || voices.length === 0) {
                    speechSynthesis.onvoiceschanged = () => {
                        voices = speechSynthesis.getVoices();
                        continueWithVoices();
                    };
                } else {
                    continueWithVoices();
                }
                
                function continueWithVoices() {
                    // 取消正在进行的语音合成
                    if (speechSynthesis.speaking) {
                        speechSynthesis.cancel();
                    }
                    
                    const utterance = new SpeechSynthesisUtterance(text);
                    
                    // 根据配置选择语音和参数
                    const config = typeof TTS_CONFIG !== 'undefined' ? TTS_CONFIG.enhancedBrowser : null;
                    
                    if (lang === 'en') {
                        utterance.lang = 'en-US';
                        // 从配置中选择首选语音
                        const preferredVoices = config ? config.englishVoices : [];
                        const voice = selectBestVoice(voices, 'en', preferredVoices);
                        if (voice) utterance.voice = voice;
                        
                        // 应用参数设置
                        if (config && config.settings && config.settings.english) {
                            utterance.rate = config.settings.english.rate || 0.85;
                            utterance.pitch = config.settings.english.pitch || 1.0;
                            utterance.volume = config.settings.english.volume || 1.0;
                        } else {
                            utterance.rate = 0.85;
                            utterance.pitch = 1.0;
                            utterance.volume = 1.0;
                        }
                    } else {
                        utterance.lang = 'zh-CN';
                        // 从配置中选择首选语音
                        const preferredVoices = config ? config.chineseVoices : [];
                        const voice = selectBestVoice(voices, 'zh', preferredVoices);
                        if (voice) utterance.voice = voice;
                        
                        // 应用参数设置
                        if (config && config.settings && config.settings.chinese) {
                            utterance.rate = config.settings.chinese.rate || 0.9;
                            utterance.pitch = config.settings.chinese.pitch || 1.0;
                            utterance.volume = config.settings.chinese.volume || 1.0;
                        } else {
                            utterance.rate = 0.9;
                            utterance.pitch = 1.0;
                            utterance.volume = 1.0;
                        }
                    }
                    
                    // 注册回调
                    utterance.onend = () => {
                        resolve(true);
                    };
                    
                    utterance.onerror = (event) => {
                        console.error('TTS error:', event);
                        reject(new Error('语音合成出错'));
                    };
                    
                    // 播放语音
                    speechSynthesis.speak(utterance);
                    
                    // 注意：浏览器语音API不支持获取音频数据，无法缓存原始音频
                    // 这里我们不会向缓存添加数据
                }
            });
        } catch (error) {
            console.error('Enhanced browser TTS error:', error);
            throw error;
        }
    },
    
    // ElevenLabs TTS (带缓存)
    async playElevenLabsTTS(text, lang, useCache = true) {
        try {
            // 尝试从缓存获取
            if (useCache) {
                const cachedAudio = await AudioCache.get(text, lang, 'elevenlabs');
                if (cachedAudio && await this.playAudioFromCache(cachedAudio)) {
                    return true;
                }
            }
            
            // 使用限速器防止过快请求
            if (TTSRateLimiter.shouldThrottle('elevenlabs')) {
                showMessage('ElevenLabs API请求过于频繁，请稍候...');
                await TTSRateLimiter.wait('elevenlabs');
            } else {
                TTSRateLimiter.recordRequest('elevenlabs');
            }
            
            showMessage('正在使用 ElevenLabs 语音...');
            
            // 使用配置文件中的设置
            const config = typeof TTS_CONFIG !== 'undefined' ? TTS_CONFIG.elevenlabs : null;
            
            if (!config || config.apiKey === 'YOUR_FREE_API_KEY') {
                showMessage('请先配置 ElevenLabs API密钥');
                throw new Error('ElevenLabs API密钥未配置');
            }
            
            // 根据语言选择语音ID
            const voiceId = lang === 'en' 
                ? config.voices.english.female 
                : config.voices.chinese.female;
            
            const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
                method: 'POST',
                headers: {
                    'Accept': 'audio/mpeg',
                    'Content-Type': 'application/json',
                    'xi-api-key': config.apiKey
                },
                body: JSON.stringify({
                    text: text,
                    model_id: 'eleven_monolingual_v1',
                    voice_settings: config.settings
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('ElevenLabs error details:', errorData);
                
                if (response.status === 429) {
                    throw new Error('ElevenLabs API速率限制，请稍后再试');
                }
                throw new Error(`ElevenLabs API error: ${response.status}`);
            }
            
            const blob = await response.blob();
            
            // 保存到缓存
            if (useCache) {
                await AudioCache.add(text, blob, lang, 'elevenlabs');
            }
              // 播放音频
            const audio = window.MobileAudioFix 
                ? window.MobileAudioFix.createCompatibleAudio(URL.createObjectURL(blob))
                : new Audio(URL.createObjectURL(blob));
            
            // 使用移动端兼容的播放方法
            if (window.MobileAudioFix && window.MobileAudioFix.playAudio) {
                await window.MobileAudioFix.playAudio(audio);
            } else {
                await audio.play();
            }
            
            // 等待播放完成
            return new Promise((resolve) => {
                audio.onended = () => {
                    URL.revokeObjectURL(audio.src);
                    resolve(true);
                };
            });
        } catch (error) {
            console.error('ElevenLabs TTS error:', error);
            throw error;
        }
    },
    
    // ResponsiveVoice TTS (带缓存)
    async playResponsiveVoiceTTS(text, lang, useCache = true) {
        try {
            // ResponsiveVoice不支持直接获取音频数据，无法缓存
            // 这是因为它在内部处理音频播放，不提供音频数据访问
            
            // 使用限速器防止过快请求
            if (TTSRateLimiter.shouldThrottle('responsivevoice')) {
                showMessage('ResponsiveVoice API请求过于频繁，请稍候...');
                await TTSRateLimiter.wait('responsivevoice');
            } else {
                TTSRateLimiter.recordRequest('responsivevoice');
            }
            
            // 检查ResponsiveVoice是否已加载
            if (typeof responsiveVoice === 'undefined') {
                // 动态加载ResponsiveVoice
                showMessage('正在加载ResponsiveVoice服务...');
                
                await new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = 'https://code.responsivevoice.org/responsivevoice.js?key=FREE';
                    script.onload = resolve;
                    script.onerror = reject;
                    document.head.appendChild(script);
                });
            }
            
            showMessage('正在使用 ResponsiveVoice 语音...');
            
            // 使用配置文件中的语音名称
            const config = typeof TTS_CONFIG !== 'undefined' ? TTS_CONFIG.responsiveVoice : null;
            
            const voiceName = config && config.voices 
                ? (lang === 'en' ? config.voices.english.female : config.voices.chinese.female)
                : (lang === 'en' ? 'US English Female' : 'Chinese Female');
            
            const settings = config && config.settings ? config.settings : {
                pitch: 1,
                rate: 0.9,
                volume: 1
            };
            
            // 播放语音
            return new Promise((resolve, reject) => {
                try {
                    if (responsiveVoice.isPlaying && responsiveVoice.isPlaying()) {
                        responsiveVoice.cancel();
                    }
                    
                    responsiveVoice.speak(text, voiceName, {
                        pitch: settings.pitch,
                        rate: settings.rate,
                        volume: settings.volume,
                        onend: () => resolve(true),
                        onerror: (error) => reject(error),
                        timeout: 15000
                    });
                } catch (error) {
                    reject(error);
                }
            });
        } catch (error) {
            console.error('ResponsiveVoice TTS error:', error);
            throw error;
        }
    },
    
    // 默认浏览器TTS (不支持缓存)
    async playDefaultBrowserTTS(text, lang) {
        if (typeof speechSynthesis === 'undefined') {
            throw new Error('浏览器不支持语音合成');
        }
        
        // 取消正在进行的语音合成
        if (speechSynthesis.speaking) {
            speechSynthesis.cancel();
        }
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang === 'en' ? 'en-US' : 'zh-CN';
        
        // 基本参数设置
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        
        // 播放语音
        return new Promise((resolve, reject) => {
            utterance.onend = () => resolve(true);
            utterance.onerror = (event) => reject(new Error('语音合成出错: ' + event.error));
            speechSynthesis.speak(utterance);
        });
    },
    
    // 获取缓存统计信息
    async getCacheStats() {
        return await AudioCache.getStats();
    },
    
    // 清空缓存
    async clearCache() {
        await AudioCache.clearAll();
    }
};

// 在DOM加载完成后初始化缓存系统
document.addEventListener('DOMContentLoaded', async () => {
    await TTSWithCache.init();
});

// 导出对象 (如果在模块环境中使用)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AudioCache, TTSWithCache };
}
