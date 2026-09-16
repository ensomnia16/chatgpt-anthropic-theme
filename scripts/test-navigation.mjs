import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const contentSource = await readFile(new URL("content.js", root), "utf8");
const backgroundSource = await readFile(new URL("background.js", root), "utf8");

function createContentContext({ pathname, title, links = [] }) {
  let messageListener;
  let titleObserverCallback;
  const localState = {};
  const titleNode = {};
  const document = {
    title,
    readyState: "complete",
    documentElement: {},
    querySelector: (selector) => (selector === "title" ? titleNode : null),
    querySelectorAll: (selector) => (selector === "a[href]" ? links : []),
    createTreeWalker: () => ({ nextNode: () => null })
  };

  const context = {
    URL,
    document,
    location: { origin: "https://chatgpt.com", pathname },
    MutationObserver: class {
      constructor(callback) {
        this.callback = callback;
      }
      observe(target) {
        if (target === titleNode) titleObserverCallback = this.callback;
      }
      disconnect() {}
      takeRecords() {}
    },
    Node: { TEXT_NODE: 3, ELEMENT_NODE: 1 },
    NodeFilter: { SHOW_TEXT: 4 },
    requestAnimationFrame: () => 1,
    cancelAnimationFrame: () => {},
    setInterval: () => 1,
    clearInterval: () => {},
    chrome: {
      storage: {
        sync: { get: () => {}, set: () => {} },
        local: {
          get: (defaults, callback) => callback({ ...defaults, ...localState }),
          set: (values) => Object.assign(localState, values)
        },
        onChanged: { addListener: () => {} }
      },
      runtime: {
        onMessage: {
          addListener: (listener) => {
            messageListener = listener;
          }
        }
      }
    }
  };

  vm.runInNewContext(contentSource, context);
  return { document, localState, messageListener, notifyTitleChanged: () => titleObserverCallback?.([]) };
}

const projectId = "g-p-6a439d5d26648191943f0ff2d142fc0e";
const content = createContentContext({
  pathname: `/g/${projectId}/c/conversation-id`,
  title: "嘉 - 查询河套学院",
  links: [{
    href: `https://chatgpt.com/g/${projectId}-jia/project`,
    textContent: "嘉",
    getAttribute: () => null
  }]
});

assert.equal(content.document.title, "查询河套学院");
content.document.title = "嘉 - MATLAB - 仿真";
content.notifyTitleChanged();
assert.equal(content.document.title, "MATLAB - 仿真");
content.notifyTitleChanged();
assert.equal(content.document.title, "MATLAB - 仿真");

let response;
content.messageListener({ type: "getProjectNewChatUrl" }, {}, (value) => {
  response = value;
});
assert.equal(response.url, `https://chatgpt.com/g/${projectId}-jia/project`);
assert.deepEqual(
  JSON.parse(JSON.stringify(content.localState.knownProjects)),
  [{ name: "嘉", url: `https://chatgpt.com/g/${projectId}-jia/project` }]
);

const regularChat = createContentContext({
  pathname: "/c/conversation-id",
  title: "普通对话 - ChatGPT"
});
assert.equal(regularChat.document.title, "普通对话 - ChatGPT");

function createBackgroundContext(selectedProjectUrl = "") {
  let actionListener;
  let optionsOpened = false;
  const createdTabs = [];
  const backgroundContext = {
    URL,
    chrome: {
      action: { onClicked: { addListener: (listener) => (actionListener = listener) } },
      runtime: { openOptionsPage: async () => { optionsOpened = true; } },
      storage: {
        local: {
          get: async () => ({ selectedProjectUrl })
        }
      },
      tabs: {
        create: async (properties) => createdTabs.push(properties)
      }
    }
  };
  vm.runInNewContext(backgroundSource, backgroundContext);
  return { action: (tab) => actionListener(tab), createdTabs, optionsOpened: () => optionsOpened };
}

const selectedUrl = `https://chatgpt.com/g/${projectId}-jia/project`;
const selectedProject = createBackgroundContext(selectedUrl);
await selectedProject.action({ id: 42, windowId: 7, url: "https://example.com/" });
assert.deepEqual(JSON.parse(JSON.stringify(selectedProject.createdTabs)), [
  { url: selectedUrl, active: true, windowId: 7 }
]);

const noSelection = createBackgroundContext();
await noSelection.action({ id: 42, windowId: 7, url: "https://chatgpt.com/" });
assert.equal(noSelection.optionsOpened(), true);
assert.deepEqual(noSelection.createdTabs, []);

console.log("Navigation tests passed");
