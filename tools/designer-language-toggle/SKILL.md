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
  version: "0.2"
---

# Designer language toggle

Designers ask in plain language. You run the scripts and explain the result. Lead with what changed on screen and what to do next (reload, or put it back). Leave out file names, Metro, and storage keys unless they ask.

Read `references/how-it-works.md` only when you need to explain why the preview wins over the saved language, or why a regional file is not what the app shows.

## Guardrails

- Make local, uncommitted edits only. The locale scripts may patch `locales/i18n.js` and write the gitignored preview files listed in the README.
- Always offer to revert after you change the preview. Tell them the revert command in the same reply.
- Never edit `locales/languages/*.json`. Crowdin owns them (`crowdin.yml`). Do not "fix" a translation in those files.
- Never commit, push, or open a pull request unless the person explicitly asks.
- Right-to-left languages like Arabic aren't supported in the app yet, so this preview won't mirror the layout. Say that once. Do not try to turn it on.

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
| Check Perps in German | Repo copy, then the preview. Run `check-strings.js --lang de --feature perps`. Offer `apply-locale.js --locale de` if they want to see it. |
| Check this Figma screen in German | Paste the Figma link. Run `check-figma.js --url "<figma url>" --lang de`. Add more languages with `--lang de,ja,ru`. Optional `--pseudo`. No manual export. |
| Check this Figma copy in Japanese | A strings file, when there is no Figma token. Run `check-file.js --file <strings.csv> --lang ja`. Optional `--pseudo` pads accented English and labels it pseudo. It does not translate. |
| Same for Social, or a namespace | `--feature social` or `--namespace social_leaderboard` |
| Show the longest real translation of every string | `apply-locale.js --pseudo longest` |
| Find text that can't be translated (hard-coded English) | `apply-locale.js --pseudo accented` |
| Which strings are on this screen, for a linguist | `screenshot-keys.js --feature perps --lang de` (or `social`) |
| Only this part of the screen | `screenshot-keys.js --feature perps --match PerpsProPositionCard`. Without it, a designer gets all 1234 Perps keys. |
| Report a translation problem | Fill in `FEEDBACK.md`, then submit it through Laurel's intake form |
| Put it back / revert | `revert-locale.js` |

Run the scripts from the repo root with `node tools/designer-language-toggle/scripts/<name>.js`.

`--limit` caps how many examples the string check prints (default 15). `--ratio` changes the growth hint (default 1.4). `--match` limits the screenshot list to files whose path contains that text. `--pseudo longest` and `--pseudo accented` can be combined with `--languages en,ja` when the picker should be shorter during the stress test. To switch to another language, just run apply again. You don't need to revert first.

Shipped languages: de, el, en, es, fr, hi, id, ja, ko, pt, ru, tl, tr, vi, zh. Mention regional files only if someone asks about pt-BR, ja-JP, or zh-CN. Those files are not what the app loads. `pt-BR` checks `pt.json` (what the app loads) and also mentions `pt-br.json`. `ja-JP` and `zh-CN` work the same way.

## Show the app in a language

1. Run `apply-locale.js --locale <language>`.
2. Tell them to reload the Android preview.
3. Say which language is on, and that the choice is local and uncommitted. Right-to-left languages like Arabic aren't supported in the app yet, so this preview won't mirror the layout.
4. Offer to revert. Give them:

```bash
node tools/designer-language-toggle/scripts/revert-locale.js
```

If the preview does not pick up the change, point them at Settings > General > Current language.

Do not use `--dry-run` unless they only want to see the plan.

To switch to another language, just run apply again. You don't need to revert first.

## Limit the language picker

`apply-locale.js --languages en,ja` changes `getLanguages()`, which is the list behind Settings > General > Current language. It does not change the current locale unless you also pass `--locale`. A language that is already saved can stay active even if it is hidden from the list. Say that.

## Flag strings

