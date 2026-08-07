# Predict Agent Instructions

These instructions apply under `app/components/UI/PredictNext/`. Treat this directory as the effective root for PredictNext work.

## Start here

Read, in order:

1. `README.md` — scope, sources of truth, and current delivery direction.
2. `CONTEXT.md` — canonical Predict domain language.
3. Accepted Kalshi ADRs linked from `README.md`.
4. `docs/architecture.md` — stable boundaries and invariants.
5. The Jira issue being implemented.

## Scope

- Build the new architecture for Kalshi first.
- Keep production Polymarket on the legacy `Predict/` stack.
- Do not add Kalshi branches to legacy Predict controllers or providers.
- Do not create Polymarket adapters, compatibility code, or migration scaffolding until a ticket explicitly starts that work.
- Implement only the capabilities required by the current vertical slice. Do not scaffold future services, UI tiers, or optional adapter capabilities.

## Sources of truth

1. Accepted ADRs govern durable, contested decisions.
2. Jira governs current scope and acceptance criteria.
3. `CONTEXT.md` governs domain vocabulary.
4. `docs/architecture.md` governs current module boundaries.
5. Code and tests are the executable truth for implemented interfaces.

Proposed ADRs and examples in these docs are working direction, not accepted contracts. Surface conflicts instead of silently choosing a side.

## Working conventions

- Issues and PRDs live in Consensys Jira project `PRED`; see `docs/agents/issue-tracker.md`.
- Use terms from `CONTEXT.md` in code, tests, issues, and docs.
- Create Predict-local ADRs under `docs/adr/` only for durable, non-obvious decisions not governed elsewhere.
- Never put credentials, bearer tokens, OTPs, PII/KYC values, or transfer-authorization material in Redux, persisted mobile storage, logs, analytics, traces, or fixtures.
- Follow repository TypeScript, testing, design-system, and security guidance.
- Work one behavior at a time: red → green → refactor.

## Agent readiness

`Selected for Development` is reserved for work that has explicit acceptance criteria, verification instructions, relevant context, and no unresolved product, design, or architecture questions.
