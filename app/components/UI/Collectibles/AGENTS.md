# Collectibles agent index

Follow the repository `AGENTS.md` and the [module README](README.md).
Use **Collectibles**, always plural, for controllers, services, clients, hooks,
paths, routes and feature-owned keys. The README's [naming convention](README.md#naming-convention)
defines casing and external-contract exceptions. Do not add singular aliases.

Before adding or changing tests, read the README's [test conventions](README.md#test-conventions),
including localized queries, fresh elements after navigation and Engine cleanup.
Before preparing a PR, follow its [review evidence rules](README.md#review-evidence).

Engine registers the data services and the controller owns the Pack Partner provider. Keep business operations, reads and UI hooks inside the feature.

- Client calls own HTTP validation only; never add generic transaction retries.
- Keep plural Collectibles feature names and neutral PackPartner vendor names.
- Direct API keys are temporary pending the proxy: `PACK_PARTNER_DEVNET_API_KEY` is local development/devnet only. Never add a mainnet key or put it in CI/shared/release builds; keep the HTTP-client guard for explicit options too. Remove the workaround once proxy authentication is configured.
- Never commit private endpoints/keys or a filesystem dependency on a local Snap.
- No QuickBuy integration. Future UI disables purchases with insufficient USDC
  until MetaMask Pay supports Solana.
- Enforce [the index-file policy](README.md#module-boundary): within Collectibles,
  only the public module entry and React component/screen folders may have an
  `index.ts`. Provider, selector, schema, type, constant, service and hook files
  use explicit names and direct imports. No `export *` or replacement aggregator.
  After moving files, check the complete `index.ts` inventory, tests, mocks and
  documentation on both stacked branches. Existing Engine initializer/messenger
  entry points follow the repository's separate composition convention.

- Tests mock HTTP, Snap and storage; testing never authorizes real purchases.
- Keep new queries, workflows and their tests inside Collectibles. Reuse the registered messengers and integration harnesses. Use the Pack Partner StorageService namespace for collection snapshots.
- Use the repository mobile-testing skill. Run the focused unit/integration suites
  and init navigation regression tests listed in README after extraction changes.
