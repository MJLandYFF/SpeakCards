// TTS管理面板和缓存控制功能模块

function createTTSManagerPanel() {
    // 检查是否已存在管理面板
    if (document.getElementById('ttsManagerPanel')) {
        return;
    }
    
    const managerPanel = document.createElement('div');
    managerPanel.id = 'ttsManagerPanel';
    managerPanel.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 90%;
        max-width: 500px;
        background: #fff;
        border-radius: 12px;
        box-shadow: 0 10px 50px rgba(0,0,0,0.2);
        padding: 24px;
        z-index: 2100;
        border: 1px solid #e2e8f0;
        overflow-y: auto;
        max-height: 80vh;
    `;
    
    // 创建面板内容
    managerPanel.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h2 style="margin: 0; color: #1a202c; font-size: 1.5rem; font-weight: bold;">TTS设置与缓存管理</h2>
            <button id="closeTTSManagerBtn" style="background: none; border: none; font-size: 20px; cursor: pointer; color: #64748b;">×</button>
        </div>
        
        <div class="tabs-container" style="margin-bottom: 20px;">
            <div class="tabs-header" style="display: flex; border-bottom: 1px solid #e2e8f0; margin-bottom: 15px;">
                <button data-tab="settings" class="tab-button active" style="padding: 10px 15px; background: none; border: none; cursor: pointer; position: relative; font-weight: 500;">TTS设置</button>
                <button data-tab="cache" class="tab-button" style="padding: 10px 15px; background: none; border: none; cursor: pointer; position: relative; font-weight: 500;">缓存管理</button>
                <button data-tab="test" class="tab-button" style="padding: 10px 15px; background: none; border: none; cursor: pointer; position: relative; font-weight: 500;">语音测试</button>
                <div class="tab-indicator" style="position: absolute; bottom: 0; height: 3px; width: 0; background-color: #3182ce; transition: all 0.3s;"></div>
            </div>
            
            <div class="tab-content" data-tab="settings" style="display: block;">
                <div style="margin-bottom: 20px;">
                    <h3 style="font-size: 1.1rem; color: #2d3748; margin-bottom: 10px;">TTS首选项</h3>
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 500;">默认TTS引擎:</label>
                        <select id="defaultTTSEngine" style="width: 100%; padding: 8px; border: 1px solid #cbd5e0; border-radius: 6px;">
                            <option value="enhanced">增强浏览器 (推荐)</option>
                            <option value="responsivevoice">ResponsiveVoice</option>
                            <option value="speechify">Speechify Web</option>
                            <option value="elevenlabs">ElevenLabs</option>
                            <option value="baidu">百度TTS</option>
                        </select>
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 500;">自动缓存音频:</label>
                        <div style="display: flex; align-items: center;">
                            <input type="checkbox" id="autoCacheToggle" style="margin-right: 10px;" checked>
                            <span>启用自动缓存以提高性能并减少API调用</span>
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 500;">ElevenLabs API密钥:</label>
                        <input type="text" id="elevenLabsApiKey" style="width: 100%; padding: 8px; border: 1px solid #cbd5e0; border-radius: 6px;" placeholder="免费注册获取API密钥">
                        <small style="display: block; margin-top: 5px; color: #718096;">在 <a href="https://elevenlabs.io" target="_blank" style="color: #4299e1;">elevenlabs.io</a> 注册以获取免费API密钥</small>
                    </div>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <h3 style="font-size: 1.1rem; color: #2d3748; margin-bottom: 10px;">语音速率与音调</h3>
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 500;">语音速率:</label>
                        <input type="range" id="ttsRateSlider" min="0.5" max="1.5" step="0.1" value="0.9" style="width: 100%;">
                        <div style="display: flex; justify-content: space-between; margin-top: 5px;">
                            <span>慢</span>
                            <span id="ttsRateValue">0.9</span>
                            <span>快</span>
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 500;">音调:</label>
                        <input type="range" id="ttsPitchSlider" min="0.5" max="1.5" step="0.1" value="1.0" style="width: 100%;">
                        <div style="display: flex; justify-content: space-between; margin-top: 5px;">
                            <span>低</span>
                            <span id="ttsPitchValue">1.0</span>
                            <span>高</span>
                        </div>
                    </div>
                </div>
                
                <div>
                    <button id="saveSettingsBtn" style="width: 100%; padding: 10px; background: #3182ce; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">保存设置</button>
                </div>
            </div>
            
            <div class="tab-content" data-tab="cache" style="display: none;">
                <div style="margin-bottom: 20px;">
                    <h3 style="font-size: 1.1rem; color: #2d3748; margin-bottom: 10px;">缓存统计</h3>
                    <div id="cacheStats" style="background: #f7fafc; padding: 15px; border-radius: 8px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                            <span>已缓存项目:</span>
                            <span id="cacheItemCount">加载中...</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                            <span>已用空间:</span>
                            <span id="cacheUsedSpace">加载中...</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                            <span>总空间上限:</span>
                            <span id="cacheTotalSpace">加载中...</span>
                        </div>
                        <div style="margin-top: 10px;">
                            <div style="height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden;">
                                <div id="cacheUsageBar" style="height: 100%; width: 0%; background: #3182ce; transition: width 0.3s;"></div>
                            </div>
                            <div style="display: flex; justify-content: flex-end; margin-top: 5px;">
                                <span id="cacheUsagePercent">0%</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div>
                    <button id="clearCacheBtn" style="width: 100%; padding: 10px; background: #e53e3e; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; margin-bottom: 10px;">清空缓存</button>
                    <button id="refreshCacheStatsBtn" style="width: 100%; padding: 10px; background: #38a169; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">刷新统计</button>
                </div>
            </div>
            
            <div class="tab-content" data-tab="test" style="display: none;">
                <div style="margin-bottom: 20px;">
                    <h3 style="font-size: 1.1rem; color: #2d3748; margin-bottom: 10px;">语音测试</h3>
                    
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 500;">测试文本:</label>
                        <textarea id="testTextArea" style="width: 100%; height: 80px; padding: 8px; border: 1px solid #cbd5e0; border-radius: 6px; resize: vertical;" placeholder="输入要测试的文本...">Hello, this is a test for text-to-speech functionality.</textarea>
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 500;">语言:</label>
                        <select id="testLanguage" style="width: 100%; padding: 8px; border: 1px solid #cbd5e0; border-radius: 6px;">
                            <option value="en">英文</option>
                            <option value="zh">中文</option>
                        </select>
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 500;">TTS引擎:</label>
                        <select id="testTTSEngine" style="width: 100%; padding: 8px; border: 1px solid #cbd5e0; border-radius: 6px;">
                            <option value="enhanced">增强浏览器 (推荐)</option>
                            <option value="default">默认浏览器</option>
                            <option value="responsivevoice">ResponsiveVoice</option>
                            <option value="speechify">Speechify Web</option>
                            <option value="elevenlabs">ElevenLabs</option>
                            <option value="baidu">百度TTS</option>
                        </select>
                    </div>
                    
                    <button id="runTestBtn" style="width: 100%; padding: 10px; background: #3182ce; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; margin-bottom: 15px;">播放测试</button>
                    
                    <div>
                        <h4 style="font-size: 1rem; color: #2d3748; margin-bottom: 10px;">快速测试</h4>
                        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                            <button class="quick-test-btn" data-text="Hello, how are you today?" data-lang="en" style="padding: 6px 12px; background: #edf2f7; border: none; border-radius: 4px; cursor: pointer;">英文问候</button>
                            <button class="quick-test-btn" data-text="This is a test of the text-to-speech system." data-lang="en" style="padding: 6px 12px; background: #edf2f7; border: none; border-radius: 4px; cursor: pointer;">英文测试</button>
                            <button class="quick-test-btn" data-text="你好，今天天气真不错。" data-lang="zh" style="padding: 6px 12px; background: #edf2f7; border: none; border-radius: 4px; cursor: pointer;">中文问候</button>
                            <button class="quick-test-btn" data-text="这是一个文本转语音系统的测试。" data-lang="zh" style="padding: 6px 12px; background: #edf2f7; border: none; border-radius: 4px; cursor: pointer;">中文测试</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // 添加遮罩层
    const overlay = document.createElement('div');
    overlay.id = 'ttsManagerOverlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        z-index: 2000;
    `;
    
    document.body.appendChild(overlay);
    document.body.appendChild(managerPanel);
    
    // 添加事件监听器
    setupTTSManagerEvents();
    
    // 初始化缓存统计
    updateCacheStats();
    
    // 初始化标签页
    setupTabSystem();
}

