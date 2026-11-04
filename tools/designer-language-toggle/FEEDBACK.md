# Translation feedback

Use one block per string. Do not edit `locales/languages/*.json`. Crowdin owns those files (`crowdin.yml`).

Keep every `{{placeholder}}`. If the string is a plural, say which form you mean (`one`, `other`, `few`, `many`).

---

- Date:
- Language:
- Screen:
- String key:
- Plural form: one / other / few / many / not a plural
- Placeholders to keep:
- English:
- What the app shows:
- Suggested translation:
- Hard limit (from `references/limits.json`, or none):
- Graphemes and width, if you measured them:
- What you see: missing / still English / over the limit / too long / check wrapping / placeholder mismatch / other
- Screenshot:
- Notes for Crowdin:

---

Too long means a short label (English is 25 graphemes or fewer) that may be cut off. Check wrapping means a longer sentence that should wrap instead of clip. Over the limit means it is past the `maxWidth` set for that control.
