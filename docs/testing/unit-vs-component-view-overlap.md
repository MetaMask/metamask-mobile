# Reducing unit vs component-view overlap

Prefer **component view** (`*.view.test.tsx`) for screen behavior driven by Redux. Keep **unit** tests for pure functions, selectors, reducers, and utils. Remove shallow screen unit tests that only re-assert what CV already covers.

Agent playbook (inventory → classify → migrate → metrics → Jira/canvas report): Cursor skill **`test-layer-overlap-audit`**.

## Quick rules

1. If `ComponentName.view.test.tsx` exists (or should), put user-visible screen scenarios there.
2. Do **not** add overlapping shallow `ComponentName.test.tsx` cases that mock hooks/selectors/children for the same journey.
3. Coverage % is diagnostic only — the gate is **user-visible behavior**.
4. Avoid inventing production modules solely to unit-test wiring unless explicitly requested; prefer CV or unit tests on existing pure helpers.

## Inventory siblings

```bash
python3 - <<'PY'
from pathlib import Path
for vt in sorted(Path('app').rglob('*.view.test.tsx')):
    base = vt.name.replace('.view.test.tsx', '')
    unit = vt.parent / f'{base}.test.tsx'
    if unit.exists():
        print(unit, '|', vt)
PY
```

## Classify each unit `it(...)`

| Decision    | Meaning                                      |
| ----------- | -------------------------------------------- |
| **DELETE**  | Same user-visible behavior already in CV     |
| **MIGRATE** | Add CV first, then delete unit               |
| **KEEP**    | Pure logic / edge case CV cannot own cheaply |

## Related

- [component-view-tests.md](./component-view-tests.md)
- [unit-testing.md](./unit-testing.md)
- [tests/component-view/AGENTS.md](../../tests/component-view/AGENTS.md)
