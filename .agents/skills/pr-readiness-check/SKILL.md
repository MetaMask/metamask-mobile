---
name: pr-readiness-check
description: Check branch changes for common PR readiness issues (missing tests, missing JSDoc, guideline violations). Use when the user asks to verify changes before opening a PR, check code quality, or audit a branch for missing items.
---

# PR Readiness Check

Scan the current branch diff for common issues that could be flagged during PR review. This is a **non-blocking** check — always report findings as warnings and let the user decide what to act on.

## Steps

1. **Collect the diff**

   ```bash
   git diff main...HEAD --name-only
   git diff main...HEAD
   ```

2. **Check for missing tests**

   For each new or modified source file with non-trivial logic changes (not just config, docs, or styles), check whether a corresponding test file was added or updated.

   Heuristic: a source file `Foo.ts(x)` should have a matching `Foo.test.ts(x)` (or `Foo.view.test.tsx` for components). Warn if:
   - New exported functions/components have no corresponding test file changes
   - Existing test files were not updated despite significant logic changes in the source

3. **Check for missing JSDoc**

   Scan new exported functions, types, and components in the diff. Warn if any lack JSDoc comments.

4. **Check for guideline violations**

   Look for obvious violations of `.github/guidelines/CODING_GUIDELINES.md` and `.cursor/rules/` patterns in the changed lines:
   - `any` type usage in TypeScript
   - `StyleSheet.create()` in new code
   - Raw `View` or `Text` imports from `react-native` instead of design system `Box`/`Text`
   - `import tw from 'twrnc'` instead of `useTailwind()` hook
   - `npx` usage in scripts

## Output

Print each finding as a warning line:

```
⚠ No tests detected for new logic in `app/core/Foo.ts`
⚠ Missing JSDoc on exported function `calculateFee` in `app/util/fees.ts`
⚠ `any` type used in `app/components/Bar.tsx:42`
⚠ `StyleSheet.create()` found in new file `app/components/Baz/Baz.tsx`
```

If no issues found, confirm:

```
✅ No readiness issues detected
```
