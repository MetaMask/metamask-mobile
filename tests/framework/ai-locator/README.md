# AI-assisted Appium locators (POC)

This POC lets a performance test recover a control when a UX change breaks its
deterministic locator.

```ts
import WalletView from '../../page-objects/wallet/WalletView';

// The performance fixture configures recovery for every Page Object tap.
await WalletView.tapWalletSendButton();

// Start the performance timer only after the tap above.
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
performance scenario. `Gestures` is the shared Page Object boundary, so all
existing Page Object taps get the same behavior without changing individual
scenarios. If no provider is configured, the primary error is rethrown
unchanged. This keeps normal CI runs deterministic and makes AI recovery an
explicit POC opt-in.

Recovery happens before the timed interval and its duration is reported through
`onRecovered`. This prevents LLM, MCP, screenshot, and retry latency from being
included in the performance metric. Recovery events should be reviewed and
converted into stable Page Object selectors instead of being silently accepted
forever.
