# Changelog

- A HUG label in a row that may scroll is not a pixel hard break. The row gets one note, "row gets wider in de (+Npx in the widest language); check scrolling", and the 10-character guideline still applies on its own. A `{name} {pct}` string that is already too wide in English, and whose slots do not grow, stays an English layout problem and names the languages that share that collision. HEIGHT notes say "may grow from N to M lines (estimated at 1.4× English length)" unless a shipped translation was measured, in which case the note names that translation.

- A HUG row that is wider than the fixed viewport around it keeps each label's own width, including when that row is the viewport's only child, and the row is one "Check visually" item. A crowded row that shares space with icons is "no room in English layout" when the remainder is zero or less; that remainder is calculated before any own-width fallback. `Name · Album` splits the short copy word without a name-hint path. HEIGHT growth notes are not suppressed by a horizontal clip. A container that clips vertically adds "container clips; text may be cut off".

- A row wider than its fixed parent keeps each item's own width when it scrolls or does not clip. A clipped row with no scroll metadata is only "Check visually", with the note "row is wider than its container; may scroll". Path hints match whole layer-name segments, so Feed / Market does not match Feed / Markets, and a shipped locale value stays copy. A range is "might break" only when some candidate crosses the pixel limit or the 10-character guideline and some does not. When every candidate fits, the line is "fits (8–14 chars across 3 keys; all fit)". HEIGHT notes resolve pixel, percent, and auto line height (auto is 1.2× the font size). A translation the same width as borderline English is borderline. Label rows print the slot, for example `Zum Sieg {price}`.

- Crossing a HUG wrapper now reserves that wrapper's padding, gaps, and siblings. No remaining room is "no room in English layout". A ranged translation says might break with the min–max count. HEIGHT body text notes when a translation needs more lines. Names tagged with a path hint or `[name]` are not inflated, and a crowded English layout still reports a worse translation.

- A clipping HUG wrapper no longer freezes the available width; the walk stops at a FIXED ancestor. Each language line uses one verdict (guideline only, pixel only, both, or fits). The 10-character group counts characters. Plain names are not estimated. English that is already wider than its slot is a layout problem. HEIGHT growth is a layout note when nothing caps it.

- Available width no longer subtracts the text's own wrapper. Hidden and absolute children take no space. The 10-character button guideline is its own group and counts characters, so 7 Japanese characters are not over 10. Measured "already over" requires a resolved width greater than 0. Names and slots keep their English length. Time-range chips are controls. The report prints every row, and auto-height growth is a note unless a cap stops it.

- Width checks use pixels. The per-character width comes from the font size or from auto-width text, and the available width comes from the box or from the nearest auto-layout parent that does not hug its content. A 20px box and a 2000px box no longer share one budget. Unconstrained auto-width text is "Check visually". Slot lengths are also checked at the maximums in `slotMaxLengths`.
- `30+ points` keeps the words `{num}+ points`. Adjacent names such as `First Last 27%` are one `{name}` slot. `Player A` is a placeholder. Deduping no longer mixes one occurrence's width with another's height.

- A hard break is decided per language. One language over the limit puts the string in "Breaks with real translations" even when another language fits. "Might break" is only a language whose own candidates straddle the limit.
- Copy words keep their spaces. Compact numbers, unmatched proper names, team codes, and scoreboard tokens become slots, and a slotted control uses the width budget. `Team A` inside a longer string becomes `{name}` instead of dropping the whole string. The same text in two kinds stays two rows. Titles and body copy use the text overflow group, and HEIGHT text reports how many extra lines it needs.

- Mixed copy such as `Buy 54¢` and `<Name> 81%` is checked as a template plus data tokens. Only a purely data string is skipped. Lone punctuation and multipliers such as `40x` are data.
- Labels get a width budget. HEIGHT text is judged by its line count, and a fixed or WIDTH_AND_HEIGHT label can overflow. Missing auto-resize is an explicit single-line assumption. Label problems are reported separately from control breaks.
- When one English string matches several shipped keys, frame names and `--context` prefer a feature from `contextHints`. Otherwise the report shows the min-to-max range. A break requires the shortest translation to be over. A missing language falls back to the estimate. `--json` includes the chosen key.

