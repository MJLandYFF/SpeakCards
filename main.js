// 在 main.js 的顶部或一个可访问的作用域
let currentBrowserUtterance = null;
let currentUser = null; // 初始化为null，表示未登录

// 获取主容器和登录容器，优先使用 index.html 里的 DOM 元素
let appContainer = document.getElementById('appContainer');
if (!appContainer) {
    appContainer = document.createElement('div');
    appContainer.id = 'appContainer';
    appContainer.style.display = 'none';
    document.body.appendChild(appContainer);
}

let loginScreenContainer = document.getElementById('loginScreenContainer');
if (!loginScreenContainer) {
    loginScreenContainer = document.createElement('div');
    loginScreenContainer.id = 'loginScreenContainer';
    loginScreenContainer.style.display = 'none';
    document.body.appendChild(loginScreenContainer);
}

// Key for storing user accounts in localStorage
const USER_ACCOUNTS_KEY = 'flashcardUserAccounts';

window.onerror = function(msg, url, line, col, error) {
    alert('JS错误: ' + msg + '\\n' + (error && error.stack ? error.stack : ''));
};

let messageBox; 
let flashcardGrid; 
// 顶部栏相关元素
const topBar = document.createElement('div');
topBar.className = 'top-bar';
const voiceSelect = document.createElement('select');
voiceSelect.id = 'voiceGenderSelect';
const categorySelect = document.createElement('select');
categorySelect.className = 'category-select';
categorySelect.style.marginLeft = '8px';
categorySelect.title = '适用场景';

// 用户相关的UI元素容器 (属于topBar)
const userActionsContainer = document.createElement('div');
userActionsContainer.className = 'user-actions-container';
userActionsContainer.style.display = 'flex';
userActionsContainer.style.alignItems = 'center';
userActionsContainer.style.flexWrap = 'wrap'; // 允许内容换行
userActionsContainer.style.justifyContent = 'flex-start'; // 换行后靠左对齐
userActionsContainer.style.gap = '8px'; // 设置元素间距，替代旧的 marginRight


function showMessage(message, duration = 3000) {
    if (!messageBox) return;
    messageBox.textContent = message;
    messageBox.style.display = 'block';
    setTimeout(() => {
        messageBox.style.display = 'none';
    }, duration);
}

// MOVED FUNCTIONS START
function handleWeChatLogin() {
    // 模拟微信登录
    const mockUserId = 'wechat_user_' + Date.now();
    const mockDisplayName = '微信用户' + mockUserId.substring(mockUserId.length - 4);
    currentUser = { id: mockUserId, displayName: mockDisplayName, provider: 'wechat' };
    
    try {
        localStorage.setItem('flashcardLoggedInUser', JSON.stringify(currentUser));
        
        showAppScreen(); // 显示应用主界面
        
        loadUserSettings(); 
        loadCustomWords(); 
        // setupCustomWordManagementUI(); // 已移除自定义单词功能，避免报错
        if (typeof updateCategoryDropdown === 'function') {
            updateCategoryDropdown();
        }
        renderFlashcards(categorySelect.value || '全部'); 
        showMessage(`欢迎，${currentUser.displayName}！`); // 在应用界面显示欢迎消息
    } catch (e) {
        console.error("Error saving user to localStorage:", e);
        showMessage('登录时发生错误。');
        currentUser = null; // 回滚状态
        // 可以在这里选择保留在登录页面或显示错误信息
    }
}

function handleLogout() {
    if (currentUser) {
        showMessage(`再见，${currentUser.displayName || currentUser.id}。`);
    }
    currentUser = null;
    localStorage.removeItem('flashcardLoggedInUser');
    customWords = [];
    // const customWordManagementDiv = document.getElementById('customWordManagementContainer');
    // if (customWordManagementDiv) {
    //     customWordManagementDiv.innerHTML = '';
    // }
    if (typeof updateCategoryDropdown === 'function') {
        updateCategoryDropdown();
    }
    loadUserSettings();
    showLoginScreen();
}
// MOVED FUNCTIONS END

