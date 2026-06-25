# Update PR Description

Update a GitHub pull request description while preserving the MetaMask Mobile PR template format.

## Usage

`/update-pr-description <PR number or URL> [notes about what changed]`

## Instructions

1. Read `.github/pull-request-template.md` and `.github/scripts/shared/pr-template-checks.ts` before editing.
2. Fetch the current PR body with `gh pr view <PR> --json body,title,number,url,headRefName,baseRefName,isDraft`.
3. Preserve every level-2 template heading exactly, especially:
   - `## **Description**`
   - `## **Changelog**`
   - `## **Related issues**`
   - `## **Manual testing steps**`
   - `## **Screenshots/Recordings**`
   - `## **Pre-merge author checklist**`
   - `## **Pre-merge reviewer checklist**`
4. Preserve all `<!-- mms-check: ... -->` directives and surrounding template comments unless the user explicitly asks to change the template itself.
5. Fill the required semantic sections:
   - Description: concise summary of what changed and why.
   - Changelog: include a non-empty `CHANGELOG entry:` line, or `CHANGELOG entry: null` when appropriate.
   - Related issues: include a non-empty `Fixes:`, `Closes:`, or `Refs:` line. A short rationale is acceptable when no ticket exists.
   - Manual testing steps: real steps or `N/A - <reason>`.
   - Screenshots/Recordings: evidence or `N/A - <reason>`.
   - Author checklist: keep every row and check every box only after consciously assessing it.
6. Validate the drafted body locally with:

   ```bash
   yarn tsx -e "import { readFileSync } from 'fs'; import { runAllChecks } from './.github/scripts/shared/pr-template-checks.ts'; const body = readFileSync('<body-file>', 'utf8'); const failures = runAllChecks(body, false); if (failures.length) { console.error(JSON.stringify(failures, null, 2)); process.exit(1); } console.log('PR template checks passed');"
   ```

7. Update the PR body. Prefer REST when `gh pr edit` fails on deprecated GraphQL fields:

   ```bash
   gh api repos/MetaMask/metamask-mobile/pulls/<PR_NUMBER> --method PATCH --field body=@<body-file> --silent
   ```

8. Read the PR body back from GitHub and run the same local checker against the returned body.
9. Report the PR URL, the validation result, and any sections intentionally marked `N/A`.

Do not rewrite the PR body into a different format. The CI checker depends on the exact template structure.
