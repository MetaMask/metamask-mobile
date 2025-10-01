## Overview

Run ESLint only on staged files to catch issues before committing.

## Steps

1. **Run lint-staged**
   - Execute `yarn lint-staged` to run Prettier and ESLint on staged files
   - Auto-fix formatting and linting issues where possible
   - Report any remaining errors or warnings

## Checklist

- [ ] lint-staged executed successfully on staged files
- [ ] No Prettier or ESLint errors or warnings displayed
- [ ] Files are automatically formatted and fixed where possible
- [ ] Ready to commit without pre-commit hook failures

## Failure Actions

If lint-staged fails:

1. **Analyze errors**: Review lint-staged output to identify specific formatting or linting issues
2. **Fix auto-fixable issues**: Run `yarn prettier --write <specific-file>` or `yarn eslint --fix <specific-file>` on problematic files
3. **Fix manual issues**: Address remaining errors manually in the code
4. **Re-run lint-staged**: Execute `yarn lint-staged` again to verify all issues are resolved
5. **Continue fixing**: Repeat steps 1-4 until all formatting and linting issues are resolved
6. **Final verification**: Ensure all staged files pass lint-staged before considering the command complete
