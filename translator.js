document.addEventListener('DOMContentLoaded', function() {
    const sourceText = document.getElementById('sourceText');
    const translatedText = document.getElementById('translatedText');
    const targetLang = document.getElementById('targetLang');
    const langSearch = document.getElementById('langSearch');
    const speakerButton = document.getElementById('speakerButton');
    const copyButton = document.getElementById('copyButton');
    let translateTimeout;
    let speechUtterance = null;
    let isSpeaking = false;

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

        // 保存当前选项的选中状态
        const wasOptionSelected = targetLang.selectedIndex !== -1;
        const selectedValue = targetLang.value;

        targetLang.innerHTML = sortedLanguages
            .map(([code, name]) => `<option value="${code}">${name}</option>`)
            .join('');

        // 如果之前有选中的值，继续保持选中
        if (wasOptionSelected) {
            targetLang.value = selectedValue;
            // 保存选择的语言
            chrome.storage.local.set({ 'lastUsedLanguage': selectedValue });
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
        
        if (sourceText.value) {
            clearTimeout(translateTimeout);
            translateTimeout = setTimeout(translateText, 200);
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
}); 