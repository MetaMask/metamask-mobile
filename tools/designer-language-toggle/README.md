# Designer language toggle (v0)

A skill for designers using Replit Agent (and Cursor, with the same files) to preview MetaMask Mobile in another language and spot strings that are missing, still English, or too long.

You can ask in plain language, for example "show the app in Japanese" or "flag strings that are too long in German on Perps". The agent runs the scripts. You do not need to edit code.

## Install on Replit

Replit Agent loads skills from `.agents/skills/<name>/SKILL.md` ([Agent Skills](https://docs.replit.com/features/agent/skills)). This repo gitignores `.agents/skills/` and `.cursor/skills/`, because those folders are filled by the MetaMask skills sync. The skill therefore lives in the tracked folder `tools/designer-language-toggle/`.

On a checkout that already contains this folder:

```bash
node tools/designer-language-toggle/scripts/link-skill.js
```

That links the folder into `.agents/skills/designer-language-toggle` and `.cursor/skills/designer-language-toggle`. The links are local and gitignored. Start a new Agent chat after linking.

To pull the folder into a Replit app that tracks this GitHub repo, fetch the branch `cursor/designer-language-toggle-71a6` (or copy this folder in) and run the link command. Do not open a pull request to land it unless someone asks.

Cursor reads the same `SKILL.md` format. The link script covers both tools. No `replit.md` is required.

These preview files are gitignored so a later commit does not pick them up:

- `locales/designer-locale.override.json`
- `locales/designer-pseudo.generated.json`
- `locales/.designer-locale.i18n.js.bak`
- `locales/i18n.js.designer-tmp`

`locales/i18n.js` itself is tracked. The apply script changes it locally. Revert before you commit anything else, and do not commit that file as part of a language preview.

## What you can ask

1. **Show the app in a language.** German, Japanese, `pt-BR`, and the other shipped languages. The agent reloads the dev bundle in that language.
2. **Only enable English and Japanese** (or any other subset) in Settings > General > Current language.
3. **Flag strings** that are missing, still English, or too long. You can limit this to Perps or Social.
4. **Stress truncation** with an accented pseudo-locale or the longest shipped translation of each string.
5. **List the string keys on a screen** so a linguist has context. A blank note for that is `FEEDBACK.md`.

Shipped languages: German (de), Greek (el), English (en), Spanish (es), French (fr), Hindi (hi), Indonesian (id), Japanese (ja), Korean (ko), Portuguese (pt), Russian (ru), Filipino (tl), Turkish (tr), Vietnamese (vi), Chinese (zh).

## Commands

From the repo root:

```bash
node tools/designer-language-toggle/scripts/apply-locale.js --locale de
node tools/designer-language-toggle/scripts/apply-locale.js --languages en,ja
node tools/designer-language-toggle/scripts/apply-locale.js --locale ja --languages en,ja
node tools/designer-language-toggle/scripts/apply-locale.js --pseudo longest
node tools/designer-language-toggle/scripts/apply-locale.js --pseudo accented
node tools/designer-language-toggle/scripts/revert-locale.js

node tools/designer-language-toggle/scripts/check-strings.js --lang de --feature perps
node tools/designer-language-toggle/scripts/check-strings.js --lang ja --feature social
node tools/designer-language-toggle/scripts/check-strings.js --lang de --feature perps --format json
node tools/designer-language-toggle/scripts/screenshot-keys.js --feature perps --lang de
node tools/designer-language-toggle/scripts/self-test.js
```

After apply or revert, reload the Android preview. If that preview is a prebuilt APK and is not serving this checkout, change language in the app instead: Settings > General > Current language.

## Guardrails

- Local edits only. The agent should offer to revert.
- Never edit `locales/languages/*.json`. Crowdin owns them.
- Never commit or open a pull request unless you ask.
- RTL stays off. The report says so. v0 does not mirror the layout.

## Where the details live

- `SKILL.md` — instructions the agent follows
- `references/how-it-works.md` — why startup patching beats the saved language
- `references/screens.md` — Perps and Social screenshot notes
- `references/limits.json` — hard widths for the Pro buttons and Post to feed, plus the 25-grapheme cutoff
- `references/sample-de-perps.txt`, `references/sample-ja-perps.txt`, and `references/sample-hi-perps.txt` — Perps checks from this repo
- `references/sample-de-social.txt` and `references/sample-ja-social.txt` — Social checks
- `references/sample-screenshot-position-card.txt` — string keys on the Perps position card
- `CHANGELOG.md` — v0
- `FEEDBACK.md` — for the translation team, later