// 设置TTS管理器的事件监听器
function setupTTSManagerEvents() {
    // 关闭按钮
    document.getElementById('closeTTSManagerBtn').addEventListener('click', closeTTSManager);
    document.getElementById('ttsManagerOverlay').addEventListener('click', closeTTSManager);
    
    // 缓存管理
    document.getElementById('clearCacheBtn').addEventListener('click', async () => {
        if (confirm('确定要清空所有缓存的音频吗？此操作无法撤销。')) {
            await TTSWithCache.clearCache();
            showMessage('所有缓存已清空');
            updateCacheStats();
        }
    });
    
    document.getElementById('refreshCacheStatsBtn').addEventListener('click', updateCacheStats);
    
    // 设置保存
    document.getElementById('saveSettingsBtn').addEventListener('click', saveTTSSettings);
    
    // 语音测试
    document.getElementById('runTestBtn').addEventListener('click', runTTSManagerTest);
    
    // 快速测试按钮
    document.querySelectorAll('.quick-test-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const text = e.target.getAttribute('data-text');
            const lang = e.target.getAttribute('data-lang');
            
            document.getElementById('testTextArea').value = text;
            document.getElementById('testLanguage').value = lang;
            
            runTTSManagerTest();
        });
    });
    
    // 滑块实时更新显示值
    document.getElementById('ttsRateSlider').addEventListener('input', (e) => {
        document.getElementById('ttsRateValue').textContent = e.target.value;
    });
    
    document.getElementById('ttsPitchSlider').addEventListener('input', (e) => {
        document.getElementById('ttsPitchValue').textContent = e.target.value;
    });
    
    // 加载初始设置
    loadTTSSettings();
}

