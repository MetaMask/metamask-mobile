# PR Commit Agent

**Goal**: Create high-quality conventional commits with automated feedback loop.

## ⚠️ CRITICAL: Commit Quality First!

All commits must follow conventional commit format and pass pre-commit hooks.

## Core Principles

1. **Commit Quality First**: All commits must follow conventional commit format
2. **Follow Guidelines**: Use proper conventional commit types and descriptions
3. **Pre-commit Hooks**: All staged files must pass pre-commit hooks
4. **Automated Feedback**: Fully automated loop to fix all commit issues
5. **No Human Interaction**: Fully automated feedback loop
6. **Consistent Standards**: Maintain consistent commit message format

## Workflow

### Step 0: Load Context (MANDATORY)

Confirm understanding by stating:

- "I will analyze staged files to understand the changes made"
- "I will generate conventional commit messages following the format"
- "I will ensure all pre-commit hooks pass before committing"
- "I will fix any linting/formatting issues automatically"
- "I will re-stage files if they were modified by pre-commit hooks"

### Step 1-6: Execute Commit Loop

```bash
# 1. Analyze staged files and changes
git diff --cached --name-only
git diff --cached

# 2. Generate conventional commit message
# 3. Execute commit with generated message
git commit -m "<type>[optional scope]: <description>"

# 4. Handle pre-commit hook failures if they occur
# 5. Fix any linting/formatting issues automatically
# 6. Re-stage files if they were modified by pre-commit hooks
```

## Decision Tree

```
Start → Load & Confirm Guidelines
  ↓
Analyze staged files and changes
  ↓
Generate conventional commit message
  ↓
Execute commit with message
  ↓
[Pre-commit Hooks Pass?] ──No──→ Fix ALL issues automatically
  ↓ Yes                          ↓
  ↓                       Re-stage modified files
  ↓                              ↓
Success → Commit completed ←─────┘
```

## Conventional Commit Format

### Commit Message Structure

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Commit Types

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Changes that do not affect the meaning of the code
- **refactor**: A code change that neither fixes a bug nor adds a feature
- **test**: Adding missing tests or correcting existing tests
- **chore**: Changes to the build process or auxiliary tools

### Examples

```bash
# ✅ Good examples
feat: add NFT gallery to collectibles tab
fix: resolve wallet connection timeout on cold start
refactor: extract transaction formatter into utility
test: add e2e spec for onboarding SRP import flow
docs: update contributing guide with design-system usage
chore: bump react-native to 0.74.5

# ❌ Bad examples
Add some stuff
fixing bug
refactor code
tests
update docs
upgrade rn
```

## Handling Pre-commit Hook Failures (Priority #1)

**Common Issues**:

- Lint-staged failures → Run `yarn lint-staged` to fix
- TypeScript errors → Fix type issues manually
- Formatting issues → Auto-fix with Prettier
- Import issues → Fix import paths and organization

**Auto-fix Process**:

```bash
# Fix linting and formatting issues
yarn lint-staged

# Re-stage files that were modified
git add <modified-files>

# Re-run commit
git commit -m "<message>"
```

## ❌ FORBIDDEN Patterns

```bash
# NEVER use these commit message patterns:
Add some stuff                    # Too vague
fixing bug                       # Not imperative mood
refactor code                    # Too generic
tests                           # Incomplete
update docs                     # Too vague
upgrade rn                      # Abbreviated
```

## Commit Message Quality Standards

### 1. Type Selection

```bash
# ✅ Good: Clear type
feat: add user authentication
fix: resolve memory leak in image loading
refactor: extract validation logic

# ❌ Bad: Wrong type
chore: add user authentication  # Should be feat
docs: resolve memory leak       # Should be fix
```

### 2. Description Quality

```bash
# ✅ Good: Specific and descriptive
feat: add NFT gallery to collectibles tab
fix: resolve wallet connection timeout on cold start

# ❌ Bad: Vague and generic
feat: add stuff
fix: fix bug
refactor: refactor code
```

### 3. Scope Usage

```bash
# ✅ Good: Useful scope
feat(collectibles): add NFT gallery
fix(wallet): resolve connection timeout
refactor(utils): extract formatter

# ❌ Bad: Unnecessary scope
feat(app): add NFT gallery
fix(component): resolve timeout
```

## Quick Commands

```bash
# Check staged files
git diff --cached --name-only

# See staged changes
git diff --cached

# Commit with message
git commit -m "<type>[optional scope]: <description>"

# Fix linting issues
yarn lint-staged

# Re-stage modified files
git add <modified-files>
```

## Common Fixes

### Lint-staged Failures

```bash
# Fix formatting and linting
yarn lint-staged

# Re-stage modified files
git add app/components/MyComponent.tsx
```

### TypeScript Errors

```bash
# Check TypeScript errors
yarn lint:tsc

# Fix type issues manually in code
```

### Import Issues

```bash
# Fix import organization
yarn eslint --fix app/components/MyComponent.tsx
```

## Success Metrics

- Commit message follows conventional commit format
- All pre-commit hooks pass
- No linting or formatting issues
- Files are properly staged
- Commit is successful
- Message is descriptive and specific

## References

- Conventional Commits: https://www.conventionalcommits.org/
- Project Guidelines: `.github/guidelines/CODING_GUIDELINES.md`
- Lint-staged config: `package.json` lint-staged section

**Remember**: Create descriptive conventional commits. Fix all pre-commit hook issues before committing.
