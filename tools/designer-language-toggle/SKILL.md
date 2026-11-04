---
name: designer-language-toggle
description: >
  Preview MetaMask Mobile in another language and check translation length for
  designers on Replit Agent or Cursor. Use when someone asks to show the app in
  a language, limit the language picker (for example English and Japanese),
  flag missing, still-English, or too-long strings, stress truncation with a
  pseudo-locale, or list string keys for a screenshot. Covers the 15 shipped
  locales. Perps and Social are the first screens. Does not edit Crowdin JSON,
  does not commit or open a pull request, and does not enable RTL.
compatibility: Node.js 18+ in a MetaMask Mobile checkout. Replit Agent or any agent that reads Agent Skills.
metadata:
  author: MetaMask Mobile design
  version: "0"
---

# Designer language toggle

Designers ask in plain language. You run the scripts and explain the result. They are not expected to know file paths.

Read `references/how-it-works.md` only when you need to explain why the preview wins over the saved language, or why a regional file is not what the app shows.

## Guardrails

- Make local, uncommitted edits only. The locale scripts may patch `locales/i18n.js` and write the gitignored preview files listed in the README.
- Always offer to revert after you change the preview. Tell them the revert command in the same reply.
- Never edit `locales/languages/*.json`. Crowdin owns them (`crowdin.yml`). Do not "fix" a translation in those files.
- Never commit, push, or open a pull request unless the person explicitly asks.
- RTL is off. Say that when you change language or report a check. Do not try to turn RTL on.

## Install

The tracked folder is `tools/designer-language-toggle/`. This repo gitignores `.agents/skills/` and `.cursor/skills/`, so Replit will not see the skill until it is linked:

```bash
node tools/designer-language-toggle/scripts/link-skill.js
```

Start a new Agent chat after linking.

## What they might ask

| They say | You run |
| --- | --- |
| Show the app in German / Japanese / … | `apply-locale.js --locale de` (or `ja`, `pt-BR`, `german`, …) |
| Only enable English and Japanese | `apply-locale.js --languages en,ja` |
| Both: show Japanese, and only list English and Japanese | `apply-locale.js --locale ja --languages en,ja` |
| Flag strings in German for Perps | `check-strings.js --lang de --feature perps` |
| Same for Social, or a namespace | `--feature social` or `--namespace social_leaderboard` |
| Stress truncation / pseudo / longest translation | `apply-locale.js --pseudo longest` or `--pseudo accented` |
| Which strings are on this screen, for a linguist | `screenshot-keys.js --feature perps` (or `social`) |
| Put it back / revert | `revert-locale.js` |

Run the scripts from the repo root with `node tools/designer-language-toggle/scripts/<name>.js`.

Shipped languages: de, el, en, es, fr, hi, id, ja, ko, pt, ru, tl, tr, vi, zh. `pt-BR` checks `pt.json` (what the app loads) and also mentions `pt-br.json`. `ja-JP` and `zh-CN` work the same way.

## Show the app in a language

1. Run `apply-locale.js --locale <language>`.
2. Tell them to reload the Android preview so Metro picks up `locales/i18n.js`.
3. Say which language is on, that the choice is local and uncommitted, and that RTL is off.
4. Offer to revert. Give them:

```bash
node tools/designer-language-toggle/scripts/revert-locale.js
```

If the preview is a prebuilt APK and does not serve this checkout, say so and point them at Settings > General > Current language. That picker calls `setLocale` and saves `@MetaMask:language` on the device. The script cannot write that device storage from the host.

Do not use `--dry-run` unless they only want to see the plan.

## Limit the language picker

`apply-locale.js --languages en,ja` changes `getLanguages()`, which is the list behind Settings > General > Current language. It does not change the current locale unless you also pass `--locale`. A language that is already saved can stay active even if it is hidden from the list. Say that.

## Flag strings

```bash
node tools/designer-language-toggle/scripts/check-strings.js --lang de --feature perps
```

Reply with the summary counts (missing, still English, too long), the focus controls, and a few examples. Do not dump the whole list unless they ask. Mention regional files in one or two sentences: they are checked, and the app does not import them.

`--strict` includes strings that are English in most languages (product names and tokens). Default skips those.

The check never writes locale JSON.

## Pseudo and screenshots

- `accented` makes overflow obvious (bracketed, accented English).
- `longest` uses the widest shipped translation of each key.
- After either one, tell them to reload, that RTL is off, and how to revert.
- Settings shows `ps` for this mode because the screen keeps only the first two letters of the locale code. The strings are still the stress bundle.
- For linguists, run `screenshot-keys.js` and point at `FEEDBACK.md`. Do not file the JSON edit yourself.

## If a script fails

Stop. Show the error. Do not hand-edit `locales/languages`. If `locales/i18n.js` is patched and the backup is missing, do not guess: say it needs to be restored, and do not run `git checkout` unless they ask.
