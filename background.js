chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({tabId: tab.id});
});

// 创建右键菜单
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "translateSelection",
    title: "多语言翻译助手",
    contexts: ["selection"]
  });
});

// 处理右键菜单点击事件
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "translateSelection") {
    // 打开侧边栏
    chrome.sidePanel.open({tabId: tab.id}).then(() => {
      // 等待侧边栏打开后，发送选中的文本
      setTimeout(() => {
        chrome.runtime.sendMessage({
          action: "translateText",
          text: info.selectionText
        });
      }, 500);
    });
  }
}); 