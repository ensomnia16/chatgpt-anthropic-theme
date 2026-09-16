const DEFAULTS = Object.freeze({
  fontMode: "serif",
  anthropicColors: false,
  claudeThinking: false,
  claudeThinkingAnimation: false
});

// Verified subset of Claude Code spinner verbs extracted from the shipped
// binary and cross-checked against independent community collections.
const ENGLISH_THINKING_WORDS = Object.freeze([
  "Pondering",
  "Contemplating",
  "Cogitating",
  "Ruminating",
  "Musing",
  "Percolating",
  "Noodling",
  "Puzzling",
  "Wondering",
  "Exploring",
  "Discovering",
  "Mapping",
  "Plotting",
  "Seeking",
  "Tinkering",
  "Crafting",
  "Weaving",
  "Churning",
  "Coalescing",
  "Brewing",
  "Marinating",
  "Meandering",
  "Conjuring",
  "Doodling",
  "Stargazing",
  "Wibbling",
  "Moseying",
  "Booping"
]);

const CHINESE_THINKING_WORDS = Object.freeze([
  "深思中",
  "沉思中",
  "潜思中",
  "反刍中",
  "冥想中",
  "酝酿中",
  "琢磨中",
  "推敲中",
  "思索中",
  "探索中",
  "发掘中",
  "梳理中",
  "谋划中",
  "寻索中",
  "调试中",
  "打磨中",
  "编织中",
  "推演中",
  "汇聚中",
  "冲泡中",
  "腌制中",
  "漫游中",
  "施法中",
  "涂画中",
  "观星中",
  "晃悠中",
  "闲逛中",
  "啵啵中"
]);

// Includes legacy replacements so an in-flight status from an older extension
// version can be adopted without starting a second randomization loop.
const LEGACY_ENGLISH_WORDS = Object.freeze([
  "Thinking",
  "Generating",
  "Reasoning",
  "Analyzing",
  "Reflecting",
  "Considering",
  "Synthesizing",
  "Deliberating",
  "Investigating",
  "Formulating"
]);

const LEGACY_CHINESE_WORDS = Object.freeze([
  "正在思考",
  "思考中",
  "正在生成",
  "生成中",
  "推理中",
  "分析中",
  "反思中",
  "斟酌中",
  "整合中",
  "权衡中",
  "研究中",
  "构思中"
]);

const ALL_ENGLISH_WORDS = Object.freeze([...ENGLISH_THINKING_WORDS, ...LEGACY_ENGLISH_WORDS]);
const ALL_CHINESE_WORDS = Object.freeze([...CHINESE_THINKING_WORDS, ...LEGACY_CHINESE_WORDS]);
const THINKING_WORD_SET = new Set([...ALL_ENGLISH_WORDS, ...ALL_CHINESE_WORDS]);
const ENGLISH_WORD_SET_LOWERCASE = new Set(ALL_ENGLISH_WORDS.map((word) => word.toLowerCase()));
const trackedThinkingNodes = new Map();
const thinkingSessions = new Map();
let thinkingObserver;
let scanFrame;
let replaceThinkingWords = false;
let titleObserver;
let lastCleanedTitle;
let projectObserver;
let projectScanFrame;

const PROJECT_CONVERSATION_PATTERN = /^\/g\/g-p-[^/]+\/c(?:\/|$)/;
const PROJECT_ROOT_PATTERN = /^\/g\/(g-p-[^/]+)/;
const KNOWN_PROJECTS_KEY = "knownProjects";

function removeProjectNameFromTitle() {
  if (!PROJECT_CONVERSATION_PATTERN.test(location.pathname)) return;
  if (document.title === lastCleanedTitle) return;

  const separatorIndex = document.title.indexOf(" - ");
  if (separatorIndex < 1) return;

  const conversationTitle = document.title.slice(separatorIndex + 3).trim();
  if (conversationTitle) {
    lastCleanedTitle = conversationTitle;
    document.title = conversationTitle;
  }
}

function startProjectTitleCleanup() {
  removeProjectNameFromTitle();

  const title = document.querySelector("title");
  if (!title || titleObserver) return;

  titleObserver = new MutationObserver(removeProjectNameFromTitle);
  titleObserver.observe(title, { childList: true, characterData: true, subtree: true });
}

function getProjectNewChatUrl() {
  const projectMatch = location.pathname.match(PROJECT_ROOT_PATTERN);
  if (!projectMatch) return null;

  const projectSegment = projectMatch[1];
  for (const anchor of document.querySelectorAll("a[href]")) {
    try {
      const url = new URL(anchor.href, location.origin);
      const candidate = url.pathname.match(/^\/g\/(g-p-[^/]+)\/project\/?$/);
      if (
        url.origin === location.origin &&
        candidate &&
        (candidate[1] === projectSegment || candidate[1].startsWith(`${projectSegment}-`))
      ) {
        return url.href;
      }
    } catch {
      // Ignore links with unsupported URL schemes.
    }
  }

  return `${location.origin}/g/${projectSegment}/project`;
}

function projectNameFromAnchor(anchor, url) {
  const label = anchor.getAttribute?.("aria-label") || anchor.getAttribute?.("title") || anchor.textContent;
  const normalized = label?.replace(/\s+/g, " ").trim();
  if (normalized) return normalized;

  const slug = url.pathname.match(/^\/g\/g-p-[^-\/]+-(.+)\/project\/?$/)?.[1];
  return slug || "ChatGPT 项目";
}

