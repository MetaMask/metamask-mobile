// Exclude checking for files in .github directory
const EXCLUDE_REGEX = /^.github/;

enum AUTOMATION_TYPE {
  CI = 'ci',
  PRE_COMMIT_HOOK = 'pre-commit-hook',
  PRE_PUSH_HOOK = 'pre-push-hook',
}

export { EXCLUDE_REGEX, AUTOMATION_TYPE };
