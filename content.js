const DEFAULTS = Object.freeze({
  fontMode: "serif",
  anthropicColors: false
});

function applySettings(settings) {
  const root = document.documentElement;
  const mode = settings.fontMode === "sans" ? "sans" : "serif";

  root.dataset.cgptFontMode = mode;
  root.dataset.cgptAnthropicColors = settings.anthropicColors ? "on" : "off";
}

chrome.storage.sync.get(DEFAULTS, applySettings);

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "sync") return;
  chrome.storage.sync.get(DEFAULTS, applySettings);
});
