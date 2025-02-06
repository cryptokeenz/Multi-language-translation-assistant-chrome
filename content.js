// 创建浮动图标元素
const floatingIcon = document.createElement('div');
floatingIcon.innerHTML = `
    <img src="${chrome.runtime.getURL('images/icon128.png')}" 
         style="width: 32px; height: 32px; cursor: pointer;">
`;
floatingIcon.style.cssText = `
    position: absolute;
    display: none;
    z-index: 99999;
    cursor: pointer;
`;
document.body.appendChild(floatingIcon);

// 处理选中文本事件
document.addEventListener('mouseup', (e) => {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();

    if (selectedText) {
        // 获取选中文本的位置
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        // 计算图标位置
        const iconX = rect.right + window.scrollX;
        let iconY = rect.top + window.scrollY;
        
        // 检查是否超出视口
        const viewportHeight = window.innerHeight;
        if (rect.top + 40 > viewportHeight) {
            // 如果图标会超出底部，则显示在选中文本上方
            iconY = rect.top + window.scrollY - 30;
        }

        // 设置图标位置
        floatingIcon.style.left = `${iconX + 5}px`;
        floatingIcon.style.top = `${iconY}px`;
        floatingIcon.style.display = 'block';
    } else {
        floatingIcon.style.display = 'none';
    }
});

// 点击图标外区域时隐藏图标
document.addEventListener('mousedown', (e) => {
    if (e.target !== floatingIcon && !floatingIcon.contains(e.target)) {
        floatingIcon.style.display = 'none';
    }
});

// 点击图标时打开侧边栏并传递选中的文本
floatingIcon.addEventListener('click', () => {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    if (selectedText) {
        chrome.runtime.sendMessage({ 
            action: "openSidePanel",
            text: selectedText
        });
        // 隐藏图标
        floatingIcon.style.display = 'none';
        // 清除选择
        selection.removeAllRanges();
    }
}); 