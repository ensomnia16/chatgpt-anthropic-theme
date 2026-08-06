const DEFAULTS = Object.freeze({
  fontMode: "serif",
  anthropicColors: false,
  claudeThinking: false
});

const THINKING_WORDS = Object.freeze([
  "Pondering",
  "Reasoning",
  "Analyzing",
  "Exploring",
  "Reflecting",
  "Considering",
  "Synthesizing",
  "Deliberating",
  "Investigating",
  "Formulating"
]);

const THINKING_SOURCE_PATTERN = /^Thinking(?:\u2026|\.{3})?$/i;
const THINKING_WORD_SET = new Set(THINKING_WORDS);
const trackedThinkingNodes = new Map();
let thinkingObserver;
let thinkingTimer;
let scanFrame;
let thinkingWordIndex = 0;

function splitWhitespace(value) {
  const match = value.match(/^(\s*)(.*?)(\s*)$/s);
  return {
    leading: match?.[1] || "",
    text: match?.[2] || value,
    trailing: match?.[3] || ""
  };
}

function isSafeThinkingContext(node) {
  const parent = node.parentElement;
  if (!parent || parent.closest("pre, code, textarea, input, [contenteditable='true']")) {
    return false;
  }

  const message = parent.closest("[data-message-author-role]");
  if (message) return message.getAttribute("data-message-author-role") === "assistant";

  return Boolean(
    parent.closest("[role='status'], [aria-live='polite'], [aria-live='assertive']") ||
    parent.closest("main")
  );
}

function trackThinkingNode(node) {
  if (trackedThinkingNodes.has(node) || !isSafeThinkingContext(node)) return;

  const parts = splitWhitespace(node.nodeValue || "");
  if (!THINKING_SOURCE_PATTERN.test(parts.text)) return;

  trackedThinkingNodes.set(node, {
    original: node.nodeValue,
    leading: parts.leading,
    trailing: parts.trailing
  });
}

function scanForThinking(root) {
  if (!root?.isConnected && root !== document) return;

  if (root.nodeType === Node.TEXT_NODE) {
    trackThinkingNode(root);
    return;
  }

  if (root.nodeType !== Node.ELEMENT_NODE && root !== document) return;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) trackThinkingNode(node);
}

function rotateThinkingWord() {
  const word = THINKING_WORDS[thinkingWordIndex % THINKING_WORDS.length];
  thinkingWordIndex += 1;

  for (const [node, metadata] of trackedThinkingNodes) {
    if (!node.isConnected) {
      trackedThinkingNodes.delete(node);
      continue;
    }

    const current = splitWhitespace(node.nodeValue || "").text;
    if (!THINKING_SOURCE_PATTERN.test(current) && !THINKING_WORD_SET.has(current)) {
      trackedThinkingNodes.delete(node);
      continue;
    }

    node.nodeValue = `${metadata.leading}${word}${metadata.trailing}`;
  }

  // Ignore MutationObserver records caused by our own text replacements.
  thinkingObserver?.takeRecords();
}

function scheduleThinkingScan(root) {
  if (scanFrame) return;
  scanFrame = requestAnimationFrame(() => {
    scanFrame = undefined;
    scanForThinking(root?.isConnected ? root : document.body || document);
    rotateThinkingWord();
  });
}

function startThinkingSwap() {
  if (thinkingObserver) return;

  scanForThinking(document.body || document);
  rotateThinkingWord();

  thinkingObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "characterData") {
        scheduleThinkingScan(mutation.target);
        continue;
      }
      for (const node of mutation.addedNodes) scheduleThinkingScan(node);
    }
  });
  thinkingObserver.observe(document.documentElement, {
    subtree: true,
    childList: true,
    characterData: true
  });
  thinkingTimer = setInterval(rotateThinkingWord, 1600);
}

function stopThinkingSwap() {
  thinkingObserver?.disconnect();
  thinkingObserver = undefined;
  clearInterval(thinkingTimer);
  thinkingTimer = undefined;
  if (scanFrame) cancelAnimationFrame(scanFrame);
  scanFrame = undefined;

  for (const [node, metadata] of trackedThinkingNodes) {
    if (node.isConnected && THINKING_WORD_SET.has(splitWhitespace(node.nodeValue || "").text)) {
      node.nodeValue = metadata.original;
    }
  }
  trackedThinkingNodes.clear();
}

function applySettings(settings) {
  const root = document.documentElement;
  const mode = settings.fontMode === "sans" ? "sans" : "serif";

  root.dataset.cgptFontMode = mode;
  root.dataset.cgptAnthropicColors = settings.anthropicColors ? "on" : "off";

  if (settings.claudeThinking) startThinkingSwap();
  else stopThinkingSwap();
}

chrome.storage.sync.get(DEFAULTS, applySettings);

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "sync") return;
  chrome.storage.sync.get(DEFAULTS, applySettings);
});
