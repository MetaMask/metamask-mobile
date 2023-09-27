# PR Labeling Guidelines
To maintain a consistent and efficient development workflow, we have set specific label guidelines for all pull requests (PRs). Please ensure you adhere to the following instructions:

### Mandatory team labels:
- **Internal Developers**: Every PR raised by an internal developer must include a label prefixed with `team-` (e.g., `team-mobile-ux`, `team-mobile-platform`, etc.). This indicates the respective internal team responsible for the PR.

- **External Contributors**: PRs from contributors outside the organization must have the `external-contributor` label.

It's essential to ensure that PRs have the appropriate labels before they are considered for merging.

### Mandatory QA labels:
Every PR shall include one the QA labels below:
- **needs-qa**: If the PR includes a new features, complex testing steps, or large refactors, this label must be added to indicated PR requires a full manual QA prior being merged and added to a release.
- **No QA/E2E only**: If the PR does not require any manual QA effort, this label must be added. However, prior to merging, you must ensure end-to-end test runs in Bitrise are successful.
- **Spot check on release build**: If PR does not require feature QA but needs non-automated verification, this label must be added. Furthermore, when that label is added, you must provide test scenarios in the description section, as well as add screenshots, and or recordings of what was tested.

Once PR has been tested by QA (only if the PR was labeled with `needs-qa`):
- **QA Passed**: If the PR was labeled with `needs-qa`, this label must be added once QA has signed off

### Labels prohibited when PR needs to be merged:
Any PR that includes one of the following labels can not be merged:

- **needs-qa**: The PR requires a full manual QA prior to being merged and added to a release.
- **QA'd but questions**: The PR has been checked by QA, but there are pending questions or clarifications needed on minor issues that were found.
- **issues-found**: The PR has been checked by QA or other reviewers, and appeared to include issues that need to be addressed.
- **need-ux-ds-review**: The PR requires a review from the User Experience or Design System teams.
- **blocked**: There are unresolved dependencies or other issues blocking the progress of this PR.
- **stale**: The PR has not had recent activity in the last 90 days. It will be closed in 7 days.
- **DO-NOT-MERGE**: The PR should not be merged under any circumstances.

To maintain code quality and project integrity, it's crucial to respect these label guidelines. Please ensure you review and update labels appropriately throughout the PR lifecycle.

Thank you for your cooperation!
