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

## Pull Request

When creating the PR, follow the repository's PR template (`.github/pull-request-template.md`). Your PR description MUST include these sections:

### Required PR Sections:

1. **Description**: Short description of what changed and why
2. **Changelog**: Use the format `CHANGELOG entry: type: description`
   - `fix:` for bug fixes (e.g., `CHANGELOG entry: fix: resolved issue where token name showed as "Unknown"`)
   - `feat:` for new features (e.g., `CHANGELOG entry: feat: added dark mode toggle`)
   - `chore:` or `null` for internal/non-user-facing changes
3. **Related issues**: `Fixes: #<issue_number>`
4. **Manual testing steps**: Use Gherkin format:

   ```gherkin
   Feature: <feature name>

     Scenario: user <action>
       Given <initial state>
       When user <action>
       Then <expected outcome>
   ```

5. **Screenshots/Recordings**: Add if applicable (Before/After sections)
6. **Pre-merge author checklist**: Include these checkboxes (checked, since you're following these guidelines):
   ```
   - [x] I've followed MetaMask Contributor Docs and MetaMask Mobile Coding Standards.
   - [x] I've completed the PR template to the best of my ability
   - [x] I've included tests if applicable
   - [x] I've documented my code using JSDoc format if applicable
   - [x] I've applied the right labels on the PR (see labeling guidelines). Not required for external contributors.
   ```
7. **Pre-merge reviewer checklist**: Copy all checkbox items from the template:
   ```
   - [ ] I've manually tested the PR (e.g. pull and build branch, run the app, test code being changed).
   - [ ] I confirm that this PR addresses all acceptance criteria described in the ticket it closes and includes the necessary testing evidence such as recordings and or screenshots.
   ```

### Changelog Guidelines:

- User-friendly description from the user's perspective
- Use past tense (e.g., "Fixed", "Added", "Resolved")
- Keep it concise but informative
