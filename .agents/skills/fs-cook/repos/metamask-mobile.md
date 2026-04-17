---
repo: metamask-mobile
parent: fs-cook
---

# MetaMask Mobile FS-Cook

## Primary Surfaces

| Area       | Path                                       |
| ---------- | ------------------------------------------ |
| Views      | `app/components/UI/Perps/Views/`           |
| Hooks      | `app/components/UI/Perps/hooks/`           |
| Utils      | `app/components/UI/Perps/utils/`           |
| TestIDs    | `app/components/UI/Perps/Perps.testIds.ts` |
| Controller | `app/controllers/perps/`                   |

## Discovery

Start with:

```bash
rg --files | rg 'validate-recipe\\.sh|validate-recipe\\.js|flows/.+\\.json$|evals\\.json$|agentic-toolkit\\.md|Perps\\.testIds\\.ts'
```

## Cooking Rules

- Prefer existing mobile flows or test selectors when they exist
- Keep mobile proof targets separate from extension assumptions
- Do not import extension-only path/testID knowledge into mobile recipes
- If mobile lacks a repo-owned helper, cook the recipe directly with the skill

## Validation

Preferred contract:

Schema / dry-run:

```bash
bash scripts/perps/agentic/validate-recipe.sh <artifacts-dir> --dry-run
```

Live run when the repo/slot supports it:

```bash
bash scripts/perps/agentic/validate-recipe.sh <artifacts-dir> --skip-manual
```

If the target repo does not expose these exact commands, discover the repo-local equivalent and record the substitute explicitly.

Record all validation commands and outputs in `## Validation Evidence` inside the harness.

If discovery finds no repo-local validator or runner:

- write `validation unavailable: no repo-local validator/runner discovered`
- do not claim that validation passed

## Mobile-Specific Caution

Mobile and extension may share the same proof goal but not the same mechanics.

Keep stable across both:

- proof target meaning
- proof mode (`state`, `visual`, `mixed`)
- honest unresolved-target reporting

Allow to differ across both:

- selectors
- navigation steps
- controller/hook paths
- runtime validation commands