// 关闭TTS管理器
function closeTTSManager() {
    const panel = document.getElementById('ttsManagerPanel');
    const overlay = document.getElementById('ttsManagerOverlay');
    
    if (panel) panel.remove();
    if (overlay) overlay.remove();
}

// 更新缓存统计信息
async function updateCacheStats() {
    try {
        const stats = await TTSWithCache.getCacheStats();
        
        document.getElementById('cacheItemCount').textContent = stats.itemCount;
        document.getElementById('cacheUsedSpace').textContent = stats.formattedSize;
        document.getElementById('cacheTotalSpace').textContent = stats.formattedMaxSize;
        document.getElementById('cacheUsagePercent').textContent = stats.usagePercentage.toFixed(1) + '%';
        
        // 更新进度条
        const usageBar = document.getElementById('cacheUsageBar');
        usageBar.style.width = stats.usagePercentage + '%';
        
        // 根据使用情况变化颜色
        if (stats.usagePercentage > 80) {
            usageBar.style.backgroundColor = '#e53e3e'; // 红色
        } else if (stats.usagePercentage > 60) {
            usageBar.style.backgroundColor = '#ed8936'; // 橙色
        } else {
            usageBar.style.backgroundColor = '#3182ce'; // 蓝色
        }
    } catch (error) {
        console.error('获取缓存统计失败:', error);
    }
}

// 设置标签页系统
function setupTabSystem() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    const tabIndicator = document.querySelector('.tab-indicator');
    
    // 初始化指示器位置
    const activeTab = document.querySelector('.tab-button.active');
    if (activeTab && tabIndicator) {
        tabIndicator.style.left = activeTab.offsetLeft + 'px';
        tabIndicator.style.width = activeTab.offsetWidth + 'px';
    }
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.getAttribute('data-tab');
            
            // 激活当前标签按钮
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // 显示对应内容
            tabContents.forEach(content => {
                if (content.getAttribute('data-tab') === tabName) {
                    content.style.display = 'block';
                } else {
                    content.style.display = 'none';
                }
            });
            
            // 移动指示器
            if (tabIndicator) {
                tabIndicator.style.left = button.offsetLeft + 'px';
                tabIndicator.style.width = button.offsetWidth + 'px';
            }
        });
    });
}

// 保存TTS设置
function saveTTSSettings() {
    try {
        // 获取设置值
        const defaultEngine = document.getElementById('defaultTTSEngine').value;
        const autoCache = document.getElementById('autoCacheToggle').checked;
        const elevenLabsApiKey = document.getElementById('elevenLabsApiKey').value;
        const ttsRate = parseFloat(document.getElementById('ttsRateSlider').value);
        const ttsPitch = parseFloat(document.getElementById('ttsPitchSlider').value);
        
        // 创建设置对象
        const settings = {
            defaultEngine,
            autoCache,
            elevenLabsApiKey,
            rate: ttsRate,
            pitch: ttsPitch,
            lastUpdated: new Date().toISOString()
        };
        
        // 保存到localStorage
        if (currentUser && currentUser.id) {
            localStorage.setItem(`ttsSettings_${currentUser.id}`, JSON.stringify(settings));
        } else {
            localStorage.setItem('ttsSettings_guest', JSON.stringify(settings));
        }
        
        // 更新ElevenLabs API密钥
        if (elevenLabsApiKey && TTS_CONFIG && TTS_CONFIG.elevenlabs) {
            TTS_CONFIG.elevenlabs.apiKey = elevenLabsApiKey;
        }
        
        // 更新语音参数
        if (TTS_CONFIG) {
            // 更新各引擎的速率和音调设置
            if (TTS_CONFIG.enhancedBrowser && TTS_CONFIG.enhancedBrowser.settings) {
                TTS_CONFIG.enhancedBrowser.settings.english.rate = ttsRate;
                TTS_CONFIG.enhancedBrowser.settings.english.pitch = ttsPitch;
                TTS_CONFIG.enhancedBrowser.settings.chinese.rate = ttsRate;
                TTS_CONFIG.enhancedBrowser.settings.chinese.pitch = ttsPitch;
            }
            
            if (TTS_CONFIG.responsiveVoice && TTS_CONFIG.responsiveVoice.settings) {
                TTS_CONFIG.responsiveVoice.settings.rate = ttsRate;
                TTS_CONFIG.responsiveVoice.settings.pitch = ttsPitch;
            }
        }
        
        showMessage('TTS设置已保存');
    } catch (error) {
        console.error('保存TTS设置失败:', error);
        showMessage('保存设置失败');
    }
}