- Control names match as tokens, including plurals and camelCase. Buttons, Button Group, PrimaryButton, CTA, CTAs, Actions, Tabs, Chips, Pills, and Segmented count. Buttonhole and Table do not. The list is `controlAncestors` and `tabAncestors` in `references/figma-rules.json`.
- Controls wider than 120px no longer use a flat 10-character limit. The budget comes from the measured width and the English string's display width, plus the checker's 1.4× and 4-unit headroom. English that fits the box is not already over. A longer translation is flagged when it exceeds that width. `[max:N]` on the layer name, or `maxCharacters` in `references/learned/limits.json`, overrides the budget.

- The 10-character limit applies only to real controls, plus any layer marked `[button]`. Other narrow text is a label or a wrap check, and it is not "already over in English". Placeholder names, including Team A inside a longer string, are editable in `placeholderPatterns`. Odds, scores, clocks, dates, decimals, and similar figures are skipped. Ship matching ignores English shorter than 3 characters or made only of punctuation, and it requires the same text after trimming. `--pseudo` measures the button and tab bucket against that control's limit.

## v0.2 slice B

- `check-figma.js` reads a Figma link through the REST API when `FIGMA_TOKEN` is set. The extract is cached under `tools/designer-language-toggle/.cache/figma/` and is not committed.
- Classification defaults live in `references/figma-rules.json`. `[copy]` keeps a layer and `[skip]` drops it. Hidden ancestors, fallback text, SF Symbols, and data-like strings are skipped.
- The designer report leads with what will break, then real shipped translations, then a labeled 1.4× estimate. `--lang` accepts a comma list. `--json` prints the report.
- If there is no token, the skill tells the agent to use a Figma connection or a read-only personal access token in Replit Secrets or a gitignored `.env`. The token is never printed.

## v0.2 slice A

- The length check lives in `lib/checker.js` and takes a plain string set. Repo locales and design-stage files are adapters.
- `check-strings.js` reads the repo through the repo adapter. Perps counts for de, ja, and hi stay the same as v0.1.
- `check-file.js` reads a strings CSV or JSON for copy that is not in the app yet. It skips annotation, number, and hidden rows, dedupes identical text, and treats controls at most 120px wide as 10-character buttons. Longer text is wrap-checked. It does not machine-translate. `--pseudo` is labeled pseudo.
- `references/learned/` holds accepted corrections, never-translate terms, and preferred phrasing. The checker can say that linguists prefer one wording over another. The files are hand-edited until a later slice syncs the Notion page Laurel Klafehn reviews.

## v0.1

- Length hints use grapheme clusters. A Hindi letter with a vowel sign counts once. CJK, kana, and hangul count as width 2, and that width is only a hint.
- Hard limits are character counts in `references/limits.json`. The Perps Pro buttons are 10. Post to feed is 20, with a fallback of "Post" when a translation doesn't fit. Placeholders count toward the limit.
- English of 25 characters or fewer can be flagged too long, as a hint. Longer English copy is "check wrapping".
- The string check reports placeholder mismatches. Russian plurals are `one` and `other` only. The app's i18n library does not use CLDR `few` or `many`.
- `screenshot-keys.js --lang` shows the translation, character count, and limit. It expands plural keys, `*_I18N` maps, and template-string keys. `--format json` uses source, feature, component, description, and max_length.
- `--match`, `--limit`, `--ratio`, and `--pseudo` with `--languages` are documented. Apply again replaces the preview. Revert also deletes a leftover `locales/i18n.js.designer-tmp`.
- The feedback note points at Laurel Klafehn's i18n intake form and uses a pt-BR example.

## v0

- Designer-facing skill for Replit Agent, using the Agent Skills layout (`SKILL.md` with `name` and `description`). The same folder works in Cursor once it is linked.
- Show the dev preview in one of the 15 shipped languages by patching `locales/i18n.js` locally, and revert that patch.
- Limit Settings > General > Current language to a chosen list.
- Flag missing strings, strings that are still English, and strings that run long versus English. Perps and Social are the first scopes. Regional files such as `ja-jp.json` are reported and are not treated as the live bundle.
- Pseudo accented and longest-translation modes for truncation reviews.
- Screenshot key list for Perps and Social, plus a feedback note for the translation team.
- RTL is reported as off and is not changed.
