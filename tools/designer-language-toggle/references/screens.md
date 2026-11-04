# Screens to screenshot first

v0 focuses on Perps and Social because short buttons and dense rows clip translations. Run the key list for a current screenshot instead of copying keys out of this note:

```bash
node tools/designer-language-toggle/scripts/screenshot-keys.js --feature perps
node tools/designer-language-toggle/scripts/screenshot-keys.js --feature social
```

Add `--match PerpsProPositionCard` (or another file or folder name) to narrow the list. Pair the output with `FEEDBACK.md` when a linguist needs context. Do not edit `locales/languages`.

## Perps position card

`app/components/UI/Perps/Views/PerpsProMarketView/components/PerpsProPositionCard.tsx`

Three buttons share one row. Each button is about 114px, with about 70px for text. Limit: 10 characters (agreed Nov 2).

| Key | English | Note |
| --- | --- | --- |
| `perps.pro_positions_panel.card.close` | Close | Each button is about 114px, with about 70px for text. Limit: 10 characters (agreed Nov 2). |
| `perps.pro_positions_panel.card.reverse` | Reverse | The longest are Russian Реверсировать and Turkish Tersine Çevir, 13 characters each, both over the limit. |
| `perps.pro_positions_panel.card.share` | Share | Portuguese Compartilhar (12) and Greek Κοινοποίηση (11) are over 10. German Schließen (9) is the longest Close and fits. |

`perps.position.card.post_to_feed` ("Post to feed") is at most 20 characters. If a translation doesn't fit, fall back to "Post". There is no German translation yet. The app loads `pt.json`. `pt-br.json` is a regional file and is not imported. Change the numbers in `references/limits.json` if the agreement changes.

## Other Perps surfaces

The screenshot script groups keys by the folder under `app/components/UI/Perps/Views/`. Home, close-position, market list, adjust margin, and mode selection are the usual next stops. Order timestamps are formatted in code (`app/components/UI/Perps/utils/formatUtils.ts`), not only in JSON. The string check reports those lines for `--feature perps`.

## Social

Feed, leaderboard, and quick buy. The copy-trade label is `social_leaderboard.feed.position_card.copy_trade`. Quick buy strings live under `social_leaderboard.quick_buy` and are referenced from `app/components/UI/QuickBuy/`.

`social` and `social_leaderboard` are both included when you pass `--feature social`.