// --- Learning Progress Placeholder ---
let userProgress = {
    masteredWords: [], // 存储已掌握单词的ID或单词本身
    learningWords: {}  // 存储正在学习的单词及其状态，例如 { wordId: { status: 'learning', lastReview: 'date' } }
};

function loadUserProgress() {
    if (currentUser && currentUser.id) {
        const progressKey = 'userProgress_' + currentUser.id;
        const storedProgress = localStorage.getItem(progressKey);
        if (storedProgress) {
            try {
                userProgress = JSON.parse(storedProgress);
            } catch (e) {
                console.error("Error parsing user progress:", e);
                userProgress = { masteredWords: [], learningWords: {} }; // 重置为默认
            }
        } else {
            userProgress = { masteredWords: [], learningWords: {} }; // 新用户的默认进度
        }
    } else {
        // 游客的进度（如果需要）
        userProgress = { masteredWords: [], learningWords: {} };
    }
    // console.log("Loaded progress for user:", currentUser ? currentUser.id : 'guest', userProgress);
}

function saveUserProgress() {
    if (currentUser && currentUser.id) {
        try {
            localStorage.setItem(`userProgress_${currentUser.id}`, JSON.stringify(userProgress));
            // console.log("Saved progress for user:", currentUser.id);
        } catch (e) {
            console.error("Error saving user progress:", e);
        }
    }
}
// --- End Learning Progress Placeholder ---

// --- Password Authentication Functions ---
function getStoredUserAccounts() {
    const accounts = localStorage.getItem(USER_ACCOUNTS_KEY);
    return accounts ? JSON.parse(accounts) : {};
}

function saveStoredUserAccounts(accounts) {
    localStorage.setItem(USER_ACCOUNTS_KEY, JSON.stringify(accounts));
}

function handlePasswordRegister() {
    const usernameInput = document.getElementById('usernameInput');
    const passwordInput = document.getElementById('passwordInput');
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    if (!username || !password) {
        showMessage('用户名和密码不能为空。', 3000);
        return;
    }

    const accounts = getStoredUserAccounts();
    if (accounts[username]) {
        showMessage('用户名已存在，请尝试其他用户名。', 3000);
        return;
    }

    // IMPORTANT: Storing password in plaintext. This is NOT secure for real applications.
    accounts[username] = { password: password }; 
    saveStoredUserAccounts(accounts);
    showMessage('注册成功！现在您可以使用账号密码登录了。', 3000);
    usernameInput.value = ''; // Clear fields
    passwordInput.value = '';
}

function handlePasswordLogin() {
    const usernameInput = document.getElementById('usernameInput');
    const passwordInput = document.getElementById('passwordInput');
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    if (!username || !password) {
        showMessage('请输入用户名和密码。', 3000);
        return;
    }

    const accounts = getStoredUserAccounts();
    if (!accounts[username]) {
        showMessage('用户不存在，请先注册。', 3000);
        return;
    }

    // IMPORTANT: Comparing plaintext password. NOT secure.
    if (accounts[username].password === password) {
        currentUser = { id: username, displayName: username, provider: 'password' };
        try {
            localStorage.setItem('flashcardLoggedInUser', JSON.stringify(currentUser));
            
            showAppScreen();
            loadUserSettings();
            loadCustomWords();
            // setupCustomWordManagementUI(); // 已移除自定义单词功能，避免报错
            if (typeof updateCategoryDropdown === 'function') {
                updateCategoryDropdown();
            }
            renderFlashcards(categorySelect.value || '全部');
            showMessage(`欢迎回来，${currentUser.displayName}！`);
        } catch (e) {
            console.error("Error saving user to localStorage:", e);
            showMessage('登录时发生错误。');
            currentUser = null;
        }
    } else {
        showMessage('密码错误，请重试。', 3000);
    }
}
// --- End Password Authentication Functions ---


