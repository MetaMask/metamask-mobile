# Changelog

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
