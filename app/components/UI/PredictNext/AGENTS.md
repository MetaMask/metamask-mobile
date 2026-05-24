# Predict Agent Instructions

These instructions apply when working under `app/components/UI/PredictNext/`.
Treat this directory as the effective repo root for agent workflows. Relative paths below are relative to this directory.

## Scope overrides

- This file is the canonical AGENTS file for Predict work.
- If a skill or workflow says to modify repo-root `AGENTS.md`, modify this Predict-local `AGENTS.md` instead.
- If a skill or workflow refers to repo-root workflow files, prefer the Predict-local equivalent.
- Do not create or modify repo-root `AGENTS.md`, `CONTEXT.md`, `CONTEXT-MAP.md`, or `docs/adr/` unless explicitly asked.
- Keep this file minimal. When we discover a recurring Predict-specific gotcha or convention, propose adding a concise instruction here.

## Matt Pocock skills

- Treat Predict as its own bounded context.
- `grill-with-docs`: use `CONTEXT.md` as the Predict glossary. Create it lazily only when a domain term is resolved.
- ADRs: use `docs/adr/`. Create it lazily only for durable, non-obvious trade-off decisions.
- `tdd`: work one behavior at a time: red → green → refactor.

## Agent skills

### Issue tracker

Issues and PRDs for Predict live in Consensys Jira project `PRED`. Use the Atlassian/Jira tools against `consensyssoftware.atlassian.net`. See `docs/agents/issue-tracker.md`.

### Triage labels

Predict reuses PRED Jira statuses for triage; `Selected for Development` is reserved for AFK-ready agent work. See `docs/agents/triage-labels.md`.

### Domain docs

Predict is single-context: use `CONTEXT.md` and `docs/adr/` under this directory. See `docs/agents/domain.md`.

## Gotchas

- None yet.
