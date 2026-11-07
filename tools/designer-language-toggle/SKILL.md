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

Auto-width text keeps walking through a HUG or AUTO ancestor even when that ancestor clips. Each HUG level reserves its own padding, gaps, and the other visible children before the next level is measured. It stops at the first ancestor that is FIXED on that axis. If nothing is left, the row says "no room in English layout". When a HUG row is wider than the nearest fixed viewport, even if it is that viewport's only child, each single self-sized label keeps its own width and the row is one "Check visually" item: "row is wider than its container; may scroll". It is not "Already over in English". A row that shares space with icons or other fixed siblings calculates the remainder first. Zero or less is "no room in English layout". A positive remainder that is still tighter than the English text is a layout problem. Unclipped crowding by itself is not scrolling. FILL uses that parent's inner width minus the other visible children. The child on the path to the text is not subtracted. Hidden children and absolute-positioned children take no width and no gap. A difference of 2px or 5% is borderline, not a confident layout problem. If the English is already crowded and a translation is worse, both are reported and cross-referenced. Each language line is one verdict: guideline only, pixel only, both, or fits, with the character count and the pixel need written the same way. "Breaks with real translations" contains pixel breaks only. A string that is already wider than its slot is one "Layout problems in the English design" row, not a localization break. HEIGHT text that can grow is a layout note, "grows from N to M lines; check container height", unless `maxLines`, a non-hugging clip, or TRUNCATE caps it. Line height may be pixels, a percent of the font size, or auto (1.2× the font size). English lines are the measured height divided by that line height. Label rows print the translated template with its slot, for example `Zum Sieg {price}`. A ranged translation is "might break (8–14 chars across 3 keys)" only when some candidate crosses the pixel limit or the 10-character guideline and some does not. When every candidate fits, the line is "fits (8–14 chars across 3 keys; all fit)". When every candidate breaks, the language is a break. The same 2px or 5% borderline tolerance applies to a translated label: a translation the same width as borderline English is borderline, not an overflow. Pixel numbers are rounded to one decimal and labeled as an average character width, not shaped glyphs. Wrapping breaks on spaces, and CJK breaks per character. A plain name such as Aidan Mayo, M. Kasnikowski, or CAR is `kind=name` on frames listed in `nameHints`, and it is not given a translation estimate. A hint matches whole `/`-separated layer names, so `Feed / Market` does not match `Feed / Markets`. A string that equals a shipped locale value stays copy.

A string is skipped only when it is purely data or purely a placeholder. Decimals, over/under lines, scores, odds, cents, percents, dollar amounts, compact numbers such as `$4.8M`, `61K`, `1.2B`, and `12.3K`, clocks, dates, lone punctuation, and multipliers such as `40x` are data. Time-range chips `1H`, `1D`, `1W`, `1M`, `3M`, `1Y`, `YTD`, and `ALL` are controls. `30+ points` stays in the check as `{num}+ points`. Names, data, and slots keep their English length in every language. Only the copy words are translated or estimated, so `Mayo vs. Kasnikowski` does not grow the names. The report shows the translated template with its example, such as `Kaufen {price}` and example `Kaufen 54¢`. Edit `timeRangeTokens` and `dataTokens` to change those lists.

Labels, titles, and body copy use the pixel check, not the 10-character cap. Every overflow or wrap line says whether it was measured (`measured: box 285px, needs 1 line`) or is only an estimate. Unconstrained auto-width text is listed under "Check visually". HEIGHT text still reports extra lines, for example "grows from 2 to 3 lines; check container height". A horizontal clip on an ancestor does not hide that note. A container that clips vertically adds "container clips; text may be cut off". `{name} · Album` splits when the word after the dot is short copy or a shipped locale value, even on a path that is not a name hint. The same text keeps separate rows when the kind, width, auto-resize, max lines, or `[max:N]` differ. Identical verdicts collapse to the worst box and list every screen.

`Team A` or `Team B` inside a longer string becomes a `{name}` slot, so `{name} vs. {name}` and the grammar around it stay in the check. A string that is only placeholders is skipped. Edit `placeholderPatterns` in `references/figma-rules.json` to change that list. A shipped English string matches only when it is the same text after trimming. Values shorter than 3 characters, or made only of punctuation, are ignored, and a shorter English value is not matched inside a longer string. When one English string matches several keys, a frame name or `--context predict,perps` picks the feature from `contextHints`. For each language, "might break" means some candidate crosses the pixel limit or the 10-character guideline and some candidate does not. When every candidate fits, the line says all fit. When every candidate breaks, that language is a break. The string is a hard break if any language is. A matched key with no value for a language uses the 1.4× estimate for that language and labels it estimate. `[copy]` keeps a layer and `[skip]` drops it. Trust the text, not the layer name. `--pseudo` pads button and tab labels and compares that padding with the limit for that control.

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
