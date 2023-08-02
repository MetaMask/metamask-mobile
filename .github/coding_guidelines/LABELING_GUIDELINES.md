# PR Labeling Guidelines
To maintain a consistent and efficient development workflow, we have set specific label guidelines for all pull requests (PRs). Please ensure you adhere to the following instructions:

### Mandatory Labels:
- **Internal Developers**: Every PR raised by an internal developer must include a label prefixed with `team-` (e.g., `team-mobile-ux`, `team-mobile-platform`, etc.). This indicates the respective internal team responsible for the PR.

- **External Contributors**: PRs from contributors outside the organization must have the `external-contributor` label.

It's essential to ensure that PRs have the appropriate labels before they are considered for merging.

### Prohibited Labels:
Any PR that includes one of the following labels can not be merged:

- **needs-qa**: The PR requires a full manual QA prior to being added to a release.
- **QA'd but questions**: The PR has been checked by QA, but there are pending questions or clarifications needed on minor issues that were found.
- **issues-found**: The PR has been checked by QA or other reviewers, and appeared to include issues that need to be addressed.
- **need-ux-ds-review**: The PR requires a review from the User Experience or Design System teams.
- **blocked**: There are unresolved dependencies or other issues blocking the progress of this PR.
- **stale**: The PR has not had recent activity in the last 90 days. It will be closed in 7 days.
- **DO-NOT-MERGE**: The PR should not be merged under any circumstances.

To maintain code quality and project integrity, it's crucial to respect these label guidelines. Please ensure you review and update labels appropriately throughout the PR lifecycle.

Thank you for your cooperation!