function showLoginScreen() {
    appContainer.style.display = 'none';
    loginScreenContainer.style.display = 'flex';
    loginScreenContainer.innerHTML = ''; // Clear previous content

    loginScreenContainer.style.flexDirection = 'column';
    loginScreenContainer.style.alignItems = 'center';
    loginScreenContainer.style.justifyContent = 'center';
    loginScreenContainer.style.minHeight = 'calc(100vh - 40px)';
    loginScreenContainer.style.textAlign = 'center';
    loginScreenContainer.style.padding = '20px';
    loginScreenContainer.style.boxSizing = 'border-box';
    loginScreenContainer.style.backgroundColor = '#f0f2f5';

    loginScreenContainer.style.position = 'relative';
    loginScreenContainer.style.zIndex = '10';

    const welcomeMessage = document.createElement('h1');
    welcomeMessage.textContent = '欢迎使用 SpeakCards!';
    welcomeMessage.style.fontSize = '2.8rem';
    welcomeMessage.style.color = '#2D3748';
    welcomeMessage.style.marginBottom = '30px'; // Adjusted margin
    welcomeMessage.style.fontWeight = 'bold';
    loginScreenContainer.appendChild(welcomeMessage);

    // Username/Password Login and Registration Area
    const accountAuthContainer = document.createElement('div');
    accountAuthContainer.style.marginBottom = '25px'; // Space before WeChat button
    accountAuthContainer.style.width = '100%';
    accountAuthContainer.style.maxWidth = '320px'; // Limit width of input fields

    const usernameInput = document.createElement('input');
    usernameInput.type = 'text';
    usernameInput.placeholder = '用户名';
    usernameInput.id = 'usernameInput';
    usernameInput.className = 'login-input'; // For styling

    const passwordInput = document.createElement('input');
    passwordInput.type = 'password';
    passwordInput.placeholder = '密码';
    passwordInput.id = 'passwordInput';
    passwordInput.className = 'login-input'; // For styling

    const loginButton = document.createElement('button');
    loginButton.textContent = '登录';
    loginButton.id = 'passwordLoginButton';
    loginButton.className = 'auth-button simple-button'; // For styling

    const registerButton = document.createElement('button');
    registerButton.textContent = '注册';
    registerButton.id = 'registerButton';
    registerButton.className = 'auth-button simple-button secondary'; // For styling (e.g., different color)
    
    // Add event listeners for new buttons
    loginButton.addEventListener('click', handlePasswordLogin);
    registerButton.addEventListener('click', handlePasswordRegister);

    accountAuthContainer.appendChild(usernameInput);
    accountAuthContainer.appendChild(passwordInput);
    accountAuthContainer.appendChild(loginButton);
    accountAuthContainer.appendChild(registerButton);
    loginScreenContainer.appendChild(accountAuthContainer);

    // Separator (optional)
    const separator = document.createElement('div');
    separator.textContent = '或';
    separator.style.margin = '15px 0';
    separator.style.color = '#718096'; // A softer color
    loginScreenContainer.appendChild(separator);

    const weChatLoginButton = document.createElement('button');
    weChatLoginButton.textContent = '微信登录 (模拟)';
    weChatLoginButton.className = 'login-button simple-button';
    weChatLoginButton.style.padding = '18px 35px';
    weChatLoginButton.style.fontSize = '1.25rem';
    weChatLoginButton.style.backgroundColor = '#07C160';
    weChatLoginButton.style.color = 'white';
    weChatLoginButton.style.border = 'none';
    weChatLoginButton.style.borderRadius = '10px';
    weChatLoginButton.style.cursor = 'pointer';
    weChatLoginButton.style.boxShadow = '0 4px 14px 0 rgba(7, 193, 96, 0.3)'; // Shadow with button color
    weChatLoginButton.style.transition = 'background-color 0.3s ease, transform 0.2s ease, box-shadow 0.3s ease';
    
    weChatLoginButton.onmouseover = () => {
        weChatLoginButton.style.backgroundColor = '#06A853';
        weChatLoginButton.style.boxShadow = '0 6px 18px 0 rgba(7, 193, 96, 0.4)';
    };
    weChatLoginButton.onmouseout = () => {
        weChatLoginButton.style.backgroundColor = '#07C160';
        weChatLoginButton.style.boxShadow = '0 4px 14px 0 rgba(7, 193, 96, 0.3)';
    };
    weChatLoginButton.onmousedown = () => {
        weChatLoginButton.style.transform = 'scale(0.98)';
    };
    weChatLoginButton.onmouseup = () => {
        weChatLoginButton.style.transform = 'scale(1)';
    };

    weChatLoginButton.addEventListener('click', handleWeChatLogin);

    // loginScreenContainer.appendChild(welcomeMessage); // Moved up
    loginScreenContainer.appendChild(weChatLoginButton); // WeChat button is now after separator
}

