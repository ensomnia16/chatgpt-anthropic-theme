const CHATGPT_HOSTS = new Set(["chatgpt.com", "chat.openai.com"]);

function isChatGPTUrl(value) {
  try {
    return CHATGPT_HOSTS.has(new URL(value).hostname);
  } catch {
    return false;
  }
}

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id || !isChatGPTUrl(tab.url)) {
    if (tab.id) await chrome.tabs.update(tab.id, { url: "https://chatgpt.com/" });
    return;
  }

  let projectUrl;
  try {
    const response = await chrome.tabs.sendMessage(tab.id, {
      type: "getProjectNewChatUrl"
    });
    projectUrl = response?.url;
  } catch {
    // The content script may not be ready immediately after installation.
  }

  await chrome.tabs.update(tab.id, {
    url: isChatGPTUrl(projectUrl) ? projectUrl : "https://chatgpt.com/"
  });
});
