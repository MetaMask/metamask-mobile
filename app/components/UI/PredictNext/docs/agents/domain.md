# Domain Docs

How engineering skills should consume Predict domain documentation.

Predict is a single-context bounded context rooted at `app/components/UI/PredictNext/`.

## Before exploring, read these

- `CONTEXT.md` in this directory — Predict glossary and canonical product language.
- `docs/interface-ledger.md` in this directory — canonical runtime names, query descriptors, hooks, selectors, Service Events, errors, and public entrypoint exports.
- `docs/adr/` in this directory — Predict architectural decisions, if present.

If `docs/adr/` does not exist, proceed silently. Do not create it upfront. Create ADRs lazily only when a durable, non-obvious decision is made.

## Layout

```text
app/components/UI/PredictNext/
├── CONTEXT.md
├── docs/adr/
└── ...
```

## Use the glossary vocabulary

When naming domain concepts in issues, code, tests, docs, or refactor plans, use terms from `CONTEXT.md`.

If a needed concept is missing, do not invent competing vocabulary. Note the gap and resolve it with `grill-with-docs`.

## Flag ADR conflicts

If proposed work contradicts an existing ADR, surface the conflict explicitly instead of silently overriding it.
