# Static analysis gate

Every change must pass ESLint and TypeScript before merge. This is the fastest user-trust signal that the app still compiles cleanly.

## Sub-features

- `eslint-scoped` — lint changed directories
- `typescript-project` — full project typecheck via `yarn lint:tsc`

## How to get to it (user POV)

- CI runs lint + tsc on every PR
- Developers run the same locally before push

## Driving it with metamask-mobile-verify.sh

Preconditions:

- `doctor` passes
- Dependencies installed

- **Predict tree (default).** `bash scripts/verification/verify-metamask-mobile/helpers/metamask-mobile-verify.sh drive-static app/components/UI/Predict/`
- **Custom path.** Pass directory as second argument for other features.
- **Proof.** `static-proof.txt` shows `lint_exit: 0` and `tsc_exit: 0`; logs in `lint.log` and `tsc.log`.

## Gotchas

- `yarn lint -- path` requires `--` before paths
- Full-repo lint can be slow — scope to changed folders when verifying a focused change
- Native-only type errors may still surface in full `lint:tsc`