function showAppScreen() {
    loginScreenContainer.style.display = 'none';
    appContainer.style.display = 'block';
}

function updateUserDisplay() {
    userActionsContainer.innerHTML = ''; // 清空旧内容

    if (currentUser && currentUser.id) {
        const userNameDisplay = document.createElement('div');
        userNameDisplay.className = 'user-name-display';
        userNameDisplay.textContent = '用户: ' + (currentUser.displayName || currentUser.id);
        userNameDisplay.style.color = '#4A5568';
        userNameDisplay.style.fontWeight = '500';
        userNameDisplay.style.cursor = 'pointer'; // Make username look clickable

        userActionsContainer.appendChild(userNameDisplay);

        // Logout button is initially hidden
        const logoutButton = document.createElement('button');
        logoutButton.textContent = '退出登录';
        logoutButton.className = 'logout-button simple-button';
        logoutButton.style.display = 'none'; // Initially hidden
        logoutButton.addEventListener('click', handleLogout);
        userActionsContainer.appendChild(logoutButton);

        // Event listener for userNameDisplay to toggle logoutButton visibility
        let logoutVisible = false;
        userNameDisplay.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevent click from bubbling up if necessary
            logoutVisible = !logoutVisible;
            logoutButton.style.display = logoutVisible ? 'inline-block' : 'none';
        });

        // Optional: Clicking anywhere else on the page hides the logout button
        document.addEventListener('click', (event) => {
            if (logoutVisible && !userActionsContainer.contains(event.target)) {
                logoutVisible = false;
                logoutButton.style.display = 'none';
            }
        }, true); // Use capture phase to catch clicks early

    }
    // No 'else' needed here as the login button is on the dedicated login screen
}


function loadUserSettings() {
    const storedUser = localStorage.getItem('flashcardLoggedInUser');
    if (storedUser) {
        try {
            currentUser = JSON.parse(storedUser);
        } catch (e) {
            console.error("Error parsing stored user:", e);
            localStorage.removeItem('flashcardLoggedInUser'); // 清除损坏的数据
            currentUser = null;
        }
    } else {
        currentUser = null;
    }

    updateUserDisplay(); // Update top bar user info (if app screen is active)

    if (currentUser && currentUser.id) {
        const voiceKey = 'userSettings_' + currentUser.id + '_voice';
        const categoryKey = 'userSettings_' + currentUser.id + '_category';

        const storedVoice = localStorage.getItem(voiceKey);
        if (storedVoice && voiceSelect.value !== storedVoice) { // Check if update is needed
            voiceSelect.value = storedVoice;
        }

        const storedCategory = localStorage.getItem(categoryKey);
        if (storedCategory && categorySelect.value !== storedCategory) { // Check if update is needed
            categorySelect.value = storedCategory;
        }
        loadUserProgress(); // 加载用户学习进度
        loadCustomWords(); // 加载自定义单词
    } else {
        // For logged-out state, or if settings are not found,
        // set defaults for select elements if they are part of appContainer.
        // These might be set before appContainer is hidden, or if appContainer is shown for a guest.
        if (voiceSelect.options.length > 0 && voiceSelect.value !== voiceSelect.options[0].value) {
             // voiceSelect.value = voiceSelect.options[0].value; // Or a specific default
        }
        if (categorySelect.options.length > 0 && categorySelect.value !== categorySelect.options[0].value) {
            // categorySelect.value = categorySelect.options[0].value; // Or a specific default like '全部'
        }
        userProgress = { masteredWords: [], learningWords: {} }; // Reset progress for guest/logged-out
        customWords = []; // Reset custom words for guest/logged-out
    }
}

