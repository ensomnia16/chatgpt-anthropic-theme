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
const status = document.getElementById("status");
let statusTimer;

chrome.storage.sync.get(DEFAULTS, (settings) => {
  const selected = modeInputs.find((input) => input.value === settings.fontMode);
  (selected || modeInputs[0]).checked = true;
  colorInput.checked = Boolean(settings.anthropicColors);
  thinkingInput.checked = Boolean(settings.claudeThinking);
  thinkingAnimationInput.checked = Boolean(settings.claudeThinkingAnimation);
});

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
