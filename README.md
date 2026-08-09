# ChatGPT Anthropic Typography

A local Chrome extension that gives ChatGPT and Gemini two Anthropic-inspired typography
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
- **Claude-style thinking words** — chooses one verified Claude Code spinner verb
  per ChatGPT or Gemini thinking session and keeps it stable until that session
  ends. The curated list includes `Pondering`, `Contemplating`, `Cogitating`,
  `Percolating`, `Noodling`, `Puzzling`, `Exploring`, `Mapping`, `Tinkering`,
  `Coalescing`, `Wibbling`, and other verbs observed in Claude Code. Chinese UI
  labels receive matched translations such as `深思中`, `沉思中`, `酝酿中`,
  `琢磨中`, `推敲中`, and `探索中`. Gemini's `Generating` / `正在生成` states
  are recognized as thinking-session entry points as well.
- **Claude-style animation** — optional `· ✢ * ✶` spark loop with a subtle text
  breath; it respects the operating system's reduced-motion preference and never
  changes the selected word during a session.
- Settings sync through Chrome and apply immediately without reloading the page.

## Install

1. Download or clone this repository.
2. Open `chrome://extensions/` in Chrome.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select this repository folder.
5. Open ChatGPT or Gemini and click the extension icon to choose a mode.

## Fonts

Font binaries are not included. Install the relevant fonts locally, then restart
Chrome if necessary. See [fonts/README.md](fonts/README.md) and
[NOTICE.md](NOTICE.md).

Without the optional fonts, the extension falls back to standard serif,
sans-serif, and monospace families.

## Supported sites

- `https://chatgpt.com/*`
- `https://chat.openai.com/*`
- `https://gemini.google.com/*`

## Thinking-word provenance

Anthropic does not publish a fixed Claude Code spinner-verb list. This extension
uses a conservative subset cross-checked against independent community research,
including a list extracted from the Claude Code 2.1.68 binary and the curated
Verbs of Claude collection:

- https://gist.github.com/centricle/7799e5afde76c58efa6cfebc3615acaa
- https://www.verbsofclaude.com/about-verbs
- https://note.com/valen0214/n/nccdd375e5e62

Claude.ai's browser status and Claude Code's playful spinner verbs are separate
interfaces. The extension deliberately uses the latter as a style choice; it
does not claim that every verb appears on claude.ai.

## Privacy

The extension has no analytics, network requests, or remote code. It stores only
four preferences in Chrome sync storage: the selected font mode, whether the
color palette is enabled, whether Claude-style thinking words are enabled, and
whether the optional thinking animation is enabled.

## License

Extension source code is released under the [MIT License](LICENSE). Font files
are not part of this license or repository.