function saveUserSettings() {
    if (currentUser && currentUser.id) {
        if (voiceSelect) {
            localStorage.setItem('userSettings_' + currentUser.id + '_voice', voiceSelect.value);
        }
        if (categorySelect) {
            localStorage.setItem('userSettings_' + currentUser.id + '_category', categorySelect.value);
        }
    }
    // Not saving for guest in this model, as settings are tied to logged-in user.
}

// --- Custom Word List Management ---
let customWords = []; // Holds custom words for the current user

function loadCustomWords() {
    if (currentUser && currentUser.id) {
        const customWordsKey = `customWords_${currentUser.id}`;
        const storedCustomWords = localStorage.getItem(customWordsKey);
        if (storedCustomWords) {
            try {
                customWords = JSON.parse(storedCustomWords);
            } catch (e) {
                console.error("Error parsing custom words:", e);
                customWords = [];
            }
        } else {
            customWords = [];
        }
    } else {
        customWords = []; // No custom words for guest/logged-out
    }
}

function saveCustomWords() {
    if (currentUser && currentUser.id) {
        try {
            localStorage.setItem(`customWords_${currentUser.id}`, JSON.stringify(customWords));
        } catch (e) {
            console.error("Error saving custom words:", e);
        }
    }
}

function addCustomWord(word, translation, pronunciation = '') {
    if (!word || !translation) {
        showMessage("English word and Chinese translation are required.", 3000);
        return false;
    }
    // Check for duplicates
    if (customWords.some(cw => cw.word.toLowerCase() === word.toLowerCase())) {
        showMessage(`Word "${word}" already exists in your custom list.`, 3000);
        return false;
    }
    const newWord = {
        id: `custom_${Date.now()}_${word.replace(/\\s+/g, '_')}`, // Unique ID
        word: word,
        chinese: translation,
        pronunciation: pronunciation,
        category: "Custom", // Assign a special category
        isCustom: true
    };
    customWords.push(newWord);
    saveCustomWords();
    showMessage(`"${word}" added to your custom list.`, 2000);
    // If 'Custom' category is active, re-render
    if (categorySelect.value === "Custom") {
        renderFlashcards("Custom");
    }
    return true;
}

function clearCustomWords() {
    if (confirm("Are you sure you want to clear all your custom words? This cannot be undone.")) {
        customWords = [];
        saveCustomWords();
        showMessage("Custom word list cleared.", 2000);
        if (categorySelect.value === "Custom") {
            renderFlashcards("Custom"); // Re-render if viewing custom words
        }
    }
}

function setupCustomWordManagementUI() {
    const customWordManagementDiv = document.getElementById('customWordManagementContainer');
    if (!customWordManagementDiv) {
        console.error("customWordManagementContainer not found in HTML.");
        return;
    }
    customWordManagementDiv.innerHTML = ''; // Clear previous content

    const formContainer = document.createElement('div');
    formContainer.id = 'addWordFormContainer';

    const wordInput = document.createElement('input');
    wordInput.type = 'text';
    wordInput.placeholder = 'English Word';
    wordInput.id = 'customWordInput';

    const translationInput = document.createElement('input');
    translationInput.type = 'text';
    translationInput.placeholder = 'Chinese Translation';
    translationInput.id = 'customTranslationInput';

    const pronunciationInput = document.createElement('input');
    pronunciationInput.type = 'text';
    pronunciationInput.placeholder = 'Pronunciation (Optional)';
    pronunciationInput.id = 'customPronunciationInput';

    const addButton = document.createElement('button');
    addButton.textContent = 'Add Word';
    addButton.className = 'simple-button'; // Reuse existing button style if desired
    addButton.addEventListener('click', () => {
        const word = wordInput.value.trim();
        const translation = translationInput.value.trim();
        const pronunciation = pronunciationInput.value.trim();
        if (addCustomWord(word, translation, pronunciation)) {
            wordInput.value = '';
            translationInput.value = '';
            pronunciationInput.value = '';
        }
    });

    formContainer.appendChild(wordInput);
    formContainer.appendChild(translationInput);
    formContainer.appendChild(pronunciationInput);
    formContainer.appendChild(addButton);
    customWordManagementDiv.appendChild(formContainer);

    const clearButton = document.createElement('button');
    clearButton.textContent = 'Clear Custom List';
    clearButton.className = 'clear-custom-list-button simple-button';
    clearButton.addEventListener('click', clearCustomWords);
    customWordManagementDiv.appendChild(clearButton);
}

