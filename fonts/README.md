# Local fonts

No font binaries are committed to this repository.

For the full experience, install these fonts locally before loading the extension:

- Serif mode: Anthropic Serif (preferred); `Jia Editorial Serif Codex VF` and Source Han Serif SC SemiBold are CJK fallbacks
- Sans mode: Anthropic Sans; Chinese falls back to ChatGPT's system sans-serif stack
- Code: Anthropic Mono

The CSS recognizes direct Anthropic family names first, then their web-font full
and PostScript names. Jia Editorial Serif is never placed ahead of Anthropic
Serif.
