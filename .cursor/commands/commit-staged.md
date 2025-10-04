## Overview

Commit staged files with a conventional commit message based on the changes made.

## Steps

1. **Analyze changes**

   - Review the staged files to understand what was changed
   - Examine the actual code changes using `git diff --cached`
   - Determine the type of changes (feat, fix, refactor, etc.)
   - Identify the scope of changes (component, utility, etc.)
   - Understand the specific functionality that was modified

2. **Generate commit message**

   - Create a conventional commit message following the format: `<type>[optional scope]: <description>`
   - Use appropriate type: `feat`, `fix`, `refactor`, `test`, `docs`, `style`, `chore`
   - Write description based on actual changes made in the staged files
   - Include specific details about what functionality was added, fixed, or modified
   - Keep description concise but descriptive of the actual changes

3. **Commit changes**
   - Execute `git commit` with the generated message
   - Handle pre-commit hook failures if they occur
   - Fix any linting or formatting issues automatically
   - Re-stage files that were already staged but modified by pre-commit hooks
   - Re-run commit until successful

## Checklist

- [ ] All staged files analyzed
- [ ] Changes analyzed and categorized
- [ ] Conventional commit message generated
- [ ] Pre-commit hooks executed successfully
- [ ] Any linting/formatting issues fixed automatically
- [ ] Files re-staged if they were modified by pre-commit hooks
- [ ] Commit executed successfully
- [ ] All staged files committed
- [ ] Commit message follows conventional commit format

## Failure Actions

If commit fails:

1. **Check git status**: Verify there are staged files to commit
2. **Review pre-commit hook failures**: Check if lint-staged failed due to linting/formatting issues
3. **Fix linting issues**: Run `yarn lint-staged` to fix formatting and linting problems
4. **Re-stage modified files**: Add back any files that were already staged but modified by pre-commit hooks
5. **Fix commit message**: Adjust the message if it doesn't follow conventional commit format
6. **Re-run commit**: Execute the commit command again
7. **Continue fixing**: Repeat steps 1-3 until commit succeeds
