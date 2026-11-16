# `yarn lint:react-compiler`

Runs the app's own `babel-plugin-react-compiler` over `app/` and fails when code gets worse for the compiler. It works like `yarn lint:tsc`: it runs the real transform, emits nothing, and reports what failed.

## What it checks

- **Files:** tracked and untracked `*.{js,jsx,ts,tsx,mjs,cjs}` under `app/`, minus tests and mocks. The test and mock rules are the same as the [React Compiler dashboard](https://metamask-mobile-react-compiler-scan.vercel.app/) defaults (`file-scope.ts`), so both report the same numbers.
- **Compiler options:** the same as [`react-compiler-marker`](https://www.npmjs.com/package/react-compiler-marker) 0.2.0, which the dashboard uses: `compilationMode: 'infer'`, `panicThreshold: 'none'` and `environment.enableTreatRefLikeIdentifiersAsRefs: true` (also the compiler's default). They are set in `compile.ts`, not read from `babel.config.js`, so the numbers match the dashboard. `.js`, `.jsx` and `.mjs` files are parsed as Flow, everything else as TypeScript.
- **Failures:** each `CompileError`, `CompileDiagnostic`, `PipelineError` or `CompileSkip` event counts as one failure. `CompileSkip` covers `'use no memo'` and disabled React ESLint rules, so suppressing a failure doesn't make it go away. A file Babel can't transform counts as one failure.

## Baseline

`baseline.json` lists every file that fails today, with its failure count and the reasons. The step fails when:

| Change | Result |
| --- | --- |
| A file not in the baseline starts failing | Fails, and lists the file, line and reason for each failure |
| A baselined file gets more failures | Fails, same output |
| A baselined file gets fewer failures, or is deleted | Fails until you run `yarn lint:react-compiler --update` and commit the smaller baseline |

Only counts decide pass or fail. Reasons are recorded for reviewers and to make burndown easier, so a compiler upgrade that rewords messages doesn't fail every baselined file. Deleted files are only picked up by a full run, which is what CI does.

## Usage

```bash
yarn lint:react-compiler                      # full check, about 20 s
yarn lint:react-compiler app/path/File.tsx    # check specific files
yarn lint:react-compiler --changed            # files changed since origin/main, plus uncommitted and untracked
yarn lint:react-compiler --changed=HEAD~1     # same, against another ref
yarn lint:react-compiler --update             # shrink the baseline after a fix
```

- `--update` only removes entries or lowers counts. It refuses to add a failure.
- `--update --allow-new` records new failures. Use it only when a reviewer has agreed the failure can't be fixed yet.
- `REACT_COMPILER_CHECK_WORKERS` sets the number of worker threads. The default is one less than the CPU count.

## Burning down the baseline

1. Pick a file from `baseline.json` or the [dashboard](https://metamask-mobile-react-compiler-scan.vercel.app/).
2. Fix it with the [react-compiler-migration skill](https://github.com/MetaMask/skills/tree/main/domains/assets/skills/react-compiler-migration).
3. Run `yarn lint:react-compiler <file>` to check it.
4. Run `yarn lint:react-compiler --update` and commit `baseline.json` with the fix.
