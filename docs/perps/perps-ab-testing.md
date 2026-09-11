# Perps A/B Testing

Perps A/B tests follow the canonical MetaMask Mobile standard. See:

- [`docs/ab-testing.md`](../ab-testing.md) — SSOT for implementation, LaunchDarkly setup, and analytics rules
- [`app/components/UI/Perps/abTestConfig.ts`](../../app/components/UI/Perps/abTestConfig.ts) — current Perps test configuration (button color test, TAT-1937)

Historical note: this doc previously described a Perps-local `usePerpsABTest` hook. That implementation was migrated to the shared `useABTest` standard in TAT-3308.
