# tests/integration/ — AGENTS.md

Agent index for **integration tests** (`app/**/*.integration.test.ts`). Jest tests that exercise real controller / provider / service code with the I/O boundary mocked. Pointers only; details live in the canonical skill, the shared strategy doc, and each domain’s `STRATEGY.md`.

---

## Scope

- **integration tests** — `app/**/*.integration.test.ts`. Tests that instantiate real controllers / providers / services and only mock the I/O boundary (SDK clients, network, native modules, keyring, websocket subscriptions). Shape B/C harnesses may also mock explicitly documented app-shell glue (Engine shim, navigation/runtime providers) when the real target chain still runs. Targeted at the bug class that today only e2e catches: bugs at the seam between controller behaviour and the app, where each piece works in isolation. Consume the [framework](#framework) (per-domain harnesses, dedicated jest config).

---

## Canonical guidance

- [Testing-layer policy](https://github.com/MetaMask/skills/blob/main/domains/testing/knowledge/testing-layers.md) — choose integration vs component-view, unit, or E2E by best fit.
- [`integration-test` skill](https://github.com/MetaMask/skills/tree/main/domains/testing/skills/integration-test) — workflow, decision tree, and golden rules.
- [`writing-tests.md`](https://github.com/MetaMask/skills/blob/main/domains/testing/skills/integration-test/references/writing-tests.md) — test structure, scenarios, and assertions.
- [`harness-extension.md`](https://github.com/MetaMask/skills/blob/main/domains/testing/skills/integration-test/references/harness-extension.md) — adding or extending a domain harness.
- [`reference.md`](https://github.com/MetaMask/skills/blob/main/domains/testing/skills/integration-test/references/reference.md) — run commands, self-review, failure diagnosis, and antipatterns.

## Framework

- Tests live beside production code as `*.integration.test.ts?(x)`.
- `jest.config.integration.js` owns suite discovery and runtime settings.
- Reusable setup lives in `tests/integration/harnesses/<domain>/`.
- **Every domain folder** should include a use-case matrix (`*-use-cases.md` or equivalent) mapping flows → primary test layer. Domain harness inventory (Real / Mocked / factory / returns / use when), rollout, and shape detail live in that folder’s `STRATEGY.md`. Shared four-layer rules stay in the root [`STRATEGY.md`](STRATEGY.md).
- Do **not** put domain Real/Mocked/factory detail in this file — open the domain `STRATEGY.md` instead.

---

## Domains

| Domain             | Folder                                       | Strategy (harness inventory + rollout)                             | Use-case matrix                                                                      |
| ------------------ | -------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| Perps              | [`harnesses/perps/`](harnesses/perps/)       | [`harnesses/perps/STRATEGY.md`](harnesses/perps/STRATEGY.md)       | [`harnesses/perps/perps-use-cases.md`](harnesses/perps/perps-use-cases.md)           |
| Networks / Core UX | [`harnesses/networks/`](harnesses/networks/) | [`harnesses/networks/STRATEGY.md`](harnesses/networks/STRATEGY.md) | [`harnesses/networks/core-ux-use-cases.md`](harnesses/networks/core-ux-use-cases.md) |

### PredictNext — [`harnesses/predict-next.ts`](harnesses/predict-next.ts)

- **Real:** `PredictNextController`, `PredictMarketDataService`, `KalshiRemoteAdapter`, `PredictApiReadClient`, and controller/service messengers
- **Mocked:** HTTP fetch and app-shell base URL/client version configuration
- **Factory:** `buildPredictNextIntegrationHarness(responder)`
- **Returns:** `{ controller, messenger, fetchMock, destroy }`

---

## New domain — definition of done

When adding `harnesses/<domain>/` (or a new public harness for a domain):

1. **Harness file(s)** — Shape A (and B/C if needed) with a REAL/MOCKED header + factory. Authoring details: [`harness-extension.md`](https://github.com/MetaMask/skills/blob/main/domains/testing/skills/integration-test/references/harness-extension.md).
2. **Use-case matrix** — `*-use-cases.md` (or equivalent) mapping flows → primary test layer.
3. **Domain `STRATEGY.md`** — harness inventory (Real / Mocked / factory / returns / use when) plus any rollout / shape tables that do not fit the matrix. Update when the public harness boundary changes.
4. **Root [`STRATEGY.md`](STRATEGY.md)** — add a row to the domain table under “Domain strategy convention.”
5. **This file** — add a row to [Domains](#domains) (folder + strategy + matrix links only).

Do **not** create a separate checklist file at the integration root. Do **not** paste domain Real/Mocked detail here.

---

## Strategy documents

- [`STRATEGY.md`](STRATEGY.md) — Shared four-layer testing strategy, harness shapes (A–D), coverage targets, folder convention. Domain rollouts and harness inventories do **not** live here.
- [`coverage.svg`](coverage.svg) — Diagram showing which test type runs real code at each layer of the stack.

Domain strategy + inventory: see [Domains](#domains).
