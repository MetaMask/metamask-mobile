You are implementing a GitHub issue for the MetaMask Mobile repository.

## Your Task

1. **Understand the Issue**: Read the issue details carefully to understand what needs to be done
2. **Analyze the Codebase**: Search for relevant files and understand the existing patterns
3. **Implement the Solution**: Make the necessary code changes following the project's conventions
4. **Write Tests**: Add unit tests for any new functionality (follow the testing guidelines)
5. **Verify**: Ensure your changes don't break existing functionality

## Guidelines

- Follow the existing code style and patterns in the repository
- Use TypeScript - no `any` types allowed
- Use the design system components from `@metamask/design-system-react-native`
- Add appropriate comments where needed
- Keep changes focused on the issue scope - don't over-engineer

## Output

After implementing, provide a summary of:

1. Files changed and why
2. Key implementation decisions
3. Any potential risks or considerations for reviewers
4. **Changelog entry** (REQUIRED): A single line in conventional commit format for our release notes. This should be user-friendly, describing what changed from the user's perspective. Format: `CHANGELOG: type: description`
   - Use `fix:` for bug fixes
   - Use `feat:` for new features
   - Use `chore:` for internal changes (not user-facing)
   - Example: `CHANGELOG: fix: resolved issue where token name showed as "Unknown" during transaction review`

Do NOT create the pull request yourself - the workflow will handle that.
