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

- URI fixtures (shared, data only): [`__fixtures__/deeplinkUriCases.ts`](__fixtures__/deeplinkUriCases.ts)
- Unit contract (real parser, `resolve` mode): [`utils/parseDeeplink.routes.test.ts`](utils/parseDeeplink.routes.test.ts)
- CV navigation (normal, startup, Back, prepare, real screens): [`DeeplinkManager.navigation.view.test.tsx`](DeeplinkManager.navigation.view.test.tsx)
- CV renderer and state: [`tests/component-view/renderers/deeplinks.tsx`](../../../tests/component-view/renderers/deeplinks.tsx), [`tests/component-view/presets/deeplinks.ts`](../../../tests/component-view/presets/deeplinks.ts)

## Rules

- Author expected results independently of the code under test. Never derive them by calling the parser or handlers, and never register a route in the CV tree because the parser returned it.
- A new intent-capable action needs rows in the shared matrix. Nothing enforces this automatically, so the check is yours.
- Keep the real parser, handlers, executors, `NavigationService` and React Navigation in CV. Follow the CV mock boundaries in [`tests/component-view/AGENTS.md`](../../../tests/component-view/AGENTS.md).
- Run the affected unit suite and the CV suite on both platforms before marking the change complete. Commands are in the canonical section.
- Legacy switch-only, SDK, WalletConnect and MWP paths are outside this harness. Do not force them in or add Appium.