// --- End Custom Word List Management ---

// --- Learning Progress ---
// userProgress, loadUserProgress, saveUserProgress are already defined (MOVED EARLIER)

function markWordAsMastered(wordId, cardElement) {
    const wordIsMastered = userProgress.masteredWords.includes(wordId);
    const masterButton = cardElement.querySelector('.master-button');

    if (wordIsMastered) {
        userProgress.masteredWords = userProgress.masteredWords.filter(id => id !== wordId);
        if (masterButton) masterButton.textContent = '标记为已掌握';
        cardElement.classList.remove('is-mastered');
        showMessage('已从掌握列表移除。', 1500);
    } else {
        userProgress.masteredWords.push(wordId);
        if (masterButton) masterButton.textContent = '已掌握';
        cardElement.classList.add('is-mastered');
        showMessage('已标记为掌握！', 1500);
    }
    saveUserProgress();
}
// --- End Learning Progress ---


// 渲染闪卡主函数，集成 speakText
function renderFlashcards(category = '全部') {
    const grid = document.getElementById('flashcardGrid');
    if (!grid) return;
    grid.innerHTML = '';

    // 获取数据源
    let data = [];
    if (category === 'Custom') {
        data = customWords;
    } else if (window.flashcardData) {
        data = category === '全部' ? window.flashcardData : window.flashcardData.filter(w => w.category === category);
    }

    if (!data || data.length === 0) {
        document.getElementById('flashcardGridMessage').style.display = 'block';
        document.getElementById('flashcardGridMessage').textContent = '本类别下暂无单词。';
        return;
    } else {
        document.getElementById('flashcardGridMessage').style.display = 'none';
    }

    data.forEach((wordObj, idx) => {
        const cardContainer = document.createElement('div');
        cardContainer.className = 'flashcard-container';

        // 卡片本体
        const card = document.createElement('div');
        card.className = 'flashcard';

        // 卡片正面
        const cardFront = document.createElement('div');
        cardFront.className = 'flashcard-front';
        cardFront.innerHTML = `
            <div class="word">${wordObj.word}</div>
            <div class="pronunciation">${wordObj.pronunciation || ''}</div>
        `;
        // 发音按钮
        const speakBtn = document.createElement('button');
        speakBtn.className = 'speak-btn simple-button';
        speakBtn.textContent = '🔊';
        speakBtn.title = '发音';
        speakBtn.onclick = (e) => { e.stopPropagation(); speakText(wordObj.word, wordObj.lang || 'en'); };
        cardFront.appendChild(speakBtn);

        // 标记掌握按钮
        const masterBtn = document.createElement('button');
        masterBtn.className = 'master-button simple-button';
        masterBtn.textContent = userProgress.masteredWords.includes(wordObj.id) ? '已掌握' : '标记为已掌握';
        masterBtn.onclick = (e) => { e.stopPropagation(); markWordAsMastered(wordObj.id, cardContainer); };
        cardFront.appendChild(masterBtn);

        // 序号
        const indexDiv = document.createElement('div');
        indexDiv.className = 'card-index';
        indexDiv.textContent = idx + 1;
        cardFront.appendChild(indexDiv);

        // 卡片背面
        const cardBack = document.createElement('div');
        cardBack.className = 'flashcard-back';
        cardBack.innerHTML = `<div class="chinese-translation">${wordObj.chinese}</div>`;

        // 序号（背面也显示）
        const indexDivBack = document.createElement('div');
        indexDivBack.className = 'card-index';
        indexDivBack.textContent = idx + 1;
        cardBack.appendChild(indexDivBack);

        // 组装卡片
        card.appendChild(cardFront);
        card.appendChild(cardBack);
        cardContainer.appendChild(card);
        grid.appendChild(cardContainer);

        // 翻转动画逻辑
        cardContainer.addEventListener('click', function(e) {
            if (e.target.closest('.speak-btn') || e.target.closest('.master-button')) return;
            card.classList.toggle('flipped');
        });

        // 已掌握样式
        if (userProgress.masteredWords.includes(wordObj.id)) {
            cardContainer.classList.add('is-mastered');
        }
    });
}

