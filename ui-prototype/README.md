# MetaMask Mobile — UI Prototype

Local web prototype that visually mimics the MetaMask Mobile home shell (wallet balance, actions, tokens, and bottom tabs).

**Not** a real wallet — no keyring, Engine, or network calls. For design / flow demos only.

## Run

```bash
cd ui-prototype
yarn
yarn dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

## What’s included

- Phone-framed layout
- Tabs: Home · Explore · Trade · Money · Rewards
- Home mirrors current wallet shell (actions, money card, tokens)
- Mock balance, tokens, and rewards
- Trade action sheet
- Settings from the menu icon

## Notes

- Colors follow `@metamask/design-tokens` (light/dark theme values used in the mobile app)
- Safe to leave uncommitted or gitignore later if you only need it locally