// 加载TTS设置
function loadTTSSettings() {
    try {
        // 确定设置的存储键
        const settingsKey = currentUser && currentUser.id 
            ? `ttsSettings_${currentUser.id}` 
            : 'ttsSettings_guest';
        
        // 从localStorage获取设置
        const storedSettings = localStorage.getItem(settingsKey);
        let settings = null;
        
        if (storedSettings) {
            settings = JSON.parse(storedSettings);
        }
        
        // 如果有有效设置，应用它们
        if (settings) {
            // 应用到UI
            if (settings.defaultEngine) {
                document.getElementById('defaultTTSEngine').value = settings.defaultEngine;
            }
            
            document.getElementById('autoCacheToggle').checked = settings.autoCache !== false;
            
            if (settings.elevenLabsApiKey) {
                document.getElementById('elevenLabsApiKey').value = settings.elevenLabsApiKey;
            }
            
            if (settings.rate) {
                const rateSlider = document.getElementById('ttsRateSlider');
                rateSlider.value = settings.rate;
                document.getElementById('ttsRateValue').textContent = settings.rate;
            }
            
            if (settings.pitch) {
                const pitchSlider = document.getElementById('ttsPitchSlider');
                pitchSlider.value = settings.pitch;
                document.getElementById('ttsPitchValue').textContent = settings.pitch;
            }
            
            // 应用ElevenLabs API密钥
            if (settings.elevenLabsApiKey && TTS_CONFIG && TTS_CONFIG.elevenlabs) {
                TTS_CONFIG.elevenlabs.apiKey = settings.elevenLabsApiKey;
            }
        }
    } catch (error) {
        console.error('加载TTS设置失败:', error);
    }
}

// 运行TTS测试
async function runTTSManagerTest() {
    const text = document.getElementById('testTextArea').value.trim();
    const lang = document.getElementById('testLanguage').value;
    const engine = document.getElementById('testTTSEngine').value;
    
    if (!text) {
        showMessage('请输入测试文本');
        return;
    }
    
    try {
        // 获取是否使用缓存
        const useCache = document.getElementById('autoCacheToggle').checked;
        
        showMessage(`正在测试 ${engine} 引擎...`);
        
        switch (engine) {
            case 'enhanced':
                await TTSWithCache.playEnhancedBrowserTTS(text, lang, useCache);
                break;
            case 'default':
                await TTSWithCache.playDefaultBrowserTTS(text, lang);
                break;
            case 'responsivevoice':
                await TTSWithCache.playResponsiveVoiceTTS(text, lang, useCache);
                break;
            case 'speechify':
                await playSpeechifyTTS(text, lang); // 使用原始函数
                break;
            case 'elevenlabs':
                await TTSWithCache.playElevenLabsTTS(text, lang, useCache);
                break;
            case 'baidu':
                // 使用百度TTS (原始函数)
                const gender = lang === 'en' ? (Math.random() > 0.5 ? 'male' : 'female') : 'female';
                await playBaiduTTS(text, gender);
                break;
        }
        
        showMessage('测试完成');
    } catch (error) {
        console.error('TTS测试失败:', error);
        showMessage(`测试失败: ${error.message}`);
    }
}

// 添加到全局CSS样式
function injectTTSManagerStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .tab-button.active {
            color: #3182ce;
        }
        
        @media (max-width: 768px) {
            #ttsManagerPanel {
                width: 95%;
                padding: 16px;
                max-height: 90vh;
            }
            
            .tabs-header {
                flex-wrap: wrap;
            }
            
            .tab-button {
                font-size: 14px;
                padding: 8px 12px !important;
            }
            
            .quick-test-btn {
                font-size: 12px;
                padding: 4px 8px !important;
            }
        }
    `;
    document.head.appendChild(style);
}

// 在DOM加载完成后初始化样式
document.addEventListener('DOMContentLoaded', injectTTSManagerStyles);

// 导出函数 (如果需要在其他地方使用)
window.createTTSManagerPanel = createTTSManagerPanel;
window.closeTTSManager = closeTTSManager;
// 兼容全局调用，供 main.js 按钮调用
window.showTTSManagerPanel = createTTSManagerPanel;
