#!/bin/sh
# Cursor beforeSubmitPrompt hook entry point.
# {"permission":"allow"} must be the very first output — unconditionally —
# so Cursor never blocks a prompt submission regardless of CI or opt-out status.
printf '{"permission":"allow"}\n'

# Guard: skip collection in CI or when the user has opted out.
if [ -n "${CI:-}" ] || [ "${TOOL_USAGE_COLLECTION_OPT_IN:-}" = "false" ]; then
  exit 0
fi

_payload=$(cat 2>/dev/null) || _payload=""

# Extract skill name from the prompt field when invoked as a slash command.
# e.g. "prompt":"/mms-pr-changelog " → mms-pr-changelog
_skill_name=$(printf '%s' "$_payload" \
  | sed -n 's|.*"prompt"[[:space:]]*:[[:space:]]*"/\([A-Za-z0-9][A-Za-z0-9_-]*\)[^"]*".*|\1|p' \
  | head -1)

[ -z "${_skill_name:-}" ] && exit 0

# Guard: only log if the name resolves to a known SKILL.md to avoid
# misclassifying built-in Cursor slash commands as skill invocations.
_repo_root=$(git rev-parse --show-toplevel 2>/dev/null)
_is_known_skill=0
for _dir in \
  "${HOME}/.cursor/skills" \
  "${HOME}/.cursor/skills-cursor" \
  ${HOME}/.cursor/plugins/cache/*/*/skills \
  "${HOME}/.claude/skills" \
  "${_repo_root}/.claude/skills" \
  "${_repo_root}/.agents/skills" \
  "${_repo_root}/.cursor/skills"; do
  if [ -f "${_dir}/${_skill_name}/SKILL.md" ]; then
    _is_known_skill=1
    break
  fi
done
[ "${_is_known_skill}" -eq 0 ] && exit 0

_session_id=$(printf '%s' "$_payload" \
  | sed -n 's|.*"session_id"[[:space:]]*:[[:space:]]*"\([^"]*\)".*|\1|p' \
  | head -1)

_log_file="${TOOL_USAGE_COLLECTION_LOG_PATH:-${HOME}/.tool-usage-collection/metamask-mobile-events.log}"
_log_dir=$(dirname "$_log_file")
_timestamp=$(date -u '+%Y-%m-%dT%H:%M:%SZ')

mkdir -p "$_log_dir" 2>/dev/null || true
# Exclusive-create: noclobber ensures only the first concurrent writer creates
# the header; all others are silently rejected, preventing duplicate header rows.
( set -C; printf 'tool_name,tool_type,event_type,agent_vendor,session_id,success,duration_ms,created_at\n' \
  > "$_log_file" ) 2>/dev/null || true
printf 'skill:%s,skill,start,cursor,%s,,,%s\n' \
  "$_skill_name" "${_session_id:-}" "$_timestamp" \
  >> "$_log_file" 2>/dev/null || true
