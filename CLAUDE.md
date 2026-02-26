# Claude Code Instructions

## Pull Request Creation

When creating PRs for this repository, follow these rules:

1. **Always follow the PR template** at `.github/pull-request-template.md`. Include all sections: Description, Changelog, Related issues, Manual testing steps, Screenshots/Recordings, Pre-merge author checklist, and Pre-merge reviewer checklist.

2. **Submit PRs as drafts** initially. Do not mark as "Ready for review" until the template is filled and checks pass.

3. **Manual testing steps must use Gherkin format**:

   ```gherkin
   Feature: <feature name>

     Scenario: user <verb for action>
       Given <expected initial app state>

       When user <verb for action>
       Then <expected outcome>
   ```

4. **Use Python + `gh api` with JSON payload to set the PR body**. Do not use `gh pr edit --body` or heredocs — they strip indentation and escape backticks. Example:

   ```python
   import subprocess, json
   body = """<PR body with backticks and indentation>"""
   payload = json.dumps({"body": body})
   subprocess.run(
       ["gh", "api", "repos/MetaMask/metamask-mobile/pulls/<PR_NUMBER>",
        "--method", "PATCH", "--input", "-"],
       input=payload, text=True
   )
   ```

5. **Check all applicable Pre-merge author checklist items** (mark with `[x]`).

6. **Changelog entry**: Use `CHANGELOG entry: null` for non-user-facing changes. For end-user-facing changes, write a past-tense description (e.g., `CHANGELOG entry: Added a new tab for users to see their NFTs`).
