const DEFAULTS = Object.freeze({
  fontMode: "serif",
  anthropicColors: false,
  claudeThinking: false
});

const ENGLISH_THINKING_WORDS = Object.freeze([
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

const CHINESE_THINKING_WORDS = Object.freeze([
  "深思中",
  "推理中",
  "分析中",
  "探索中",
  "反思中",
  "斟酌中",
  "整合中",
  "权衡中",
  "研究中",
  "构思中"
]);

const THINKING_SOURCE_PATTERN = /^(?:Thinking|正在思考|思考中)(?:\s*(?:\u2026{1,2}|\.{3}))?$/i;
const THINKING_WORD_SET = new Set([...ENGLISH_THINKING_WORDS, ...CHINESE_THINKING_WORDS]);
const trackedThinkingNodes = new Map();
const thinkingSessions = new Map();
let thinkingObserver;
let scanFrame;

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

function getThinkingAnchor(node) {
  const parent = node.parentElement;
  return parent?.closest(
    "[role='status'], [aria-live='polite'], [aria-live='assertive'], [data-message-author-role='assistant']"
  ) || parent;
}

function randomThinkingWord(language) {
  const words = language === "zh" ? CHINESE_THINKING_WORDS : ENGLISH_THINKING_WORDS;
  return words[Math.floor(Math.random() * words.length)];
}

function untrackThinkingNode(node) {
  const metadata = trackedThinkingNodes.get(node);
  if (!metadata) return;

  trackedThinkingNodes.delete(node);
  metadata.session.nodes.delete(node);
  if (metadata.session.nodes.size === 0) {
    thinkingSessions.delete(metadata.anchor);
  }
}

function trackThinkingNode(node) {
  if (trackedThinkingNodes.has(node) || !isSafeThinkingContext(node)) return;

  const parts = splitWhitespace(node.nodeValue || "");
  if (!THINKING_SOURCE_PATTERN.test(parts.text)) return;

  const anchor = getThinkingAnchor(node);
  if (!anchor) return;

  let session = thinkingSessions.get(anchor);
  if (!session) {
    const language = /[\u3400-\u9fff]/.test(parts.text) ? "zh" : "en";
    session = { word: randomThinkingWord(language), nodes: new Set() };
    thinkingSessions.set(anchor, session);
  }

  trackedThinkingNodes.set(node, {
    original: node.nodeValue,
    leading: parts.leading,
    trailing: parts.trailing,
    anchor,
    session
  });
  session.nodes.add(node);
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

function applyThinkingWords() {
  for (const [node, metadata] of trackedThinkingNodes) {
    if (!node.isConnected) {
      untrackThinkingNode(node);
      continue;
    }

    const current = splitWhitespace(node.nodeValue || "").text;
    if (!THINKING_SOURCE_PATTERN.test(current) && !THINKING_WORD_SET.has(current)) {
      untrackThinkingNode(node);
      continue;
    }

    const replacement = `${metadata.leading}${metadata.session.word}${metadata.trailing}`;
    if (node.nodeValue !== replacement) node.nodeValue = replacement;
  }

  // Ignore MutationObserver records caused by our own text replacements.
  thinkingObserver?.takeRecords();
}

function scheduleThinkingScan() {
  if (scanFrame) return;
  scanFrame = requestAnimationFrame(() => {
    scanFrame = undefined;
    scanForThinking(document.body || document);
    applyThinkingWords();
  });
}

function startThinkingSwap() {
  if (thinkingObserver) return;

  scanForThinking(document.body || document);
  applyThinkingWords();

  thinkingObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "characterData") {
        scheduleThinkingScan();
        continue;
      }
      if (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0) {
        scheduleThinkingScan();
      }
    }
  });
  thinkingObserver.observe(document.documentElement, {
    subtree: true,
    childList: true,
    characterData: true
  });
}

function stopThinkingSwap() {
  thinkingObserver?.disconnect();
  thinkingObserver = undefined;
  if (scanFrame) cancelAnimationFrame(scanFrame);
  scanFrame = undefined;

  for (const [node, metadata] of trackedThinkingNodes) {
    if (node.isConnected && THINKING_WORD_SET.has(splitWhitespace(node.nodeValue || "").text)) {
      node.nodeValue = metadata.original;
    }
  }
  trackedThinkingNodes.clear();
  thinkingSessions.clear();
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
