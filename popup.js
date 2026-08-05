const DEFAULTS = Object.freeze({
  fontMode: "serif",
  anthropicColors: false
});

const modeInputs = [...document.querySelectorAll('input[name="fontMode"]')];
const colorInput = document.getElementById("anthropicColors");
const status = document.getElementById("status");
let statusTimer;

chrome.storage.sync.get(DEFAULTS, (settings) => {
  const selected = modeInputs.find((input) => input.value === settings.fontMode);
  (selected || modeInputs[0]).checked = true;
  colorInput.checked = Boolean(settings.anthropicColors);
});

function saveSettings() {
  const fontMode = modeInputs.find((input) => input.checked)?.value || "serif";
  const anthropicColors = colorInput.checked;

  chrome.storage.sync.set({ fontMode, anthropicColors }, () => {
    status.textContent = "已保存并应用";
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => {
      status.textContent = "修改会立即生效";
    }, 1500);
  });
}

for (const input of modeInputs) input.addEventListener("change", saveSettings);
colorInput.addEventListener("change", saveSettings);
