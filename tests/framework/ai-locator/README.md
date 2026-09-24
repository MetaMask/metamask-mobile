# AI-assisted Appium locators (POC)

This POC lets a performance test recover a control when a UX change breaks its
deterministic locator.

```ts
import { Matchers, tapWithSelfHealingLocator } from '../../framework';

await tapWithSelfHealingLocator({
  intent: 'tap Send on the wallet home',
  primary: () => Matchers.getElementByID('wallet-send-button'),
  driver,
  recovery: appiumMcpLocatorProvider,
  onRecovered: (result) =>
    testInfo.attach('ai-locator-recovery', {
      body: JSON.stringify(result),
      contentType: 'application/json',
    }),
});

// Start the performance timer only after the tap above.
await timer.measure(() => destination.isVisible());
```

`recovery` is deliberately an adapter rather than a built-in model call. The
adapter can use an Appium MCP server, an existing LLM provider, or a test-local
stub. It receives the user intent and the primary locator error and must return
one of:

- `testID` (preferred)
- `label`
- `text`
- `nativeXPath` (last resort)

The adapter should inspect the current accessibility tree first and use a
screenshot only when the tree is insufficient. It must never return
coordinates.

The deterministic locator is always attempted first. If no recovery provider is
passed, the primary error is rethrown unchanged. This keeps normal CI runs
deterministic and makes AI recovery an explicit POC opt-in.

Recovery happens before the timed interval and its duration is reported through
`onRecovered`. This prevents LLM, MCP, screenshot, and retry latency from being
included in the performance metric. Recovery events should be reviewed and
converted into stable Page Object selectors instead of being silently accepted
forever.
