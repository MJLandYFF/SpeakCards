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
async function handleWeChatLogin() {
    // 模拟微信登录
    const mockUserId = 'wechat_user_' + Date.now();
    const mockDisplayName = '微信用户' + mockUserId.substring(mockUserId.length - 4);
    currentUser = { id: mockUserId, displayName: mockDisplayName, provider: 'wechat' };
    
    try {
        localStorage.setItem('flashcardLoggedInUser', JSON.stringify(currentUser));
        
        showAppScreen(); // 显示应用主界面
        
        await loadUserSettings(); 
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

async function handleLogout() {
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
    await loadUserSettings();
    showLoginScreen();
}
// MOVED FUNCTIONS END

// --- Learning Progress Placeholder ---
let userProgress = {
    masteredWords: [], // 存储已掌握单词的ID或单词本身
    learningWords: {}  // 存储正在学习的单词及其状态，例如 { wordId: { status: 'learning', lastReview: 'date' } }
};

async function loadUserProgress() {
    if (currentUser && currentUser.id) {
        let progressLoaded = false;
        
        // 对于密码登录用户，优先尝试从后端加载
        if (currentUser.provider === 'password') {
            try {
                const response = await fetch('/api/get-progress', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: currentUser.id })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.progress) {
                        userProgress = data.progress;
                        if (userProgress.masteredWords) {
                            userProgress.masteredWords = userProgress.masteredWords.filter(id => !!id);
                        }
                        progressLoaded = true;
                        console.log("Loaded progress from backend for user:", currentUser.id);
                    }
                }
            } catch (e) {
                console.log("Failed to load progress from backend, falling back to localStorage:", e);
            }
        }
        
        // 如果后端加载失败或用户不是密码登录，则从localStorage加载
        if (!progressLoaded) {
            const progressKey = 'userProgress_' + currentUser.id;
            const storedProgress = localStorage.getItem(progressKey);
            if (storedProgress) {
                try {
                    userProgress = JSON.parse(storedProgress);
                    if (userProgress.masteredWords) {
                        userProgress.masteredWords = userProgress.masteredWords.filter(id => !!id);
                    }
                    console.log("Loaded progress from localStorage for user:", currentUser.id);
                } catch (e) {
                    console.error("Error parsing user progress:", e);
                    userProgress = { masteredWords: [], learningWords: {} }; // 重置为默认
                }
            } else {
                userProgress = { masteredWords: [], learningWords: {} }; // 新用户的默认进度
            }
        }
    } else {
        // 游客的进度（如果需要）
        userProgress = { masteredWords: [], learningWords: {} };
    }
}

async function saveUserProgress() {
    if (currentUser && currentUser.id) {
        // 清理无效的单词ID
        if (userProgress.masteredWords) {
            userProgress.masteredWords = userProgress.masteredWords.filter(id => !!id);
        }
        
        // 首先保存到localStorage（本地备份）
        try {
            localStorage.setItem(`userProgress_${currentUser.id}`, JSON.stringify(userProgress));
            console.log("Saved progress to localStorage for user:", currentUser.id);
        } catch (e) {
            console.error("Error saving user progress to localStorage:", e);
        }
        
        // 如果用户是通过密码登录的，则尝试保存到后端
        if (currentUser.provider === 'password') {
            try {
                await fetch('/api/save-progress', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: currentUser.id, progress: userProgress })
                });
                console.log("Saved progress to backend for user:", currentUser.id);
            } catch (e) {
                console.error('保存进度到后端失败:', e);
                // 后端保存失败时不显示错误消息，因为本地已经保存了
            }
        }
    }
}
// --- End Learning Progress Placeholder ---

