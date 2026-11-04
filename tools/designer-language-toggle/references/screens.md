# Screens to screenshot first

v0 focuses on Perps and Social because short buttons and dense rows clip translations. Run the key list for a current screenshot instead of copying keys out of this note:

```bash
node tools/designer-language-toggle/scripts/screenshot-keys.js --feature perps
node tools/designer-language-toggle/scripts/screenshot-keys.js --feature social
```

Add `--match PerpsProPositionCard` (or another file or folder name) to narrow the list. Pair the output with `FEEDBACK.md` when a linguist needs context. Do not edit `locales/languages`.

## Perps position card

`app/components/UI/Perps/Views/PerpsProMarketView/components/PerpsProPositionCard.tsx`

Three `flex-1` buttons in one row. Design review has been using about 114px each. There is no `114` width constant in this component.

| Key | English |
| --- | --- |
| `perps.pro_positions_panel.card.close` | Close |
| `perps.pro_positions_panel.card.reverse` | Reverse |
| `perps.pro_positions_panel.card.share` | Share |

Shipped examples that run long: German Close (`Schließen`, 9, over the width-8 limit), Russian Reverse (`Реверсировать`, 13), Portuguese Share in `pt.json` (`Compartilhar`, 12). The app loads `pt.json`. `pt-br.json` is a regional file and is not imported. Change the widths in `references/limits.json` if the layout budget changes. `perps.position.card.post_to_feed` ("Post to feed") is limited to width 16 and is still missing outside English.

## Other Perps surfaces

The screenshot script groups keys by the folder under `app/components/UI/Perps/Views/`. Home, close-position, market list, adjust margin, and mode selection are the usual next stops. Order timestamps are formatted in code (`app/components/UI/Perps/utils/formatUtils.ts`), not only in JSON. The string check reports those lines for `--feature perps`.

## Social

Feed, leaderboard, and quick buy. The copy-trade label is `social_leaderboard.feed.position_card.copy_trade`. Quick buy strings live under `social_leaderboard.quick_buy` and are referenced from `app/components/UI/QuickBuy/`.

`social` and `social_leaderboard` are both included when you pass `--feature social`.
