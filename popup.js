const DEFAULTS = Object.freeze({
  fontMode: "serif",
  anthropicColors: false,
  claudeThinking: false
});

const modeInputs = [...document.querySelectorAll('input[name="fontMode"]')];
const colorInput = document.getElementById("anthropicColors");
const thinkingInput = document.getElementById("claudeThinking");
const status = document.getElementById("status");
let statusTimer;

chrome.storage.sync.get(DEFAULTS, (settings) => {
  const selected = modeInputs.find((input) => input.value === settings.fontMode);
  (selected || modeInputs[0]).checked = true;
  colorInput.checked = Boolean(settings.anthropicColors);
  thinkingInput.checked = Boolean(settings.claudeThinking);
});

function saveSettings() {
  const fontMode = modeInputs.find((input) => input.checked)?.value || "serif";
  const anthropicColors = colorInput.checked;
  const claudeThinking = thinkingInput.checked;

  chrome.storage.sync.set({ fontMode, anthropicColors, claudeThinking }, () => {
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