```bash
node tools/designer-language-toggle/scripts/check-strings.js --lang de --feature perps
```

Lead with strings that are too long and button-sized. Then the focus controls. Then missing and still English.

"Too long" is a hint, since sentences wrap. Missing means there's no translation yet, and still English means the translation matches the English.

Over the limit is a hard failure. The Pro buttons are 10 characters. Post to feed is 20 characters. If a Post to feed translation doesn't fit, it falls back to "Post". A width hint counts CJK as 2 per character and does not decide the limit. Do not dump the whole list unless they ask.

`--strict` includes strings that are English in most languages (product names and tokens). Default skips those.

The check never writes locale JSON. `--format json` prints the same findings as JSON when a tool needs them. Fields stay source, feature, component, description, and max_length.

## Check a Figma link

A designer can paste a Figma link. The link can be a page, a section, or a frame. A branch link uses the branch, not the main file.

```bash
node tools/designer-language-toggle/scripts/check-figma.js --url "<figma url>" --lang de
```

`--lang` accepts a comma list, for example `--lang de,ja,ru`. `--json` prints the report. `--pseudo` is still a labeled length stand-in, not a translation.

The report prints every row. It does not stop at 20. "Might break" counts every language whose candidates straddle the limit, including languages inside a row that is also a hard break. `--json` includes the chosen key.

### Replit

1. In the Figma account menu, open Settings, then Security, and create a personal access token with the read-only file content scope.
2. In Replit, open Secrets and add `FIGMA_TOKEN`. Do not paste the token into chat.
3. Ask the agent: check this Figma screen in German, and paste the frame link.

### Cursor

1. Create the same read-only Figma personal access token.
2. Put `FIGMA_TOKEN=...` in a `.env` file at the repo root. That file is gitignored. Do not commit it or paste it into chat.
3. Ask the agent: check this Figma screen in German, and paste the frame link.

If `FIGMA_TOKEN` is not set and this agent has a Figma connection, pull the text nodes and save them as JSON in the file-adapter shape. Then run `check-file.js`. Each text node needs id, name, characters, width, height, visible, and the ancestor frame path, treating a hidden ancestor as hidden. Also include `textAutoResize` (`style.textAutoResize`), `fontSize`, `lineHeightPx`, and `maxLines` when Figma has them, so the check can tell a single line from wrapping text. The read from the API is cached under `tools/designer-language-toggle/.cache/figma/`, which is gitignored.

Classification defaults live in `references/figma-rules.json`. Edit `controlAncestors` and `tabAncestors` there to change which frames count as controls. Matching is case-insensitive and token-based. It accepts a plural and camelCase, so Buttons, Button Group, ButtonGroup, PrimaryButton, CTA, CTAs, Actions, Tabs, Chips, Pills, and Segmented match. Buttonhole and Table do not. A layer whose name contains `[button]` is a button even when the layer is named after its own text. Other narrow text is a label or a wrap check based on its width.

Controls of 120px or less have a separate group, "Over the 10-character button guideline". That guideline counts characters, not glyph width, so a 7-character Japanese string is not over 10. The pixel check is separate. Glyph width is an estimate of font size × 0.5 per display unit, so a fullwidth character is about one font size. Set `fonts` in `references/figma-rules.json` when a real font file should replace that average. "Already over in English (measured)" means the English glyphs exceed a resolved available width greater than 0. A width of 0, or no fixed parent, is "Check visually".

Auto-width text walks up to the first ancestor that is FIXED, FILL, or clips. At that ancestor the available width is the inner width minus the other visible children in a horizontal row and the gaps between visible children. The child on the path to the text is not subtracted. Hidden children and absolute-positioned children take no width and no gap. HEIGHT text that can grow is a layout note, "grows to N lines (box currently M)", unless `maxLines`, a clipping or fixed-height ancestor, or TRUNCATE caps it. Wrapping breaks on spaces, and CJK breaks per character.

