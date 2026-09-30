# AI-assisted Appium locators (POC)

This POC lets a performance test recover a control when a UX change breaks its
deterministic locator.

```ts
import WalletView from '../../page-objects/wallet/WalletView';

// The performance fixture configures recovery for every Page Object tap and
// wallet-home scroll-and-tap section helper.
await WalletView.tapWalletSendButton();
await WalletView.scrollAndTapPredictionsSection();

// Start the performance timer only after the interaction above.
await timer.measure(() => destination.isVisible());
```

The recovery provider is deliberately an adapter rather than a built-in model
call. The adapter can use an Appium MCP server, an existing LLM provider, or a
test-local stub. It receives the element description and primary locator error
and must return one of:

- `testID` (preferred)
- `label`
- `text`
- `nativeXPath` (last resort)

The adapter should inspect the current accessibility tree first and use a
screenshot only when the tree is insufficient. It must never return
coordinates.

The performance fixture configures the provider for the duration of each
performance scenario. Shared Page Object boundaries that use recovery:

- `Gestures.waitAndTap` — every Page Object tap. Recovery wraps the full
  wait-and-tap attempt (not just resolving the lazy matcher), and only
  re-taps when a replacement locator is returned.
- `WalletHomeScroll.scrollAndTapSection` — homepage section scroll + tap
  (Perps, Predictions, Tokens, …)

If no provider is configured, the primary error is rethrown unchanged. This
keeps normal CI runs deterministic and makes AI recovery an explicit POC
opt-in (`AI_LOCATOR_RECOVERY_ENABLED=true`).

Recovery happens before the timed interval and its duration is reported through
`onRecovered`. This prevents LLM, MCP, screenshot, and retry latency from being
included in the performance metric. Recovery is also suppressed while any
`TimerHelper` / `TimerStore` timer is active (for example unlock taps inside a
started measurement). Recovery events should be reviewed and converted into
stable Page Object selectors instead of being silently accepted forever.

### Secret screens

Recovery must never upload SRP words, private keys, or reveal-seed UI to the
external model. `ClaudeLocatorRecoveryProvider` inspects the accessibility
tree for known secret-screen markers (import-from-seed, SrpInputGrid,
private-key input, …) and refuses recovery before taking a screenshot or
calling Claude. Add new markers when new secret-bearing screens appear.