// --- Password Authentication Functions (API版) ---
async function handlePasswordRegister() {
    const usernameInput = document.getElementById('usernameInput');
    const passwordInput = document.getElementById('passwordInput');
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();
    
    // 验证手机号格式
    if (!username || !password) {
        showMessage('手机号和密码不能为空。', 3000);
        return;
    }
    
    // 验证手机号是否为11位数字
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(username)) {
        showMessage('请输入正确的11位手机号，格式如：13812345678', 3000);
        return;
    }
    
    // 验证密码长度
    if (password.length < 6) {
        showMessage('密码至少需要6位字符。', 3000);
        return;
    }
    
    try {
        const res = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        if (res.status === 409) {
            showMessage('该手机号已被注册，请尝试其他手机号。', 3000);
            return;
        }
        if (!res.ok) {
            showMessage('注册失败，请重试。', 3000);
            return;
        }
        showMessage('注册成功！现在您可以使用手机号和密码登录了。', 3000);
        usernameInput.value = '';
        passwordInput.value = '';
    } catch (e) {
        showMessage('注册失败：' + (e.message || e), 3000);
    }
}

async function handlePasswordLogin() {
    const usernameInput = document.getElementById('usernameInput');
    const passwordInput = document.getElementById('passwordInput');
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();
    // 验证手机号和密码
    if (!username || !password) {
        showMessage('请输入手机号和密码。', 3000);
        return;
    }
    // 验证手机号格式
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(username)) {
        showMessage('请输入正确的11位手机号。', 3000);
        return;
    }
    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        if (res.status === 401) {
            showMessage('手机号或密码错误。', 3000);
            return;
        }
        if (!res.ok) {
            showMessage('登录失败，请重试。', 3000);
            return;
        }
        const data = await res.json();
        currentUser = { id: data.user.username, displayName: data.user.username, provider: 'password' };
        userProgress = data.user.progress || { masteredWords: [], learningWords: {}, scene: '全部', voice: 'default' };
        if (userProgress.masteredWords) {
            userProgress.masteredWords = userProgress.masteredWords.filter(id => !!id);
        }        localStorage.setItem('flashcardLoggedInUser', JSON.stringify(currentUser));
        showAppScreen();
        await loadUserSettings();
        loadCustomWords();
        renderFlashcards(window.selectedScene || '全部');
        showMessage(`欢迎回来，${currentUser.displayName}！`);
    } catch (e) {
        showMessage('登录失败：' + (e.message || e), 3000);
    }
}