A string is skipped only when it is purely data or purely a placeholder. Decimals, over/under lines, scores, odds, cents, percents, dollar amounts, compact numbers such as `$4.8M`, `61K`, `1.2B`, and `12.3K`, clocks, dates, lone punctuation, and multipliers such as `40x` are data. Time-range chips `1H`, `1D`, `1W`, `1M`, `3M`, `1Y`, `YTD`, and `ALL` are controls. `30+ points` stays in the check as `{num}+ points`. Names, data, and slots keep their English length in every language. Only the copy words are translated or estimated, so `Mayo vs. Kasnikowski` does not grow the names. The report shows the translated template with its example, such as `Kaufen {price}` and example `Kaufen 54¢`. Edit `timeRangeTokens` and `dataTokens` to change those lists.

Labels, titles, and body copy use the pixel check, not the 10-character cap. Every overflow or wrap line says whether it was measured (`measured: box 285px, needs 1 line`) or is only an estimate. Unconstrained auto-width text is listed under "Check visually". HEIGHT text still reports extra lines, for example "wraps to 3 lines, box fits 2". The same text keeps separate rows when the kind, width, auto-resize, max lines, or `[max:N]` differ. Identical verdicts collapse to the worst box and list every screen.

`Team A` or `Team B` inside a longer string becomes a `{name}` slot, so `{name} vs. {name}` and the grammar around it stay in the check. A string that is only placeholders is skipped. Edit `placeholderPatterns` in `references/figma-rules.json` to change that list. A shipped English string matches only when it is the same text after trimming. Values shorter than 3 characters, or made only of punctuation, are ignored, and a shorter English value is not matched inside a longer string. When one English string matches several keys, a frame name or `--context predict,perps` picks the feature from `contextHints`. For each language, the shortest candidate among those keys decides: that language is a hard break when the shortest is over, and "might break" when the candidates straddle the limit. The string is a hard break if any language is. A matched key with no value for a language uses the 1.4× estimate for that language and labels it estimate. `[copy]` keeps a layer and `[skip]` drops it. Trust the text, not the layer name. `--pseudo` pads button and tab labels and compares that padding with the limit for that control.

## Design-stage copy

Screens that are still in Figma are not in `locales/languages`. Ask for a strings CSV or JSON (`id`, `layer_name`, `frame_path`, `text`, `chars`, `kind`) and run `check-file.js`. Rows marked `placeholder_or_annotation` or `number_or_data` are skipped. There is no machine translation. `--pseudo` is a length stand-in, labeled pseudo, and it is not Japanese or any other language.

Accepted linguist corrections live in `references/learned/` for now. You can edit those JSON files by hand. The v0.2 source of truth for accepted corrections will be a Notion page Laurel Klafehn reviews. A later slice syncs that page into `references/learned/`. This slice does not call Notion. When a string matches a stored correction, say that linguists prefer the stored wording.

## Pseudo and screenshots

- accented shows English with accents inside ⟦ ⟧. Text without brackets isn't going through translation, and a missing ⟧ means the string is cut off. Use longest to test length.
- `longest` shows the longest real translation of every string.
- After either one, tell them to reload, and how to revert.
- While a stress test is on, Settings shows the language as 'ps'. That's expected.
- For linguists, run `screenshot-keys.js --lang <language>`. It lists the English string, the translation, the character count, the limit, every `{{placeholder}}`, and sibling plural forms. Placeholders count toward the limit. `Close {{count}}` is 15 characters. Point at `FEEDBACK.md`. Do not file the JSON edit yourself.
- The key list can miss strings that are built in code, so compare it with the screenshot.
- `--format json` uses Laurel's context fields: source, feature, component, description, max_length.

## If a script fails

Stop. Show the error. Do not hand-edit `locales/languages`. If `locales/i18n.js` is patched and the backup is missing, do not guess: say it needs to be restored, and do not run `git checkout` unless they ask.
