# Changelog

## v0

- Designer-facing skill for Replit Agent, using the Agent Skills layout (`SKILL.md` with `name` and `description`). The same folder works in Cursor once it is linked.
- Show the dev preview in one of the 15 shipped languages by patching `locales/i18n.js` locally, and revert that patch.
- Limit Settings > General > Current language to a chosen list.
- Flag missing strings, strings that are still English, and strings that run long versus English. Perps and Social are the first scopes. Regional files such as `ja-jp.json` are reported and are not treated as the live bundle.
- Pseudo accented and longest-translation modes for truncation reviews.
- Screenshot key list for Perps and Social, plus a feedback note for the translation team.
- RTL is reported as off and is not changed.
