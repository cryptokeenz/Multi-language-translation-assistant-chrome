document.addEventListener('DOMContentLoaded', function() {
    const sourceText = document.getElementById('sourceText');
    const translatedText = document.getElementById('translatedText');
    const targetLang = document.getElementById('targetLang');
    const langSearch = document.getElementById('langSearch');
    const speakerButton = document.getElementById('speakerButton');
    const sourceSpeakerButton = document.getElementById('sourceSpeakerButton');
    const copyButton = document.getElementById('copyButton');
    const sourceCopyButton = document.getElementById('sourceCopyButton');
    let translateTimeout;
    let speechUtterance = null;
    let isSpeaking = false;
    let isSourceSpeaking = false;

    // 建立与后台脚本的长连接
    const port = chrome.runtime.connect({name: 'sidePanel'});

    // 通知后台脚本侧边栏已准备就绪
    port.postMessage({action: 'ready'});

    // 初始化语言选项
    function initializeLanguageOptions() {
        const sortedLanguages = Object.entries(SUPPORTED_LANGUAGES)
            .sort((a, b) => a[1].localeCompare(b[1], 'zh-CN'));
        
        targetLang.innerHTML = sortedLanguages
            .map(([code, name]) => `<option value="${code}">${name}</option>`)
            .join('');

        // 从 storage 中读取上次使用的语言
        chrome.storage.local.get(['lastUsedLanguage'], function(result) {
            if (result.lastUsedLanguage) {
                targetLang.value = result.lastUsedLanguage;
            }
        });
    }

    // 搜索语言
    function filterLanguages(searchText) {
        const currentValue = targetLang.value;
        
        const sortedLanguages = Object.entries(SUPPORTED_LANGUAGES)
            .filter(([code, name]) => 
                name.toLowerCase().includes(searchText.toLowerCase()) ||
                code.toLowerCase().includes(searchText.toLowerCase()))
            .sort((a, b) => a[1].localeCompare(b[1], 'zh-CN'));

        targetLang.innerHTML = sortedLanguages
            .map(([code, name]) => `<option value="${code}">${name}</option>`)
            .join('');

        // 如果之前的值在过滤后的结果中存在，则保持选中
        if (sortedLanguages.some(([code]) => code === currentValue)) {
            targetLang.value = currentValue;
        } else if (sortedLanguages.length > 0) {
            // 如果之前的值不存在，选择第一个选项并触发翻译
            targetLang.value = sortedLanguages[0][0];
            // 保存选择的语言
            chrome.storage.local.set({ 'lastUsedLanguage': targetLang.value });
            // 如果有文本，则触发翻译
            if (sourceText.value) {
                translateText();
            }
        }
    }

    // 初始化语言列表
    initializeLanguageOptions();

    // 添加语言搜索事件监听
    langSearch.addEventListener('input', (e) => {
        filterLanguages(e.target.value);
    });

    async function translateText() {
        const text = sourceText.value;
        const target = targetLang.value;
        
        if (!text) {
            translatedText.value = '';
            return;
        }

        try {
            const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${target}&dt=t&q=${encodeURIComponent(text)}`;
            
            const response = await fetch(url);
            const data = await response.json();
            
            let result = '';
            data[0].forEach(item => {
                if (item[0]) {
                    result += item[0];
                }
            });
            
            translatedText.value = result;
            speakerButton.disabled = false; // 启用播放按钮
        } catch (error) {
            translatedText.value = '翻译出错，请稍后重试';
            speakerButton.disabled = true; // 禁用播放按钮
            console.error('Translation error:', error);
        }
    }

    // 监听输入事件，使用防抖处理
    sourceText.addEventListener('input', function() {
        clearTimeout(translateTimeout);
        translateTimeout = setTimeout(translateText, 500); // 改为0.5秒后执行翻译
    });

    // 监听语言选择变化
    targetLang.addEventListener('change', function() {
        // 保存选择的语言
        chrome.storage.local.set({ 'lastUsedLanguage': targetLang.value });
        
        // 如果输入框有内容，立即触发翻译
        if (sourceText.value) {
            translateText();
        }
    });

    // 播放翻译后的文本
    function playTranslatedText() {
        if (isSpeaking) {
            window.speechSynthesis.cancel();
            isSpeaking = false;
            speakerButton.classList.remove('playing');
            return;
        }

        const text = translatedText.value;
        if (!text) return;

        speechUtterance = new SpeechSynthesisUtterance(text);
        speechUtterance.lang = targetLang.value;

        speechUtterance.onend = function() {
            isSpeaking = false;
            speakerButton.classList.remove('playing');
        };

        speechUtterance.onerror = function() {
            isSpeaking = false;
            speakerButton.classList.remove('playing');
        };

        window.speechSynthesis.speak(speechUtterance);
        isSpeaking = true;
        speakerButton.classList.add('playing');
    }

    // 添加播放按钮点击事件
    speakerButton.addEventListener('click', playTranslatedText);

    // 复制翻译结果
    async function copyTranslatedText() {
        const text = translatedText.value;
        if (!text) return;

        try {
            await navigator.clipboard.writeText(text);
        } catch (err) {
            console.error('复制失败:', err);
        }
    }

    // 添加鼠标按下和松开事件
    copyButton.addEventListener('mousedown', () => {
        copyButton.classList.add('copied');
    });

    copyButton.addEventListener('mouseup', () => {
        copyButton.classList.remove('copied');
        copyTranslatedText();
    });

    // 鼠标移出按钮时也要移除样式
    copyButton.addEventListener('mouseleave', () => {
        copyButton.classList.remove('copied');
    });

    // 复制原文
    async function copySourceText() {
        const text = sourceText.value;
        if (!text) return;

        try {
            await navigator.clipboard.writeText(text);
        } catch (err) {
            console.error('复制失败:', err);
        }
    }

    // 播放原文
    function playSourceText() {
        if (isSourceSpeaking) {
            window.speechSynthesis.cancel();
            isSourceSpeaking = false;
            sourceSpeakerButton.classList.remove('playing');
            return;
        }

        const text = sourceText.value;
        if (!text) return;

        const utterance = new SpeechSynthesisUtterance(text);
        // 从翻译 API 的响应中获取源语言
        fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang.value}&dt=t&q=${encodeURIComponent(text)}`)
            .then(response => response.json())
            .then(data => {
                // 获取检测到的源语言
                const detectedLanguage = data[2];
                utterance.lang = detectedLanguage;
                
                utterance.onend = function() {
                    isSourceSpeaking = false;
                    sourceSpeakerButton.classList.remove('playing');
                };

                utterance.onerror = function() {
                    isSourceSpeaking = false;
                    sourceSpeakerButton.classList.remove('playing');
                };

                window.speechSynthesis.speak(utterance);
                isSourceSpeaking = true;
                sourceSpeakerButton.classList.add('playing');
            })
            .catch(error => {
                console.error('语言检测失败:', error);
                // 如果检测失败，仍然尝试播放
                window.speechSynthesis.speak(utterance);
                isSourceSpeaking = true;
                sourceSpeakerButton.classList.add('playing');
            });
    }

    // 添加原文复制按钮事件
    sourceCopyButton.addEventListener('mousedown', () => {
        sourceCopyButton.classList.add('copied');
    });

    sourceCopyButton.addEventListener('mouseup', () => {
        sourceCopyButton.classList.remove('copied');
        copySourceText();
    });

    sourceCopyButton.addEventListener('mouseleave', () => {
        sourceCopyButton.classList.remove('copied');
    });

    // 添加原文播放按钮事件
    sourceSpeakerButton.addEventListener('click', playSourceText);

    // 监听来自后台的消息
    port.onMessage.addListener((msg) => {
        if (msg.action === "translateText") {
            sourceText.value = msg.text;
            // 触发翻译
            clearTimeout(translateTimeout);
            translateTimeout = setTimeout(translateText, 500);
        }
    });
}); 