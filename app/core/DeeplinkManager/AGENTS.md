# Deeplink Agent Instructions

These instructions apply under `app/core/DeeplinkManager/`, and to deeplink behavior changed from outside it.

## Before changing deeplink behavior

Read [Deeplink regression coverage](../../../docs/readme/deeplinking.md#deeplink-regression-coverage). It is canonical for what to update and how to run it; this file does not repeat it.

## Update regression coverage in the same change when you

- add, change, deprecate or remove an action, alias, supported scheme or host, or query contract
- change a fallback or rejection, or a state- or flag-dependent destination
- change a `prepare()` effect, nested route or params, a back tab, or startup reset behavior
- do any of the above through route constants, navigator registrations, or how a destination screen consumes params, even when no file in this directory changes

## Where the coverage lives

- URI fixtures (shared schema + exemplars; **you append your rows**): [`__fixtures__/deeplinkUriCases.ts`](__fixtures__/deeplinkUriCases.ts)
- Unit contract (real parser, `resolve` mode — picks up new rows): [`utils/parseDeeplink.routes.test.ts`](utils/parseDeeplink.routes.test.ts)
- Redux baseline / named states: [`tests/component-view/presets/deeplinks.ts`](../../../tests/component-view/presets/deeplinks.ts)
- HTTP/Engine boundary hook: [`tests/component-view/api-mocking/deeplinkSwapToken.ts`](../../../tests/component-view/api-mocking/deeplinkSwapToken.ts)

## Rules

- Author expected results independently of the code under test. Never derive them by calling the parser or handlers.
- A new intent-capable action needs rows in `DEEPLINK_URI_CASES`. The checked-in list is exemplars only; your feature owns its scenarios. Nothing enforces this automatically.
- Run the resolve-mode unit suite before marking the change complete. Commands are in the canonical section.
- Legacy switch-only, SDK, WalletConnect and MWP paths are outside this harness. Do not force them in or add Appium.
