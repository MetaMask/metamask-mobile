# Shared pack illustration prompt

Replace only `{{subject}}` with the selected pack's `subject` from `catalog/art-direction.json`. Use `tools/print-prompt.ts <code>` to print the complete prompt without creating a separate file for each pack.

Generate the transparent illustration only. The compositor adds the pouch, price-band colour, official fox and typography. Keep accepted source pixels; image generation is not a deterministic rebuild.

```text
Use case: stylized-concept
Asset type: central printed illustration for a MetaMask Gacha pack.
Primary request: {{subject}}
Composition: one dominant centered subject, completely visible, compact near-frontal three-quarter composition with breathing room. Designed for a 768 x 832 region inside a portrait booster pack. The central object should fill most of the frame. Keep the silhouette immediately readable at mobile thumbnail size.
Style: premium polished dimensional collectible illustration, crisp faceted geometry, detailed tactile surfaces, copper metallic accents and luminous angular crystal energy. Match a unified sophisticated series, not flat vector clipart or a photographed real object.
Palette: warm MetaMask orange #ff7940 and #fa4b00, peach highlights #ffd4c1, copper, ivory and graphite; use the subject-specific accent colours described above sparingly.
Lighting: broad upper-left illumination and controlled highlights on the subject. Packaging reflections are added separately.
Background: genuinely transparent alpha, no scenery, no floor, no external cast shadow. Portrait-ish 12:13 composition.
Text: none. No letters, words, numbers, prices, badges, logos, watermark, MetaMask fox, Firefox marks, Jupiter marks, borders, plastic pouch, packaging, foil or sealed edges. Do not draw a finished pack: output only the isolated thematic illustration.
```
