# Sentry 7.70 Investigation Notes

Canonical report:

- `docs/perps/investigation-sentry-7.70.md`

This root file is kept as a short pointer because older discussion referenced it
directly.

## Current Conclusion

The earlier version of this note was inaccurate. The currently supported conclusion is:

- always-on Perps moved HyperLiquid init into wallet lifecycle
- foreground handling then amplified attempts by forcing reconnects too aggressively
- that increased websocket init attempts across the eligible population
- failures in those non-interactive attempts were logged like hard Perps failures

This is not proven to be only iOS background noise, and it is not proven to be harmless.

## Reproduction Artifacts Saved On This Branch

- RCA bridge: `app/controllers/perps/utils/perpsRca.ts`
- Recipe: `scripts/perps/agentic/teams/perps/recipes/reproduce-ws-init-failure.json`

Run:

```bash
cd /Users/deeeed/dev/metamask/metamask-mobile-4-ws
bash scripts/perps/agentic/validate-recipe.sh \
  scripts/perps/agentic/teams/perps/recipes/reproduce-ws-init-failure.json \
  --skip-manual
```

Record video on iOS simulator:

```bash
cd /Users/deeeed/dev/metamask/metamask-mobile-4-ws
mkdir -p .agent/videos
xcrun simctl io booted recordVideo .agent/videos/reproduce-ws-init-failure.mp4
```

Then run the recipe in another shell and stop recording with `Ctrl+C`.