// 智能发音主入口，自动选择TTS方案
async function speakText(text, lang = 'en') {
    if (!text) return;
    try {
        // 优先使用增强浏览器TTS
        if (window.TTSWithCache && TTSWithCache.playEnhancedBrowserTTS) {
            const ok = await TTSWithCache.playEnhancedBrowserTTS(text, lang, true);
            if (ok) return;
        }
        // 兼容直接引入 tts-cache.js 的情况
        if (typeof playEnhancedBrowserTTS === 'function') {
            const ok = await playEnhancedBrowserTTS(text, lang, true);
            if (ok) return;
        }
        // 尝试 ResponsiveVoice
        if (typeof responsiveVoice !== 'undefined' && responsiveVoice.speak) {
            let spoken = false;
            try {
                responsiveVoice.speak(text, lang === 'zh' ? 'Chinese Female' : 'US English Female', {
                    onend: function() { spoken = true; },
                    onerror: function() { spoken = false; }
                });
                // 简单延迟判断是否发音
                await new Promise(resolve => setTimeout(resolve, 800));
                if (spoken) return;
            } catch (e) { /* 降级 */ }
        }
        // 尝试 ElevenLabs（需配置API密钥）
        if (typeof playElevenLabsTTS === 'function') {
            const ok = await playElevenLabsTTS(text, lang);
            if (ok) return;
        }
        // 最后兜底：浏览器原生TTS
        if (typeof speechSynthesis !== 'undefined') {
            try {
                const utter = new SpeechSynthesisUtterance(text);
                utter.lang = lang === 'zh' ? 'zh-CN' : 'en-US';
                let spoken = false;
                utter.onend = function() { spoken = true; };
                utter.onerror = function() { spoken = false; };
                speechSynthesis.speak(utter);
                await new Promise(resolve => setTimeout(resolve, 800));
                if (spoken) return;
            } catch (e) { /* 降级 */ }
        }
        showMessage('未检测到可用的语音合成服务');
    } catch (err) {
        console.error('speakText error:', err);
        showMessage('发音失败：' + (err.message || err));
    }
}

// 保证 speakText 全局可用
window.speakText = speakText;

