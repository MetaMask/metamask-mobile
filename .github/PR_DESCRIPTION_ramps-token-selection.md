<!--
Suggested PR title:   feat(ramps): add RampsBootstrap at app root for geolocation, smart routing, and hydrate
Suggested branch name: fix/26699_buy-tokens-not-loading-non-v2
-->

## **Description**

**Problem:** When users tap Buy and reach Token Selection (non-V2) before geolocation and smart routing have run, the screen can show a blank or incorrect state because `detectedGeolocation` and `rampRoutingDecision` are not yet set. Previously, these ran only when the FiatOrders component mounted (e.g. when the user entered a Ramp flow), which could be too late.

**Solution:** Introduce a **RampsBootstrap** component that runs at app root as soon as the app mounts:

1. **RampsBootstrap** – New component that runs three hooks at app root:
   - `useDetectGeolocation()` – detect user region
   - `useRampsSmartRouting()` – set ramp routing decision (AGGREGATOR / DEPOSIT / etc.)
   - `useHydrateRampsController()` – when V2 is enabled, ensure controller init/hydrate runs early

2. **App.tsx** – Mount `<RampsBootstrap />` at the root (direct import from `Ramp/RampsBootstrap`). No export of RampsBootstrap from the Ramp index.

3. **Ramp index (FiatOrders)** – Remove the three hook calls (`useDetectGeolocation`, `useRampsSmartRouting`, `useHydrateRampsController`) from `FiatOrders` so they run only once at app root in RampsBootstrap. `FiatOrders` continues to run `useFetchRampNetworks()` and order polling.

By the time the user reaches Buy → Token Selection, geolocation and routing are usually already set, improving non-V2 behavior. V2: RampsController is still initialized by Engine (`rampsControllerInit`); bootstrap only runs `useHydrateRampsController` for early hydrate when needed.

**Files changed:**

- `app/components/UI/Ramp/RampsBootstrap.tsx` – New: runs geolocation, smart routing, and hydrate at app root.
- `app/components/Nav/App/App.tsx` – Import and render `<RampsBootstrap />`.
- `app/components/UI/Ramp/index.tsx` – Remove geolocation, smart routing, and hydrate from FiatOrders (moved to bootstrap).

## **Changelog**

CHANGELOG entry: Run Ramps geolocation, smart routing, and controller hydrate at app root via RampsBootstrap so Token Selection (non-V2) has region and routing ready sooner.

## **Related issues**

Fixes: [#26699](https://github.com/MetaMask/metamask-mobile/issues/26699) – Buy token selection not loading (non-V2)

## **Manual testing steps**

```gherkin
Feature: Ramps bootstrap at app root

  Scenario: User opens app and navigates to Buy → Token Selection (non-V2)
    Given the app has just started
    When the user taps Buy and reaches the "Select token" screen
    Then geolocation and smart routing have already run (bootstrap at app root)
    And the token list loads according to region and routing (no blank/empty due to missing geolocation)

  Scenario: V2 flow still works
    Given Ramps V2 is enabled
    When the user goes to Buy and Token Selection
    Then tokens load (Engine init + bootstrap hydrate as before)
```

## **Screenshots/Recordings**

_Optional:_ Before/after of Token Selection when opening Buy quickly after app start (non-V2).

## **Pre-merge author checklist**

- [x] I've followed [MetaMask Contributor Docs](https://github.com/MetaMask/contributor-docs) and [MetaMask Mobile Coding Standards](https://github.com/MetaMask/metamask-mobile/blob/main/.github/guidelines/CODING_GUIDELINES.md).
- [x] I've completed the PR template to the best of my ability
- [x] I've included tests if applicable
- [x] I've documented my code using [JSDoc](https://jsdoc.app/) format if applicable
- [ ] I've applied the right labels on the PR (see [labeling guidelines](https://github.com/MetaMask/metamask-mobile/blob/main/.github/guidelines/LABELING_GUIDELINES.md)). Not required for external contributors.

## **Pre-merge reviewer checklist**

- [ ] I've manually tested the PR (e.g. pull and build branch, run the app, test code being changed).
- [ ] I confirm that this PR addresses all acceptance criteria described in the ticket it closes and includes the necessary testing evidence such as recordings and or screenshots.
