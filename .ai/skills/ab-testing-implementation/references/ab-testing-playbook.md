# A/B Testing Playbook

Canonical implementation playbook for MetaMask Mobile A/B tests.

## Scope

Use this playbook for any work that introduces or updates:

- A/B flag keys
- variant config modules
- `useABTest` integration
- business-event A/B analytics context
- tests and docs tied to A/B behavior

## Step 1: Discovery Pass

Before writing code, inspect existing patterns:

```bash
rg -n "useABTest\\(|active_ab_tests|ab_tests|Abtest|abTestConfig" app docs tests
rg -n "Experiment Viewed|EXPERIMENT_VIEWED" app
```

Identify:

- existing flag key naming pattern for the feature area
- nearest config module pattern
- current analytics emit points and payload shapes
- closest tests to extend

## Step 2: Implement with Canonical Pattern

1. Create or update a dedicated config module (for example `abTestConfig.ts`).
2. Export a single flag key constant and typed variant map(s).
3. Read assignment via `useABTest(flagKey, variants)`.
4. Normalize unresolved assignment to `control` before variant-specific rendering.
5. Use alternate variant maps only when UI state changes options, while preserving the same variant keys.

## Step 3: Analytics Rules

1. Do not manually emit `Experiment Viewed` when using `useABTest`.
2. For business events, include:

```typescript
active_ab_tests: [{ key: FLAG_KEY, value: variantName }];
```

only when the assignment is active.

3. Do not add new business-event payloads under `ab_tests`.

## Step 4: Test Expectations

Cover at least:

1. variant selection behavior (`control` fallback and treatment path)
2. analytics payload context (`active_ab_tests` shape and gating by active assignment)
3. no regression in existing event payload fields

## Step 5: Compliance Check

Run:

```bash
bash .ai/skills/ab-testing-implementation/scripts/check-ab-testing-compliance.sh --staged
```

Optional explicit files mode:

```bash
bash .ai/skills/ab-testing-implementation/scripts/check-ab-testing-compliance.sh --files app/path/to/file.tsx,app/path/to/file.test.ts
```

CI or clean-checkout mode (compare listed files against a base branch/ref):

```bash
bash .ai/skills/ab-testing-implementation/scripts/check-ab-testing-compliance.sh --files app/path/to/file.tsx --base origin/main
```

## Output Contract (Required)

When responding from this playbook, always include:

1. `Implementation Checklist`
2. `Files To Modify`
3. `Analytics Payload Changes`
4. `Tests To Run`
5. `Compliance Check Result`

## Cross-Harness Prompt Pattern

For harnesses without native Codex skill loading, use this prompt opener:

`Follow .ai/skills/ab-testing-implementation/references/ab-testing-playbook.md and apply docs/ab-testing.md.`
