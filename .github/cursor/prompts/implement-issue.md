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

When creating the PR, format the description following this EXACT template:

```markdown
## **Description**

[Describe what you changed and why - be specific about the fix/feature]

## **Changelog**

CHANGELOG entry: [fix/feat/chore]: [User-facing description in past tense]

## **Related issues**

Fixes: #[ISSUE_NUMBER]

## **Manual testing steps**

\`\`\`gherkin
Feature: [Feature name based on what you implemented]

Scenario: [Specific scenario for the fix/feature]
Given [specific initial state]
When user [specific action]
Then [specific expected outcome]
\`\`\`

## **Screenshots/Recordings**

### **Before**

<!-- Reference issue for before state -->

### **After**

<!-- Manual verification needed -->

## **Pre-merge author checklist**

- [x] I've followed MetaMask Contributor Docs and MetaMask Mobile Coding Standards.
- [x] I've completed the PR template to the best of my ability
- [x] I've included tests if applicable
- [x] I've documented my code using JSDoc format if applicable
- [ ] I've applied the right labels on the PR (see labeling guidelines). Not required for external contributors.

## **Pre-merge reviewer checklist**

- [ ] I've manually tested the PR (e.g. pull and build branch, run the app, test code being changed).
- [ ] I confirm that this PR addresses all acceptance criteria described in the ticket it closes and includes the necessary testing evidence such as recordings and or screenshots.
```

**Important**: Replace `[ISSUE_NUMBER]` with the actual issue number. Write specific, contextual Gherkin steps based on what you actually implemented - not generic placeholders.