// --- End Password Authentication Functions (API版) ---


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
    loginScreenContainer.appendChild(welcomeMessage);    // Username/Password Login and Registration Area
    const accountAuthContainer = document.createElement('div');
    accountAuthContainer.style.marginBottom = '25px'; // Space before WeChat button
    accountAuthContainer.style.width = '100%';
    accountAuthContainer.style.maxWidth = '320px'; // Limit width of input fields

    const usernameInput = document.createElement('input');
    usernameInput.type = 'tel';
    usernameInput.placeholder = '手机号（11位）';
    usernameInput.id = 'usernameInput';
    usernameInput.className = 'login-input'; // For styling
    usernameInput.maxLength = 11;
    usernameInput.pattern = '[0-9]{11}';

    // 密码输入框容器（用于添加眼睛图标）
    const passwordContainer = document.createElement('div');
    passwordContainer.className = 'password-input-container';
    passwordContainer.style.position = 'relative';
    passwordContainer.style.width = '100%';

    const passwordInput = document.createElement('input');
    passwordInput.type = 'password';
    passwordInput.placeholder = '密码';
    passwordInput.id = 'passwordInput';
    passwordInput.className = 'login-input'; // For styling
    passwordInput.style.paddingRight = '45px'; // 为眼睛图标留出空间

    // 密码可见性切换按钮
    const passwordToggle = document.createElement('button');
    passwordToggle.type = 'button';
    passwordToggle.className = 'password-toggle';
    passwordToggle.style.position = 'absolute';
    passwordToggle.style.right = '10px';
    passwordToggle.style.top = '50%';
    passwordToggle.style.transform = 'translateY(-50%)';
    passwordToggle.style.background = 'none';
    passwordToggle.style.border = 'none';
    passwordToggle.style.cursor = 'pointer';
    passwordToggle.style.color = '#718096';
    passwordToggle.style.fontSize = '18px';
    passwordToggle.innerHTML = '👁️';
    passwordToggle.title = '显示/隐藏密码';

    // 切换密码可见性
    passwordToggle.addEventListener('click', function() {
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            passwordToggle.innerHTML = '🙈';
        } else {
            passwordInput.type = 'password';
            passwordToggle.innerHTML = '👁️';
        }
    });

    passwordContainer.appendChild(passwordInput);
    passwordContainer.appendChild(passwordToggle);

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
    registerButton.addEventListener('click', handlePasswordRegister);    accountAuthContainer.appendChild(usernameInput);
    accountAuthContainer.appendChild(passwordContainer);
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
    
    // 创建用户信息容器（左侧）
    const userInfoContainer = document.createElement('div');
    userInfoContainer.className = 'user-info-container';
    userInfoContainer.style.display = 'flex';
    userInfoContainer.style.alignItems = 'center';
    userInfoContainer.style.gap = '8px';

    // 创建配置选项容器（右侧）
    const configContainer = document.createElement('div');
    configContainer.className = 'config-container';
    configContainer.style.marginLeft = 'auto';

    // 添加用户信息到左侧容器
    if (currentUser && currentUser.id) {
        const userNameDisplay = document.createElement('div');
        userNameDisplay.className = 'user-name-display';
        userNameDisplay.textContent = '用户: ' + (currentUser.displayName || currentUser.id);
        userNameDisplay.style.color = '#4A5568';
        userNameDisplay.style.fontWeight = '500';
        userNameDisplay.style.cursor = 'pointer'; // Make username look clickable

        userInfoContainer.appendChild(userNameDisplay);

        // Logout button is initially hidden
        const logoutButton = document.createElement('button');
        logoutButton.textContent = '退出登录';
        logoutButton.className = 'logout-button simple-button';
        logoutButton.style.display = 'none'; // Initially hidden
        logoutButton.addEventListener('click', handleLogout);
        userInfoContainer.appendChild(logoutButton);

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

    // 添加配置按钮到右侧容器
    const configBtn = document.createElement('button');
    configBtn.id = 'configOptionsBtn';
    configBtn.className = 'config-button';
    configBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="3"></circle>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
      </svg>
      <span>配置选项</span>
    `;
    
    // 直接绑定配置按钮的点击事件
    configBtn.addEventListener('click', function() {
        const configModal = document.getElementById('configOptionsModal');
        if (configModal) {
            syncConfigToModal(); // 同步当前配置到模态框
            configModal.style.display = 'flex';
        }
    });
    
    configContainer.appendChild(configBtn);

    // 将两个容器添加到userActionsContainer
    userActionsContainer.appendChild(userInfoContainer);
    userActionsContainer.appendChild(configContainer);
}


async function loadUserSettings() {
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
        const selectedVoiceKey = 'userSettings_' + currentUser.id + '_selectedVoice';
        const selectedSceneKey = 'userSettings_' + currentUser.id + '_selectedScene';

        const storedVoice = localStorage.getItem(voiceKey);
        if (storedVoice && voiceSelect.value !== storedVoice) { // Check if update is needed
            voiceSelect.value = storedVoice;
        }

        const storedCategory = localStorage.getItem(categoryKey);
        if (storedCategory && categorySelect.value !== storedCategory) { // Check if update is needed
            categorySelect.value = storedCategory;
        }
        
        // 恢复全局选择状态（用于配置模态框）
        const storedSelectedVoice = localStorage.getItem(selectedVoiceKey);
        if (storedSelectedVoice) {
            window.selectedVoiceOption = storedSelectedVoice;
        } else {
            window.selectedVoiceOption = voiceSelect.value || 'default';
        }
        
        const storedSelectedScene = localStorage.getItem(selectedSceneKey);
        if (storedSelectedScene) {
            window.selectedScene = storedSelectedScene;
        } else {
            window.selectedScene = categorySelect.value || '全部';
        }
        
        console.log('用户设置已从localStorage恢复:', currentUser.id, {
            voice: storedVoice,
            category: storedCategory,
            selectedVoice: window.selectedVoiceOption,
            selectedScene: window.selectedScene
        });
        
        await loadUserProgress(); // 加载用户学习进度
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
        // 保存主界面的选择
        if (voiceSelect) {
            localStorage.setItem('userSettings_' + currentUser.id + '_voice', voiceSelect.value);
        }
        if (categorySelect) {
            localStorage.setItem('userSettings_' + currentUser.id + '_category', categorySelect.value);
        }
        
        // 保存全局选择状态（用于配置模态框）
        if (window.selectedVoiceOption) {
            localStorage.setItem('userSettings_' + currentUser.id + '_selectedVoice', window.selectedVoiceOption);
        }
        if (window.selectedScene) {
            localStorage.setItem('userSettings_' + currentUser.id + '_selectedScene', window.selectedScene);
        }
        
        console.log('用户设置已保存到localStorage:', currentUser.id);
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
    console.log('调用 markWordAsMastered:', wordId, cardElement);
    if (!wordId) {
        showMessage('单词ID无效，无法标记。', 2000);
        return;
    }
    if (!userProgress.masteredWords) userProgress.masteredWords = [];
    const wordIsMastered = userProgress.masteredWords.includes(wordId);
    const masterButton = cardElement.querySelector('.master-button');

    if (wordIsMastered) {
        userProgress.masteredWords = userProgress.masteredWords.filter(id => id && id !== wordId);
        if (masterButton) masterButton.textContent = '标记为已掌握';
        cardElement.classList.remove('is-mastered');
        showMessage('已从掌握列表移除。', 1500);
    } else {
        if (!userProgress.masteredWords.includes(wordId)) {
            userProgress.masteredWords.push(wordId);
        }
        if (masterButton) masterButton.textContent = '已掌握';
        cardElement.classList.add('is-mastered');
        showMessage('已标记为掌握！', 1500);
    }
    userProgress.masteredWords = userProgress.masteredWords.filter(id => !!id);
    saveUserProgress();
}

// HTML转义函数，防止XSS攻击
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 渲染闪卡主函数，使用高效的批量渲染方式
function renderFlashcards(category = '全部') {
    const grid = document.getElementById('flashcardGrid');
    if (!grid) return;
    
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
        grid.innerHTML = '';
        return;
    } else {
        document.getElementById('flashcardGridMessage').style.display = 'none';
    }

    console.log(`[SpeakCards] 开始渲染 ${data.length} 个单词卡片 (分类: ${category})`);
    
    // 预处理数据，确保每个单词有唯一ID
    data.forEach((wordObj, idx) => {
        if (!wordObj.id) {
            wordObj.id = `auto_${category}_${idx}_${Date.now()}`;
            // 同步写回 flashcardData，避免刷新前id丢失
            if (window.flashcardData) {
                const match = window.flashcardData.find(w => w.word === wordObj.word && w.chinese === wordObj.chinese);
                if (match) match.id = wordObj.id;
            }
            console.warn('[SpeakCards] 检测到单词缺少id，已自动补全:', wordObj.word, wordObj.id);
        }
    });

    // 使用innerHTML批量渲染，性能更优
    const masteredWords = userProgress.masteredWords || [];
    const cardsHTML = data.map((wordObj, idx) => {
        const isMastered = masteredWords.includes(wordObj.id);
        const masteredClass = isMastered ? 'is-mastered' : '';
        const masterBtnText = isMastered ? '已掌握' : '标记为已掌握';
        
        return `
            <div class="flashcard-container ${masteredClass}" data-word-id="${wordObj.id}" data-word="${escapeHtml(wordObj.word)}" data-lang="${wordObj.lang || 'en'}">
                <div class="flashcard">
                    <div class="flashcard-front">
                        <div class="word">${escapeHtml(wordObj.word)}</div>
                        <div class="pronunciation">${escapeHtml(wordObj.pronunciation || '')}</div>
                        <button class="speak-btn simple-button" title="发音">🔊</button>
                        <button class="master-button simple-button">${masterBtnText}</button>
                        <div class="card-index">${idx + 1}</div>
                    </div>
                    <div class="flashcard-back">
                        <div class="chinese-translation">${escapeHtml(wordObj.chinese)}</div>
                        <div class="card-index">${idx + 1}</div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // 一次性更新DOM
    grid.innerHTML = cardsHTML;

    // 使用事件委托处理所有卡片事件，避免为每个卡片单独绑定事件
    grid.removeEventListener('click', handleGridClick); // 移除旧的监听器
    grid.addEventListener('click', handleGridClick);
}

