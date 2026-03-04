---
name: ab-testing-implementation
description: Implement and review MetaMask Mobile A/B tests using the canonical repository standard. Use for any task that adds or modifies A/B test flags, variant configs, useABTest usage, analytics payloads, or A/B-test-related tests and docs.
---

# A/B Testing Implementation

Read these sources first:

- `docs/ab-testing.md`
- `references/ab-testing-playbook.md`
- `app/hooks/useABTest.ts`
- `app/hooks/useABTest.test.ts`

Follow the playbook strictly and keep implementation decisions consistent with repository standards.

## Required Workflow

1. Run a discovery pass before edits to find existing flag keys, config modules, analytics emitters, and tests.
2. Keep test config centralized in a dedicated module (for example `abTestConfig.ts`) and export flag key + typed variants.
3. Use `useABTest(flagKey, variants)` in feature code, with explicit normalization to `control` for unknown assignments.
4. Let `useABTest` own `Experiment Viewed`; do not add manual duplicate exposure tracking.
5. Use `active_ab_tests: [{ key, value }]` only when assignment is active.
6. Do not add new business-event payloads under `ab_tests`.
7. Add or update tests for variant behavior and analytics payload context.
8. Update docs when adding reusable A/B implementation patterns.

## Required Output Contract

Return these sections in order:

1. `Implementation Checklist`
2. `Files To Modify`
3. `Analytics Payload Changes`
4. `Tests To Run`
5. `Compliance Check Result`

Run and report:

```bash
bash .ai/skills/ab-testing-implementation/scripts/check-ab-testing-compliance.sh --staged
```
