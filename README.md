# ChatGPT Anthropic Typography

A local Chrome extension that gives ChatGPT two Anthropic-inspired typography
modes and an optional warm color palette.

## Features

- **Serif** — prefers `Jia Editorial Serif Codex VF`, where regular CSS text maps
  Chinese to physical Source Han Serif 600 and keeps Anthropic Serif Latin and
  selected punctuation. It falls back to locally installed Anthropic Serif and
  Source Han Serif SC SemiBold.
- **Sans** — Anthropic Sans for Latin text, with ChatGPT's default system
  sans-serif stack for Chinese.
- **Code** — Anthropic Mono for code blocks, inline code, and keyboard labels.
- **Math** — preserves KaTeX's own math families.
- **Colors** — optional warm paper, clay, and ink palette inspired by Anthropic's
  visual language, with light and dark variants.
- Settings sync through Chrome and apply immediately without reloading ChatGPT.

## Install

1. Download or clone this repository.
2. Open `chrome://extensions/` in Chrome.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select this repository folder.
5. Open ChatGPT and click the extension icon to choose a mode.

## Fonts

Font binaries are not included. Install the relevant fonts locally, then restart
Chrome if necessary. See [fonts/README.md](fonts/README.md) and
[NOTICE.md](NOTICE.md).

Without the optional fonts, the extension falls back to standard serif,
sans-serif, and monospace families.

## Supported sites

- `https://chatgpt.com/*`
- `https://chat.openai.com/*`

## Privacy

The extension has no analytics, network requests, or remote code. It stores only
two preferences in Chrome sync storage: the selected font mode and whether the
color palette is enabled.

## License

Extension source code is released under the [MIT License](LICENSE). Font files
are not part of this license or repository.