// ElevenLabs TTS (免费版)
async function playElevenLabsTTS(text, lang = 'zh') {
    try {
        const config = typeof TTS_CONFIG !== 'undefined' ? TTS_CONFIG.elevenlabs : null;
        if (!config || config.apiKey === 'YOUR_FREE_API_KEY') {
            // 不提示，不抛错，直接return false
            return false;
        }
        showMessage('正在使用 ElevenLabs 语音...');
        const voiceId = lang === 'en' 
            ? config.voices.english.female 
            : config.voices.chinese.female;
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'xi-api-key': config.apiKey
                },
                body: JSON.stringify({
                    text: text,
                    voice: voiceId,
                    model_id: config.modelId || 'eleven_multilingual_v1',
                    speed: config.speed || 1.0,
                    stability: config.stability || 0.75,
                    warmth: config.warmth || 0.75
                })
            }
        );
        if (!response.ok) {
            return false;
        }
        const data = await response.json();
        if (data && data.audio) {
            try {
                const audio = new Audio(data.audio);
                await audio.play();
                return true;
            } catch (e) {
                return false;
            }
        } else {
            return false;
        }
    } catch (error) {
        return false;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    try {
        console.log('[SpeakCards] DOMContentLoaded');
        // 主容器
        let domAppContainer = document.getElementById('appContainer');
        if (!domAppContainer) {
            domAppContainer = document.createElement('div');
            domAppContainer.id = 'appContainer';
            domAppContainer.style.display = 'none';
            document.body.appendChild(domAppContainer);
        }
        // 顶部栏
        if (!topBar.parentNode) {
            domAppContainer.insertBefore(topBar, domAppContainer.firstChild);
        }
        if (!userActionsContainer.parentNode) {
            topBar.appendChild(userActionsContainer);
        }
        if (!voiceSelect.parentNode) {
            topBar.appendChild(voiceSelect);
        }
        if (!categorySelect.parentNode) {
            topBar.appendChild(categorySelect);
        }
        // 消息框
        messageBox = document.getElementById('messageBox');
        if (!messageBox) {
            messageBox = document.createElement('div');
            messageBox.id = 'messageBox';
            messageBox.className = 'message-box';
            messageBox.style.display = 'none';
            domAppContainer.appendChild(messageBox);
        }
        // 闪卡区
        flashcardGrid = document.getElementById('flashcardGrid');
        if (!flashcardGrid) {
            flashcardGrid = document.createElement('div');
            flashcardGrid.id = 'flashcardGrid';
            flashcardGrid.className = 'flashcard-grid';
            domAppContainer.appendChild(flashcardGrid);
        }
        // 登录界面容器
        if (!loginScreenContainer.parentNode) {
            document.body.appendChild(loginScreenContainer);
        }
        // 判断登录状态
        const storedUser = localStorage.getItem('flashcardLoggedInUser');
        if (storedUser) {
            try {
                currentUser = JSON.parse(storedUser);
                showAppScreen();
                loadUserSettings();
                loadCustomWords();
                // setupCustomWordManagementUI(); // 已移除自定义单词功能，避免报错
                if (typeof updateCategoryDropdown === 'function') {
                    updateCategoryDropdown();
                }
                renderFlashcards(categorySelect.value || '全部');
            } catch (e) {
                console.error('[SpeakCards] 用户数据解析失败', e);
                currentUser = null;
                showLoginScreen();
            }
        } else {
            showLoginScreen();
        }
        // 移除自定义单词管理UI
        const customWordManagementDiv = document.getElementById('customWordManagementContainer');
        if (customWordManagementDiv) {
            customWordManagementDiv.style.display = 'none';
        }
        console.log('[SpeakCards] 页面初始化完成');
    } catch (err) {
        console.error('[SpeakCards] 页面初始化异常', err);
        alert('页面初始化异常：' + err.message);
    }
});

// 填充分类下拉框
function updateCategoryDropdown() {
    categorySelect.innerHTML = '';
    const categories = new Set();
    if (window.flashcardData) {
        window.flashcardData.forEach(w => categories.add(w.category));
    }
    // 保证“全部”始终存在
    const allOption = document.createElement('option');
    allOption.value = '全部';
    allOption.textContent = '全部';
    categorySelect.appendChild(allOption);
    Array.from(categories).sort().forEach(cat => {
        if (cat && cat !== '全部') {
            const opt = document.createElement('option');
            opt.value = cat;
            opt.textContent = cat;
            categorySelect.appendChild(opt);
        }
    });
    // 选中当前值
    if (categorySelect.value) {
        categorySelect.value = categorySelect.value;
    } else {
        categorySelect.value = '全部';
    }
}

// 在主界面初始化和登录后调用 updateCategoryDropdown 并监听下拉框变化
document.addEventListener('DOMContentLoaded', function() {
    // ...existing code...
    // 更新分类下拉框
    updateCategoryDropdown();

    // 监听分类下拉框变化
    categorySelect.addEventListener('change', function() {
        const selectedCategory = categorySelect.value;
        renderFlashcards(selectedCategory);
        saveUserSettings(); // 保存用户设置（当前选择的分类）
    });
    // ...existing code...
});
