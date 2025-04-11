# Welcome to MetaMask Mobile!

Thank you for your interest in contributing to MetaMask Mobile! This guide will help you get started and ensure your contributions align with our project standards.

## Getting Started

To set up your development environment:

- Please follow the instructions in our [repository README](https://github.com/MetaMask/metamask-mobile)
- We recommend using Expo for development and the Android builds provided

## Finding Issues to Work On

We welcome contributions of all sizes! Here's how to find tasks that match your skills and interests:

### Good First Issues

If you're new to the project, we recommend starting with our curated list of beginner-friendly tasks:

- Visit our [Good First Issues](https://github.com/MetaMask/metamask-mobile/contribute) page
- These issues are specifically tagged to be approachable for new contributors
- They typically require less familiarity with the codebase while still making meaningful improvements

### Other Ways to Find Projects

- **Open issues**: Browse through our [issues list](https://github.com/MetaMask/metamask-mobile/issues) to find something that interests you
- **Feature requests**: Look for issues labeled with `enhancement` for feature development opportunities
- **Bug fixes**: Issues labeled with `bug` need attention to improve app stability
- **Bounties**: Check Gitcoin for issues with ETH rewards

Before starting work, comment on the issue to let maintainers know you're interested. This helps prevent duplicate efforts and allows us to provide guidance if needed.

## Submitting a Pull Request

When you're ready to submit your work, please follow these guidelines:

- **Follow our [coding guidelines](https://github.com/MetaMask/metamask-mobile/blob/main/.github/guidelines/CODING_GUIDELINES.md)**:
  - These guidelines aim to maintain consistency and readability across the codebase.
  - They help ensure that the code is easy to understand, maintain, and modify.
- **Test it**:
  - For any new programmatic functionality, add unit tests when possible.
  - Keep your code cleanly isolated and include a test file in the `tests` folder.
- **Add to the CHANGELOG**:
  - Help us keep track of all the moving pieces.
  - Add an entry to the [CHANGELOG.md](https://github.com/MetaMask/metamask-mobile/blob/main/CHANGELOG.md) with a link to your PR.
- **Meet the spec**:
  - Ensure the PR adds functionality that matches the issue you're closing.
  - For bounties, be sure to review conversations for any design or implementation details.
- **Close the issue**:
  - If the PR closes an issue, add `fixes #ISSUE_NUMBER`, e.g., `fixes #418`.
  - If it only partially addresses the issue, use a reference like `#418`.
- **Keep it simple**:
  - Submit focused PRs with a single purpose.
  - Avoid unrelated changes or touching files outside the scope of your contribution.
- **PR against `main`**:
  - Submit your PR to the `main` branch.
  - Release branches (e.g., `release/x.y.z`) are created from `main` during release and used for regression testing.
  - Even for hotfixes, target the `main` branch; our release engineers will cherry-pick as needed.
- **Get the PR reviewed by code owners**:
  - At least two code owner approvals are required before merging.
- **Ensure the PR is correctly labeled**:
  - Apply appropriate labels.
  - See our [labeling guidelines](https://github.com/MetaMask/metamask-mobile/blob/main/.github/guidelines/LABELING_GUIDELINES.md) for details.

## Code Review Process

After submitting your PR:

1. Maintainers will review your code for quality, functionality, and adherence to guidelines.
2. You may be asked to make changes before your PR is approved.
3. Once approved by at least two code owners, your contribution will be merged.

## Need Help?

If you have questions or need assistance:

- Comment on the relevant issue
- Join our community channels (add links if available)
- Reach out to maintainers

Thank you for contributing to MetaMask Mobile! Your efforts help improve the experience for users worldwide and contribute to the broader open source community.
