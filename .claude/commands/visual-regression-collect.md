# Visual Regression Collect

Batch-capture before/after Storybook screenshots for component migration PRs, push to the screenshots branch, and post comparison tables as PR comments.

**Usage:**

```
/visual-regression-collect                  # Auto-discover open migration PRs
/visual-regression-collect 27565            # Process specific PR
/visual-regression-collect 27565 27580      # Process multiple PRs
```

## Instructions

1. Load the `visual-regression-collect` skill for the full workflow.
2. Verify prerequisites: iOS Simulator booted, Storybook running, `gh auth status` passes, clean git tree.
3. Follow the skill phases in order: Discover -> Before Pass -> After Pass -> Upload -> Comment -> Cleanup.

The arguments to this command are: $ARGUMENTS
