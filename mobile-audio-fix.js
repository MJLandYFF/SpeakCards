// SpeakCards 移动端音频播放兼容性修复
// Mobile Audio Playback Compatibility Fix for SpeakCards

const MobileAudioFix = {
    // 音频上下文状态
    audioContext: null,
    isAudioEnabled: false,
    isInitialized: false,
    
    // 预加载的静音音频，用于解锁音频播放
    silentAudio: null,
    
    // 检测是否为移动端设备
    isMobileDevice() {
        const userAgent = navigator.userAgent.toLowerCase();
        const mobileKeywords = [
            'mobile', 'android', 'iphone', 'ipad', 'ipod', 
            'blackberry', 'windows phone', 'webos'
        ];
        return mobileKeywords.some(keyword => userAgent.includes(keyword)) 
            || window.innerWidth <= 768 
            || 'ontouchstart' in window;
    },

    // 检测是否为微信/QQ浏览器
    isWeChatOrQQBrowser() {
        const userAgent = navigator.userAgent.toLowerCase();
        return userAgent.includes('micromessenger') || 
               userAgent.includes('qq/') || 
               userAgent.includes('qqbrowser');
    },

    // 初始化移动端音频修复
    async init() {
        if (this.isInitialized) return;
        
        console.log('[MobileAudioFix] 初始化移动端音频修复');
        
        try {
            // 创建AudioContext（如果支持）
            if (window.AudioContext || window.webkitAudioContext) {
                const AudioContextClass = window.AudioContext || window.webkitAudioContext;
                this.audioContext = new AudioContextClass();
            }

            // 创建静音音频用于解锁
            this.createSilentAudio();
            
            // 在页面加载时尝试预解锁音频
            this.setupUserInteractionUnlock();
            
            this.isInitialized = true;
            console.log('[MobileAudioFix] 初始化完成');
        } catch (error) {
            console.warn('[MobileAudioFix] 初始化失败:', error);
        }
    },    // 创建静音音频
    createSilentAudio() {
        try {
            // 使用最小的有效WAV文件 (44字节的空音频)
            const silentWav = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
            
            this.silentAudio = new Audio(silentWav);
            this.silentAudio.volume = 0.01;
            this.silentAudio.preload = 'auto';
            this.silentAudio.loop = false;
            
            // 添加错误处理
            this.silentAudio.onerror = (e) => {
                console.warn('[MobileAudioFix] 静音音频加载失败:', e);
                this.createFallbackSilentAudio();
            };
            
            this.silentAudio.oncanplaythrough = () => {
                console.log('[MobileAudioFix] 静音音频准备就绪');
            };
            
            // 预加载静音音频
            this.silentAudio.load();
            
            console.log('[MobileAudioFix] 静音音频创建成功');
        } catch (error) {
            console.warn('[MobileAudioFix] 创建静音音频失败:', error);
            // 备用方案：创建空的音频元素
            this.createFallbackSilentAudio();
        }
    },    // 备用静音音频创建方案
    createFallbackSilentAudio() {
        try {
            console.log('[MobileAudioFix] 尝试备用静音音频方案');
            
            // 方案1: 使用AudioContext创建静音音频（如果可用）
            if (this.audioContext && this.audioContext.state !== 'suspended') {
                const duration = 0.1; // 0.1秒
                const sampleRate = this.audioContext.sampleRate;
                const frameCount = sampleRate * duration;
                const audioBuffer = this.audioContext.createBuffer(1, frameCount, sampleRate);
                
                // 创建静音数据（全为0）
                const channelData = audioBuffer.getChannelData(0);
                for (let i = 0; i < frameCount; i++) {
                    channelData[i] = 0;
                }
                
                console.log('[MobileAudioFix] 使用AudioContext创建备用静音音频');
                return true;
            }
            
            // 方案2: 使用更简单的音频数据
            const alternatives = [
                // 空的MP3 (最小有效MP3文件)
                'data:audio/mp3;base64,SUQzBAAAAAABEVRYWFgAAAAtAAADY29tbQAAABd3d3cuaHVuZ2FyaWFuLXNvZnR3YXJlLmh1VENMRUNPRE0AAAAMdW5kbyBtcDMgdjEuNP/7kGQAAA',
                
                // 空的OGG
                'data:audio/ogg;base64,T2dnUwACAAAAAAAAAADqnjMlAAAAAOyyzPIBHgF2b3JiaXMAAAAAAUSsAABBHAAAABpjBwQFH3dvcmJpcwLAAAALALy1d/aVWRNFQTxZaHJfSHJfO3N0eWxlPXRleHQtZGVjb3JhdGlvbjpub25lO2ZvbnQtZmFtaWx5OmFyaWFsLCBzYW5zLXNlcmlmO2ZvbnQtc2l6ZTo=',
                
                // 最简单的WAV (更小)
                'data:audio/wav;base64,UklGRjQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA='
            ];
            
            for (let i = 0; i < alternatives.length; i++) {
                try {
                    this.silentAudio = new Audio(alternatives[i]);
                    this.silentAudio.volume = 0.01;
                    this.silentAudio.preload = 'auto';
                    this.silentAudio.load();
                    
                    console.log(`[MobileAudioFix] 备用方案 ${i + 1} 创建成功`);
                    return true;
                } catch (e) {
                    console.warn(`[MobileAudioFix] 备用方案 ${i + 1} 失败:`, e);
                }
            }
            
            console.warn('[MobileAudioFix] 所有备用静音音频方案都失败');
            return false;
            
        } catch (error) {
            console.warn('[MobileAudioFix] 备用静音音频创建失败:', error);
            return false;
        }
    },    // 设置用户交互解锁 - 更保守的策略
    setupUserInteractionUnlock() {
        // 移动端音频解锁需要在真正的用户交互中进行
        console.log('[MobileAudioFix] 音频解锁已准备就绪，等待真正的用户交互');
        
        const unlockAudio = async (event) => {
            // 只处理真实的用户交互事件
            if (!event.isTrusted || this.isAudioEnabled) return;
            
            try {
                console.log('[MobileAudioFix] 真实用户交互，解锁音频');
                
                // 首先恢复AudioContext
                if (this.audioContext && this.audioContext.state === 'suspended') {
                    await this.audioContext.resume();
                    console.log('[MobileAudioFix] AudioContext已恢复');
                }
                
                // 创建临时音频测试播放能力
                const testAudio = new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=');
                testAudio.volume = 0.01;
                testAudio.muted = false;
                
                try {
                    await testAudio.play();
                    testAudio.pause();
                    console.log('[MobileAudioFix] 音频测试播放成功');
                } catch (playError) {
                    console.warn('[MobileAudioFix] 音频测试播放失败，但继续:', playError.message);
                }
                
                this.isAudioEnabled = true;
                console.log('[MobileAudioFix] 音频播放权限已解锁');
                
                // 移除一次性监听器
                document.removeEventListener('touchstart', unlockAudio, true);
                document.removeEventListener('click', unlockAudio, true);
                
                // 显示成功提示
                if (typeof window.showMessage === 'function') {
                    window.showMessage('🔊 音频已激活', 1500);
                }
                
            } catch (error) {
                console.warn('[MobileAudioFix] 解锁失败:', error.message);
                // 即使失败也标记为已解锁，让后续播放尝试
                this.isAudioEnabled = true;
            }
        };

        // 只在移动设备上设置解锁监听器
        if (this.isMobileDevice()) {
            document.addEventListener('touchstart', unlockAudio, { once: true, capture: true, passive: false });
            document.addEventListener('click', unlockAudio, { once: true, capture: true, passive: false });
            
            // 延迟显示激活提示
            setTimeout(() => {
                if (!this.isAudioEnabled && typeof window.showMessage === 'function') {
                    const message = this.isWeChatOrQQBrowser() 
                        ? '💡 微信中需要点击页面激活音频' 
                        : '💡 点击页面激活音频功能';
                    window.showMessage(message, 6000);
                }
            }, 2000);
        } else {
            // 桌面端直接标记为已启用
            this.isAudioEnabled = true;
        }
    },    // 增强的音频播放函数 - 简化版本
    async playAudio(audioElement, retryCount = 2) {
        if (!audioElement) {
            throw new Error('音频元素不存在');
        }

        // 移动端检查音频是否已解锁
        if (this.isMobileDevice() && !this.isAudioEnabled) {
            console.log('[MobileAudioFix] 移动端音频未解锁，尝试按需解锁');
            const unlocked = await this.unlockAudioOnDemand();
            if (!unlocked) {
                throw new Error('需要用户交互才能播放音频，请点击页面激活');
            }
        }

        for (let attempt = 1; attempt <= retryCount; attempt++) {
            try {
                console.log(`[MobileAudioFix] 尝试播放音频 (第${attempt}次)`);
                
                // 重置音频状态
                audioElement.currentTime = 0;
                audioElement.muted = false;
                audioElement.volume = Math.max(audioElement.volume, 0.7);
                
                // 等待音频加载完成（移动端特别重要）
                if (audioElement.readyState < 2) {
                    console.log('[MobileAudioFix] 等待音频加载完成...');
                    await new Promise((resolve, reject) => {
                        const timeout = setTimeout(() => {
                            reject(new Error('音频加载超时'));
                        }, 3000);
                        
                        const onReady = () => {
                            clearTimeout(timeout);
                            audioElement.removeEventListener('canplaythrough', onReady);
                            audioElement.removeEventListener('error', onError);
                            resolve();
                        };
                        
                        const onError = (e) => {
                            clearTimeout(timeout);
                            audioElement.removeEventListener('canplaythrough', onReady);
                            audioElement.removeEventListener('error', onError);
                            reject(new Error('音频加载失败'));
                        };
                        
                        audioElement.addEventListener('canplaythrough', onReady);
                        audioElement.addEventListener('error', onError);
                        
                        if (audioElement.readyState >= 2) {
                            onReady();
                        } else {
                            audioElement.load();
                        }
                    });
                }
                
                // 播放音频
                const playPromise = audioElement.play();
                if (playPromise && typeof playPromise.then === 'function') {
                    await playPromise;
                }
                
                console.log('[MobileAudioFix] 音频播放成功');
                return true;
                
            } catch (error) {
                console.warn(`[MobileAudioFix] 第${attempt}次播放失败:`, error.name, error.message);
                
                if (attempt === retryCount) {
                    // 根据错误类型提供友好提示
                    if (error.name === 'NotAllowedError') {
                        const message = this.isWeChatOrQQBrowser() 
                            ? '微信/QQ浏览器需要先点击页面激活音频' 
                            : '浏览器阻止了音频播放，请先点击页面';
                        throw new Error(message);
                    } else if (error.name === 'AbortError') {
                        // AbortError 在移动端可能是正常现象，不算严重错误
                        console.warn('[MobileAudioFix] 播放被中断，可能是正常情况');
                        return true;
                    } else {
                        throw new Error(`音频播放失败: ${error.message}`);
                    }
                }
                
                // 重试间隔
                await new Promise(resolve => setTimeout(resolve, 300 * attempt));
            }
        }
        
        return false;
    },// 按需解锁音频（用于异步TTS等场景）
    async unlockAudioOnDemand() {
        if (this.isAudioEnabled) return true;
        
        // 桌面端直接返回已启用
        if (!this.isMobileDevice()) {
            this.isAudioEnabled = true;
            return true;
        }
        
        console.log('[MobileAudioFix] 请求按需解锁音频');
        
        return new Promise((resolve) => {
            const message = this.isWeChatOrQQBrowser() 
                ? '🎵 请点击"确定"激活音频播放' 
                : '🎵 点击确定激活音频功能';
                
            // 显示提示
            if (typeof window.showMessage === 'function') {
                window.showMessage(message, 8000);
            }
            
            // 简化的解锁处理器
            const unlockHandler = async (event) => {
                if (!event.isTrusted) return;
                
                try {
                    console.log('[MobileAudioFix] 用户点击，尝试解锁音频');
                    
                    // 恢复AudioContext
                    if (this.audioContext && this.audioContext.state === 'suspended') {
                        await this.audioContext.resume();
                    }
                    
                    // 标记为已启用
                    this.isAudioEnabled = true;
                    
                    // 移除监听器
                    document.removeEventListener('click', unlockHandler, true);
                    document.removeEventListener('touchstart', unlockHandler, true);
                    
                    if (typeof window.showMessage === 'function') {
                        window.showMessage('✅ 音频已激活', 1500);
                    }
                    
                    resolve(true);
                } catch (error) {
                    console.warn('[MobileAudioFix] 按需解锁失败:', error);
                    this.isAudioEnabled = true; // 即使失败也标记为已启用
                    
                    document.removeEventListener('click', unlockHandler, true);
                    document.removeEventListener('touchstart', unlockHandler, true);
                    
                    resolve(true);
                }
            };
            
            // 添加事件监听器
            document.addEventListener('click', unlockHandler, { once: true, capture: true });
            document.addEventListener('touchstart', unlockHandler, { once: true, capture: true });
            
            // 8秒后超时
            setTimeout(() => {
                document.removeEventListener('click', unlockHandler, true);
                document.removeEventListener('touchstart', unlockHandler, true);
                resolve(false);
            }, 8000);
        });
    },

    // 创建兼容的Audio对象
    createCompatibleAudio(src) {
        const audio = new Audio(src);
        
        // 设置移动端兼容属性
        audio.crossOrigin = 'anonymous';
        audio.preload = 'auto';
        
        // 添加错误处理
        audio.addEventListener('error', (e) => {
            console.warn('[MobileAudioFix] 音频加载错误:', e);
        });
        
        return audio;
    },    // 获取设备和浏览器信息
    getDeviceInfo() {
        return {
            isMobile: this.isMobileDevice(),
            isWeChatOrQQ: this.isWeChatOrQQBrowser(),
            userAgent: navigator.userAgent,
            audioEnabled: this.isAudioEnabled,
            audioContextState: this.audioContext ? this.audioContext.state : 'not available'
        };
    },

    // 获取AudioContext实例
    getAudioContext() {
        return this.audioContext;
    }
};

// 初始化移动端音频修复
document.addEventListener('DOMContentLoaded', () => {
    MobileAudioFix.init();
});

// 导出到全局作用域
window.MobileAudioFix = MobileAudioFix;

// 如果在模块环境中使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MobileAudioFix;
}
