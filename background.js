const CHATGPT_HOSTS = new Set(["chatgpt.com", "chat.openai.com"]);
const SELECTED_PROJECT_URL_KEY = "selectedProjectUrl";

function isProjectNewChatUrl(value) {
  try {
    const url = new URL(value);
    return CHATGPT_HOSTS.has(url.hostname) && /^\/g\/g-p-[^/]+\/project\/?$/.test(url.pathname);
  } catch {
    return false;
  }
}

async function getSelectedProjectUrl() {
  const settings = await chrome.storage.local.get(SELECTED_PROJECT_URL_KEY);
  return isProjectNewChatUrl(settings[SELECTED_PROJECT_URL_KEY])
    ? settings[SELECTED_PROJECT_URL_KEY]
    : null;
}

chrome.action.onClicked.addListener(async (tab) => {
  const projectUrl = await getSelectedProjectUrl();
  if (!projectUrl) {
    await chrome.runtime.openOptionsPage();
    return;
  }

  const createProperties = { url: projectUrl, active: true };
  if (Number.isInteger(tab.windowId)) createProperties.windowId = tab.windowId;
  await chrome.tabs.create(createProperties);
});
