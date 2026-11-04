# Changelog

## v0.1

- Length uses grapheme clusters, so a Hindi letter with a vowel sign counts once. CJK, kana, and hangul still count as width 2.
- Hard limits live in `references/limits.json`. The Perps Pro Close, Reverse, and Share buttons are width 8. Post to feed is width 16. Hits are reported as over the limit.
- English strings of 25 graphemes or fewer can be too long. Longer English copy goes to check wrapping instead of the too-long list.
- The string check also reports placeholder mismatches and plural forms that are only partly translated.
- `screenshot-keys.js` takes `--lang` and lists placeholders and plural siblings next to each key.
- `--format json` is available on the string check and the screenshot list.
- The feedback note asks for plural form, placeholders, and which length bucket you saw.

## v0

- Designer-facing skill for Replit Agent, using the Agent Skills layout (`SKILL.md` with `name` and `description`). The same folder works in Cursor once it is linked.
- Show the dev preview in one of the 15 shipped languages by patching `locales/i18n.js` locally, and revert that patch.
- Limit Settings > General > Current language to a chosen list.
- Flag missing strings, strings that are still English, and strings that run long versus English. Perps and Social are the first scopes. Regional files such as `ja-jp.json` are reported and are not treated as the live bundle.
- Pseudo accented and longest-translation modes for truncation reviews.
- Screenshot key list for Perps and Social, plus a feedback note for the translation team.
- RTL is reported as off and is not changed.