// 事件委托处理函数
function handleGridClick(e) {
    const cardContainer = e.target.closest('.flashcard-container');
    if (!cardContainer) return;

    const wordId = cardContainer.getAttribute('data-word-id');
    const word = cardContainer.getAttribute('data-word');
    const lang = cardContainer.getAttribute('data-lang');
    const card = cardContainer.querySelector('.flashcard');

    // 处理发音按钮点击
    if (e.target.closest('.speak-btn')) {
        e.stopPropagation();
        speakText(word, lang);
        return;
    }

    // 处理掌握按钮点击
    if (e.target.closest('.master-button')) {
        e.stopPropagation();
        markWordAsMastered(wordId, cardContainer);
        return;
    }

    // 处理卡片翻转
    if (card) {
        card.classList.toggle('flipped');
    }
}

// 智能发音主入口，自动选择TTS方案
async function speakText(text, lang = 'en') {
    if (!text) return;
    
    try {
        // 移动端音频激活检查 - 简化版本
        if (window.MobileAudioFix && window.MobileAudioFix.isMobileDevice()) {
            console.log('[SpeakText] 检测到移动设备，检查音频状态');
            
            // 如果音频未激活，提示用户
            if (!window.MobileAudioFix.isAudioEnabled) {
                showMessage('🎵 点击页面激活音频播放功能', 4000);
                
                // 尝试激活音频
                const unlocked = await window.MobileAudioFix.unlockAudioOnDemand();
                if (!unlocked) {
                    showMessage('⚠️ 音频未激活，请点击页面后重试', 3000);
                    return;
                }
            }
        }

        let voicePref = window.selectedVoiceOption || 'default';
        let ttsLang = lang;
        if (voicePref === 'male') ttsLang = 'en-US-male';
        if (voicePref === 'female') ttsLang = 'en-US-female';

        // 优先使用增强浏览器TTS
        if (window.TTSWithCache && TTSWithCache.playEnhancedBrowserTTS) {
            const ok = await TTSWithCache.playEnhancedBrowserTTS(text, ttsLang, true);
            if (ok) return;
        }
        // 兼容直接引入 tts-cache.js 的情况
        if (typeof playEnhancedBrowserTTS === 'function') {
            const ok = await playEnhancedBrowserTTS(text, ttsLang, true);
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
        // 百度TTS兜底
        if (typeof playBaiduTTS === 'function') {
            const ok = await playBaiduTTS(text, voicePref === 'male' ? 'male' : 'female', true);
            if (ok) return;
        }        // 最后兜底：浏览器原生TTS
        if (typeof speechSynthesis !== 'undefined') {
            try {
                const utter = new SpeechSynthesisUtterance(text);
                utter.lang = lang === 'zh' ? 'zh-CN' : 'en-US';
                let spoken = false;
                
                utter.onend = function() { spoken = true; };
                utter.onerror = function(e) { 
                    console.warn('SpeechSynthesis error:', e);
                    spoken = false; 
                };
                
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
        const data = await response.json();        if (data && data.audio) {
            try {
                const audio = window.MobileAudioFix 
                    ? window.MobileAudioFix.createCompatibleAudio(data.audio)
                    : new Audio(data.audio);
                
                // 使用移动端兼容的播放方法
                if (window.MobileAudioFix && window.MobileAudioFix.playAudio) {
                    await window.MobileAudioFix.playAudio(audio);
                } else {
                    await audio.play();
                }
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

// 百度TTS播放函数（带缓存）
async function playBaiduTTS(text, gender = 'female', useCache = true, scenario = 'conversation') {
    try {
        const config = window.TTS_CONFIG && window.TTS_CONFIG.baidu;
        if (!config || !config.apiKey || !config.secretKey || !config.serverUrl) {
            showMessage('百度TTS未配置');
            return false;
        }
        
        // 调试日志：显示实际使用的服务器URL
        console.log('[百度TTS] 使用服务器地址:', config.serverUrl);
        
        // 选择发音人编号
        let per = 0; // 默认女声
        if (gender === 'male') per = 1;
        if (gender === 'female') per = 0;
        // 英文特殊处理
        if (/^[a-zA-Z\s\.,!?\-]+$/.test(text)) {
            per = gender === 'male' ? 106 : 110;
        }
        // 缓存key
        const cacheKey = `baiduTTS_${text}_${per}`;
        if (useCache && window.AudioCache) {
            const cached = await window.AudioCache.get(text, per, 'baidu');
            if (cached && await window.AudioCache.playAudioFromCache(cached)) {
                return true;
            }
        }        // 请求后端 - 增强性别参数传递的可靠性
        console.log('[百度TTS] 发送请求:', { text: text.slice(0, 20) + '...', gender, per });
        
        const response = await fetch(config.serverUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                text, 
                lang: /[\u4e00-\u9fa5]/.test(text) ? 'zh' : 'en', 
                per: per,  // 确保明确传递数字值
                gender: gender, // 确保明确传递字符串
                voiceType: per // 额外添加一个参数以防万一
            })
        });
        if (!response.ok) throw new Error('百度TTS请求失败');
        const blob = await response.blob();
        if (useCache && window.AudioCache) {
            await window.AudioCache.add(text, blob, per, 'baidu');
        }        const audio = window.MobileAudioFix 
            ? window.MobileAudioFix.createCompatibleAudio(URL.createObjectURL(blob))
            : new Audio(URL.createObjectURL(blob));
        
        // 使用移动端兼容的播放方法
        if (window.MobileAudioFix && window.MobileAudioFix.playAudio) {
            await window.MobileAudioFix.playAudio(audio);
        } else {
            await audio.play();
        }
        return true;
    } catch (e) {
        showMessage('百度TTS播放失败: ' + (e.message || e));
        return false;
    }
}
window.playBaiduTTS = playBaiduTTS;

document.addEventListener('DOMContentLoaded', async function() {
    try {
        console.log('[SpeakCards] DOMContentLoaded');
        
        // 移动端音频修复初始化状态检查
        if (window.MobileAudioFix) {
            const deviceInfo = window.MobileAudioFix.getDeviceInfo();
            console.log('[SpeakCards] 设备信息:', deviceInfo);
            
            if (deviceInfo.isMobile) {
                console.log('[SpeakCards] 检测到移动设备，已启用音频兼容性修复');
            }
            
            if (deviceInfo.isWeChatOrQQ) {
                console.log('[SpeakCards] 检测到微信/QQ浏览器，需要用户交互激活音频');
            }
        }
        
        // 主容器
        let domAppContainer = document.getElementById('appContainer');
        if (!domAppContainer) {
            domAppContainer = document.createElement('div');
            domAppContainer.id = 'appContainer';
            domAppContainer.style.display = 'none';
            document.body.appendChild(domAppContainer);
        }        // 顶部栏
        if (!topBar.parentNode) {
            domAppContainer.insertBefore(topBar, domAppContainer.firstChild);
        }
        if (!userActionsContainer.parentNode) {
            topBar.appendChild(userActionsContainer);
        }
        
        // 移动端音频状态指示器
        if (window.MobileAudioFix && window.MobileAudioFix.isMobileDevice()) {
            const audioStatusIndicator = createMobileAudioStatusIndicator();
            if (audioStatusIndicator && !document.getElementById('mobile-audio-status')) {
                domAppContainer.insertBefore(audioStatusIndicator, domAppContainer.firstChild);
            }
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
            try {                currentUser = JSON.parse(storedUser);
                showAppScreen();
                await loadUserSettings();
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
            customWordManagementDiv.style.display = 'none';        }
        
        // 配置模态框的事件绑定
        setupConfigModalEvents();
        
        console.log('[SpeakCards] 页面初始化完成');
    } catch (err) {
        console.error('[SpeakCards] 页面初始化异常', err);
        alert('页面初始化异常：' + err.message);
    }
});

// 配置模态框事件绑定函数
function setupConfigModalEvents() {
    // 配置模态框的关闭事件
    const configModalCloseBtn = document.getElementById('configModalCloseBtn');
    if (configModalCloseBtn) {
        configModalCloseBtn.addEventListener('click', function() {
            const configModal = document.getElementById('configOptionsModal');
            if (configModal) {
                configModal.style.display = 'none';
            }
        });
    }

    const configModalCancelBtn = document.getElementById('configModalCancelBtn');
    if (configModalCancelBtn) {
        configModalCancelBtn.addEventListener('click', function() {
            const configModal = document.getElementById('configOptionsModal');
            if (configModal) {
                configModal.style.display = 'none';
            }
        });
    }

    const configModalOkBtn = document.getElementById('configModalOkBtn');
    if (configModalOkBtn) {
        configModalOkBtn.addEventListener('click', function() {
            console.log('配置模态框确定按钮被点击'); // 调试日志
            const sceneSelect = document.getElementById('sceneSelect');
            const voiceOptionSelect = document.getElementById('voiceOptionSelect');
            const selectedScene = sceneSelect ? sceneSelect.value : '全部';
            const selectedVoice = voiceOptionSelect ? voiceOptionSelect.value : 'default';
            
            window.selectedScene = selectedScene;
            window.selectedVoiceOption = selectedVoice;
            
            // 更新主界面的下拉框
            if (categorySelect) {
                categorySelect.value = selectedScene;
            }
            if (voiceSelect) {
                voiceSelect.value = selectedVoice;
            }

            saveUserSettings();
            renderFlashcards(selectedScene);
            showMessage('设置已保存！', 2000);
            
            // 关闭模态框
            const configModal = document.getElementById('configOptionsModal');
            if (configModal) {
                configModal.style.display = 'none';
            }
        });
    }

    // 点击模态框外部关闭
    const configOptionsModal = document.getElementById('configOptionsModal');
    if (configOptionsModal) {
        configOptionsModal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.style.display = 'none';
            }
        });
    }

    const sceneSelect = document.getElementById('sceneSelect');
    if (sceneSelect) {
        sceneSelect.addEventListener('change', function() {
            const selectedScene = this.value;
            window.selectedScene = selectedScene;
            renderFlashcards(selectedScene);
        });
    }

    const voiceGenderSelect = document.getElementById('voiceGenderSelect');
    if (voiceGenderSelect) {
        voiceGenderSelect.addEventListener('change', function() {
            const selectedVoice = this.value;
            window.selectedVoiceOption = selectedVoice;
            showMessage('语音选项已更改。', 2000);
        });
    }
}

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
        if (cat) {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            categorySelect.appendChild(option);
        }
    });
}

