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

// 存储待发送的文本和侧边栏状态
let pendingText = null;
let sidePanelPorts = new Map();

// 处理右键菜单点击事件
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "translateSelection") {
    pendingText = info.selectionText;
    chrome.sidePanel.open({tabId: tab.id});
  }
});

// 处理来自 content script 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "openSidePanel") {
    pendingText = request.text;
    // 获取当前活动标签页
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs[0]) {
        const tabId = tabs[0].id;
        const port = sidePanelPorts.get(tabId);
        
        if (port) {
          // 如果侧边栏已经打开并且连接存在，直接发送文本
          port.postMessage({
            action: "translateText",
            text: pendingText
          });
          pendingText = null;
        } else {
          // 如果侧边栏未打开，则打开它
          chrome.sidePanel.open({tabId: tabId});
        }
      }
    });
  }
});

// 处理侧边栏连接
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'sidePanel') {
    // 获取当前活动标签页
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs[0]) {
        const tabId = tabs[0].id;
        sidePanelPorts.set(tabId, port);

        // 如果有待发送的文本，立即发送
        if (pendingText) {
          port.postMessage({
            action: "translateText",
            text: pendingText
          });
          pendingText = null;
        }

        // 监听断开连接
        port.onDisconnect.addListener(() => {
          sidePanelPorts.delete(tabId);
        });

        // 监听来自侧边栏的消息
        port.onMessage.addListener((msg) => {
          if (msg.action === "ready") {
            // 如果有待发送的文本，发送给侧边栏
            if (pendingText) {
              port.postMessage({
                action: "translateText",
                text: pendingText
              });
              pendingText = null;
            }
          }
        });
      }
    });
  }
}); 