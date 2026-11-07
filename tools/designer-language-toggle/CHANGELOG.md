# Changelog

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
