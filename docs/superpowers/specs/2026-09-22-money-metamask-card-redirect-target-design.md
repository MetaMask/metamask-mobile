# Money MetaMask Card Header Redirect Target

## Goal

Populate `redirect_target` for the Money MetaMask Card section-header press
analytics event with the actual navigation destination. Do not add a separate
mode property.

## Contract

- `upsell` and `manage` modes navigate to Card Home, so they track
  `SCREEN_NAMES.CARD_HOME`.
- `link` mode tracks `BOTTOM_SHEET_NAMES.CARD_LINK_SHEET` only when the linking
  flow opens the verified-card link sheet.
- `link` authentication and onboarding branches navigate to Card Home, so they
  track `SCREEN_NAMES.CARD_HOME`.
- Branches that fail validation or intentionally perform no navigation do not
  emit a redirect-target event.

`redirect_target` represents the first analytics destination, not the visual
card mode. Unsupported synthetic targets such as `MONEY_LINK_CARD` or
`MONEY_MANAGE_CARD` must not be added.

## Design

The linking hook owns the branch conditions and navigation. It should expose a
small redirect-target resolver or branch result so `MoneyHomeView` does not
duplicate those conditions. `MoneyMetaMaskCard` only forwards its current mode
to `onHeaderPress`; it does not infer navigation targets.

The header tracking callback runs before the press action so analytics cannot be
dropped after navigation begins. Existing card analytics remain unchanged.

## Error handling

No-op linking branches must not claim a redirect. Existing flow guards and
error handling remain authoritative; this change must not add silent fallback
navigation.

## Testing

Existing tests should be extended only with explicit approval. If approved,
cover:

- upsell and manage targets;
- verified link-sheet target;
- authentication/onboarding Card Home target;
- no-op branch without a redirect event;
- forwarding the mode from `MoneyMetaMaskCard`.
