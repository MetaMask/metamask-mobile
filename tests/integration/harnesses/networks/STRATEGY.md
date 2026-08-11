# Networks / Core UX integration strategy

Domain rollout and shape detail for **network management** (Core UX). Shared four-layer rules live in [`../../STRATEGY.md`](../../STRATEGY.md). Use-case → layer assignments live in [`core-ux-use-cases.md`](core-ux-use-cases.md).

## TL;DR

Integration for networks proves custom-network add / remove / active-fallback and TokensController wipe through real `NetworkController` / `NetworkEnablementController` / `MultichainNetworkController` / `TokensController`, with fetch and app-shell I/O mocked. Shape A owns controller contracts; Shape B owns `useNetworkOperations` → Engine wiring. No Shape C yet — UI variants stay in CV / unit where already assigned.

See [`core-ux-use-cases.md`](core-ux-use-cases.md) for the full enumeration of Core UX network use cases mapped to layers.

## Networks integration harness shapes

The harness shapes are additive. Each one exists for a different failure class, not as a replacement for the previous shape. Networks currently ships **A** and **B** only.

| Layer of the stack                                                         | Shape A: controllers                      | Shape B: flow                  | Future Shape C: rendered UI | Future Shape D: fuller Engine |
| -------------------------------------------------------------------------- | ----------------------------------------- | ------------------------------ | --------------------------- | ----------------------------- |
| `@metamask/network-controller` / enablement / multichain / tokens packages | ✓                                         | ✓                              | ✓                           | ✓                             |
| Test messenger wiring (sibling controllers)                                | ✓                                         | ✓                              | ✓                           | ✓ fuller                      |
| `Engine.context` slots                                                     | ✗                                         | pointed at Shape A instances   | pointed at Shape A          | ✓ real Engine fixture         |
| Preferences / analytics / navigation shell                                 | ✗                                         | stubbed / mocked               | stubbed / mocked            | preferably real fixture       |
| `global.fetch` / Slip44 / network activity                                 | mocked                                    | mocked                         | mocked                      | mocked                        |
| Hook: `useNetworkOperations`                                               | ✗                                         | ✓                              | ✓                           | ✓                             |
| Redux selectors against NC / Preferences state                             | ✗                                         | ✓ seeded from live NC          | ✓                           | ✓ fuller                      |
| Component UI (Networks management screens)                                 | ✗                                         | ✗ (`renderHook`, not `render`) | ✓                           | ✓                             |
| Native runtime                                                             | ✗                                         | ✗                              | mocked                      | mocked                        |
| Best for                                                                   | NC add/remove, token wipe, sibling wiring | Hook → controller flow bugs    | User click reaches real NC  | Full Engine orchestration     |
| Cost                                                                       | low                                       | medium                         | medium-high                 | high                          |
| Maintenance burden                                                         | low                                       | medium                         | medium-high                 | high                          |

Prefer Shape A when a direct controller call proves the contract (e.g. token wipe on `removeNetwork`). Prefer Shape B when hook → Engine wiring is part of the risk (`saveNetwork` / `removeNetwork` / active → mainnet). Add Shape C only if a rendered Networks screen press must prove it reaches real controllers; keep pure UI variants in CV.

Do **not** expand the harness into full `Engine.init` / Wallet bootstrap unless Shape D is explicitly required for an orchestration bug the current shell intentionally bypasses.

## Coverage plan (summary)

Driven by [`core-ux-use-cases.md`](core-ux-use-cases.md):

| Area                                          |   E2E | Integration |    CV |  Unit | Total |
| --------------------------------------------- | ----: | ----------: | ----: | ----: | ----: |
| Custom network add / remove / active fallback |       |           5 |       |       |     5 |
| Polygon delete gate (`canDeleteNetwork`)      |       |             |       |     1 |     1 |
| **Total (current matrix)**                    | **0** |       **5** | **0** | **1** | **6** |

Integration owns the product-risk network lifecycle paths; unit owns the pure delete gate. Appium network lifecycle is deliberately out of this matrix (Shape B replaces Test 2A for custom add/delete).

## Implementation plan

Vertical slices already delivered for the matrix IDs below. Further work is optional follow-on, not required for current Core UX coverage.

### Done — Shape A foundation + token wipe

Use cases: `UX-NET-HARNESS`, `UX-NET-TOKEN-WIPE`.

- **Integration.** `networks.ts` + `networks.integration.test.ts` — real NC add/remove; TokensController wipe on remove; mainnet tokens intact.
- **Unit / CV / E2E.** None required for these IDs.

### Done — Shape B hook flow

Use cases: `UX-NET-ADD`, `UX-NET-DEL`, `UX-NET-DEL-ACTIVE`.

- **Integration.** `networks-flow.ts` + `useNetworkOperations.integration.test.ts` — save/enable, remove, active custom → mainnet fallback.
- **Unit.** `UX-POLY-GATE` already covered in `app/util/networks/index.test.ts`.

### Optional follow-on (not in current matrix)

Examples that may later deserve matrix rows + harness work:

- Activity filter Mainnet ↔ Linea (CV or thin Shape B).
- Contacts / assets “no bleed” across network switch (CV).
- Shape C only if a Networks management screen press must reach real NC.

Pause before adding Shape C/D: does Shape B already prove the risk cheaper?

## How to add a networks integration test

```ts
// Shape A — controller contract
import { buildNetworksIntegrationHarness } from '../../../../../tests/integration/harnesses/networks/networks';

describe('My networks feature', () => {
  it('adds a custom network', () => {
    const { addCustomNetwork, networkController } =
      buildNetworksIntegrationHarness();
    addCustomNetwork();
    expect(
      networkController.state.networkConfigurationsByChainId['0x64'],
    ).toBeDefined();
  });
});
```

```ts
// Shape B — hook → controllers
import { act } from '@testing-library/react-native';
import { buildNetworksFlowHarness } from '../../../../../../tests/integration/harnesses/networks/networks-flow';
import { useNetworkOperations } from './useNetworkOperations';

describe('My networks hook flow', () => {
  it('saves a custom network through the hook', async () => {
    const flow = buildNetworksFlowHarness();
    const { result } = flow.renderHookWithFlow(() => useNetworkOperations());
    await act(async () => {
      await result.current.saveNetwork(/* … */);
    });
  });
});
```

The harness mocks the I/O / Engine shell boundary; the rest runs real. See [`../../AGENTS.md`](../../AGENTS.md) for harness inventory and the central [`integration-test` skill](https://github.com/MetaMask/skills/tree/main/domains/testing/skills/integration-test) for authoring rules.

## Files in this folder

```
harnesses/networks/
├── networks.ts                      Shape A: controller-level harness
├── networks-flow.ts                 Shape B: hook-flow harness
├── networks.integration.test.ts     Shape A smoke + token wipe
├── core-ux-use-cases.md             every Core UX network use case → primary layer
└── STRATEGY.md                      this file
```