function discoverProjects() {
  const projects = new Map();
  for (const anchor of document.querySelectorAll("a[href]")) {
    try {
      const url = new URL(anchor.href, location.origin);
      if (url.origin !== location.origin || !/^\/g\/g-p-[^/]+\/project\/?$/.test(url.pathname)) continue;
      projects.set(url.href, { url: url.href, name: projectNameFromAnchor(anchor, url) });
    } catch {
      // Ignore links with unsupported URL schemes.
    }
  }

  const currentUrl = getProjectNewChatUrl();
  if (currentUrl && !projects.has(currentUrl)) {
    const prefix = document.title.split(" - ")[0]?.trim();
    projects.set(currentUrl, { url: currentUrl, name: prefix || "当前 ChatGPT 项目" });
  }
  if (projects.size === 0) return;

  chrome.storage.local.get({ [KNOWN_PROJECTS_KEY]: [] }, (settings) => {
    const merged = new Map(
      (Array.isArray(settings[KNOWN_PROJECTS_KEY]) ? settings[KNOWN_PROJECTS_KEY] : [])
        .filter((project) => project?.url && project?.name)
        .map((project) => [project.url, project])
    );
    for (const project of projects.values()) merged.set(project.url, project);
    chrome.storage.local.set({ [KNOWN_PROJECTS_KEY]: [...merged.values()] });
  });
}

function scheduleProjectDiscovery() {
  if (projectScanFrame) return;
  projectScanFrame = requestAnimationFrame(() => {
    projectScanFrame = undefined;
    discoverProjects();
  });
}

function startProjectDiscovery() {
  discoverProjects();
  if (projectObserver) return;
  projectObserver = new MutationObserver(scheduleProjectDiscovery);
  projectObserver.observe(document.documentElement, { subtree: true, childList: true });
}

function normalizedThinkingText(value) {
  return value.replace(/\s*(?:\u2026{1,2}|\.{3})\s*$/u, "").trim();
}

function isThinkingText(value) {
  const normalized = normalizedThinkingText(value);
  return THINKING_WORD_SET.has(normalized) ||
    ENGLISH_WORD_SET_LOWERCASE.has(normalized.toLowerCase());
}

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
  if (message) {
    return message.getAttribute("data-message-author-role") === "assistant" &&
      !parent.closest(".markdown, [class*='prose']");
  }

  return Boolean(
    parent.closest("[role='status'], [aria-live='polite'], [aria-live='assertive']") ||
    parent.closest("main")
  );
}

function getThinkingAnchor(node) {
  const parent = node.parentElement;
  return parent?.closest(
    "[role='status'], [aria-live='polite'], [aria-live='assertive'], [data-message-author-role='assistant']"
  ) || parent?.closest("main") || parent;
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
    clearTimeout(metadata.session.cleanupTimer);
    metadata.session.cleanupTimer = setTimeout(() => {
      if (metadata.session.nodes.size > 0) return;
      for (const element of metadata.session.elements) {
        delete element.dataset.cgptThinkingActive;
      }
      thinkingSessions.delete(metadata.anchor);
    }, 900);
  }
}

function trackThinkingNode(node) {
  if (trackedThinkingNodes.has(node) || !isSafeThinkingContext(node)) return;

  const parts = splitWhitespace(node.nodeValue || "");
  if (!isThinkingText(parts.text)) return;

  const anchor = getThinkingAnchor(node);
  if (!anchor) return;

  let session = thinkingSessions.get(anchor);
  if (!session) {
    const language = /[\u3400-\u9fff]/.test(parts.text) ? "zh" : "en";
    session = {
      word: randomThinkingWord(language),
      nodes: new Set(),
      elements: new Set(),
      cleanupTimer: undefined
    };
    thinkingSessions.set(anchor, session);
  }
  clearTimeout(session.cleanupTimer);

  const element = node.parentElement;
  if (element) {
    element.dataset.cgptThinkingActive = "on";
    session.elements.add(element);
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
    if (!isThinkingText(current)) {
      untrackThinkingNode(node);
      continue;
    }

    const replacement = replaceThinkingWords
      ? `${metadata.leading}${metadata.session.word}${metadata.trailing}`
      : metadata.original;
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
    if (node.isConnected && isThinkingText(splitWhitespace(node.nodeValue || "").text)) {
      node.nodeValue = metadata.original;
    }
  }
  for (const session of thinkingSessions.values()) {
    clearTimeout(session.cleanupTimer);
    for (const element of session.elements) delete element.dataset.cgptThinkingActive;
  }
  trackedThinkingNodes.clear();
  thinkingSessions.clear();
}

function applySettings(settings) {
  const root = document.documentElement;
  const mode = settings.fontMode === "sans" ? "sans" : "serif";

  root.dataset.cgptFontMode = mode;
  root.dataset.cgptAnthropicColors = settings.anthropicColors ? "on" : "off";
  root.dataset.cgptThinkingAnimation = settings.claudeThinkingAnimation ? "on" : "off";
  replaceThinkingWords = Boolean(settings.claudeThinking);

  if (settings.claudeThinking || settings.claudeThinkingAnimation) startThinkingSwap();
  else stopThinkingSwap();

  if (thinkingObserver) applyThinkingWords();
}

chrome.storage.sync.get(DEFAULTS, applySettings);

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    startProjectTitleCleanup();
    startProjectDiscovery();
  }, { once: true });
} else {
  startProjectTitleCleanup();
  startProjectDiscovery();
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "getProjectNewChatUrl") return;
  discoverProjects();
  sendResponse({ url: getProjectNewChatUrl() });
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "sync") return;
  chrome.storage.sync.get(DEFAULTS, applySettings);
});