// 初始化分类下拉框
updateCategoryDropdown();

// 预先加载用户设置
(async () => {
    await loadUserSettings();
})();

// 同步配置选项到模态框
function syncConfigToModal() {
    const sceneSelect = document.getElementById('sceneSelect');
    const voiceOptionSelect = document.getElementById('voiceOptionSelect');
    
    // 优先使用全局保存的状态，其次使用下拉框的当前值
    if (sceneSelect) {
        const currentScene = window.selectedScene || categorySelect?.value || '全部';
        sceneSelect.value = currentScene;
    }
    
    if (voiceOptionSelect) {
        const currentVoice = window.selectedVoiceOption || voiceSelect?.value || 'default';
        voiceOptionSelect.value = currentVoice;
    }
    
    console.log('配置已同步到模态框:', {
        scene: sceneSelect?.value,
        voice: voiceOptionSelect?.value,
        globalScene: window.selectedScene,
        globalVoice: window.selectedVoiceOption
    });
}

// 创建移动端音频状态指示器
function createMobileAudioStatusIndicator() {
    if (!window.MobileAudioFix || !window.MobileAudioFix.isMobileDevice()) {
        return null;
    }

    // 如果音频已经激活，不显示指示器
    if (window.MobileAudioFix.isAudioEnabled) {
        return null;
    }

    const container = document.createElement('div');
    container.id = 'mobile-audio-status';
    container.className = 'mobile-audio-status';
    container.style.cssText = `
        position: sticky;
        top: 0;
        z-index: 200;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 10px 16px;
        text-align: center;
        font-size: 13px;
        font-weight: 500;
        border-bottom: 1px solid rgba(255, 255, 255, 0.2);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    `;

    const statusText = document.createElement('span');
    statusText.className = 'status-text';
    
    // 根据浏览器类型显示不同提示
    const isWeChatOrQQ = window.MobileAudioFix.isWeChatOrQQBrowser();
    statusText.textContent = isWeChatOrQQ 
        ? '🎵 微信中点击此处激活音频' 
        : '🎵 点击激活音频播放';

    const statusIcon = document.createElement('span');
    statusIcon.className = 'status-icon';
    statusIcon.textContent = '👆';

    container.appendChild(statusText);
    container.appendChild(statusIcon);

    // 点击激活音频
    container.addEventListener('click', async function() {
        if (container.style.pointerEvents === 'none') return;
        
        container.style.pointerEvents = 'none';
        
        try {
            statusText.textContent = '⏳ 正在激活...';
            statusIcon.textContent = '🔄';
            container.style.background = 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)';
            
            // 恢复AudioContext（如果需要）
            if (window.MobileAudioFix.audioContext && window.MobileAudioFix.audioContext.state === 'suspended') {
                await window.MobileAudioFix.audioContext.resume();
            }
            
            // 标记为已激活
            window.MobileAudioFix.isAudioEnabled = true;
            
            statusText.textContent = '✅ 音频已激活';
            statusIcon.textContent = '🎵';
            container.style.background = 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)';
            
            // 显示成功消息
            if (typeof showMessage === 'function') {
                showMessage('🔊 音频播放已激活！现在可以听发音了', 2000);
            }
            
            // 2秒后隐藏指示器
            setTimeout(() => {
                container.style.transform = 'translateY(-100%)';
                setTimeout(() => {
                    if (container.parentNode) {
                        container.parentNode.removeChild(container);
                    }
                }, 300);
            }, 2000);
            
        } catch (error) {
            console.warn('[Mobile Audio] 激活失败:', error);
            statusText.textContent = '❌ 点击重试';
            statusIcon.textContent = '🔄';
            container.style.background = 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)';
            container.style.pointerEvents = 'auto';
        }
    });

    return container;
}
