const DEFAULTS = Object.freeze({
  fontMode: "serif",
  anthropicColors: false,
  claudeThinking: false,
  claudeThinkingAnimation: false
});

const modeInputs = [...document.querySelectorAll('input[name="fontMode"]')];
const colorInput = document.getElementById("anthropicColors");
const thinkingInput = document.getElementById("claudeThinking");
const thinkingAnimationInput = document.getElementById("claudeThinkingAnimation");
const projectSelect = document.getElementById("selectedProjectUrl");
const projectHint = document.getElementById("projectHint");
const status = document.getElementById("status");
let statusTimer;

chrome.storage.sync.get(DEFAULTS, (settings) => {
  const selected = modeInputs.find((input) => input.value === settings.fontMode);
  (selected || modeInputs[0]).checked = true;
  colorInput.checked = Boolean(settings.anthropicColors);
  thinkingInput.checked = Boolean(settings.claudeThinking);
  thinkingAnimationInput.checked = Boolean(settings.claudeThinkingAnimation);
});

function renderProjects(settings) {
  const projects = Array.isArray(settings.knownProjects) ? settings.knownProjects : [];
  const selectedUrl = settings.selectedProjectUrl || "";
  projectSelect.replaceChildren(new Option("请选择一个项目", ""));

  for (const project of projects) {
    if (!project?.url || !project?.name) continue;
    projectSelect.add(new Option(project.name, project.url));
  }

  if (selectedUrl && !projects.some((project) => project.url === selectedUrl)) {
    projectSelect.add(new Option("已选择的项目", selectedUrl));
  }
  projectSelect.value = selectedUrl;
  projectHint.textContent = projects.length
    ? "单击扩展按钮时，会在新标签页打开所选项目的新对话。"
    : "请先打开任意 ChatGPT 项目页面并刷新，再回到这里选择。";
}

chrome.storage.local.get({ knownProjects: [], selectedProjectUrl: "" }, renderProjects);

function saveSettings() {
  const fontMode = modeInputs.find((input) => input.checked)?.value || "serif";
  const anthropicColors = colorInput.checked;
  const claudeThinking = thinkingInput.checked;
  const claudeThinkingAnimation = thinkingAnimationInput.checked;

  chrome.storage.sync.set({ fontMode, anthropicColors, claudeThinking, claudeThinkingAnimation }, () => {
    status.textContent = "已保存并应用";
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => {
      status.textContent = "修改会立即生效";
    }, 1500);
  });
}

for (const input of modeInputs) input.addEventListener("change", saveSettings);
colorInput.addEventListener("change", saveSettings);
thinkingInput.addEventListener("change", saveSettings);
thinkingAnimationInput.addEventListener("change", saveSettings);

projectSelect.addEventListener("change", () => {
  if (projectSelect.value) {
    chrome.storage.local.set({ selectedProjectUrl: projectSelect.value });
    status.textContent = "默认项目已保存";
  } else {
    chrome.storage.local.remove("selectedProjectUrl");
    status.textContent = "请选择默认项目";
  }
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local" || (!changes.knownProjects && !changes.selectedProjectUrl)) return;
  chrome.storage.local.get({ knownProjects: [], selectedProjectUrl: "" }, renderProjects);
});
