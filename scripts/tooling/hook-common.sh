#!/bin/sh
# Shared skill-tracking logic, dot-sourced from hook-cursor-dispatch.sh and
# hook-claude-dispatch.sh. Uses underscore-prefixed locals to avoid polluting
# the caller's variable namespace.
# $1 = agent name ("cursor" or "claude")

_agent="${1:-unknown}"

# Guard: skip collection in CI or when the user has opted out.
if [ -n "${CI:-}" ] || [ "${TOOL_USAGE_COLLECTION_OPT_IN:-}" = "false" ]; then
  return 0 2>/dev/null || exit 0
fi

_payload=$(cat 2>/dev/null) || _payload=""

_log_file="${TOOL_USAGE_COLLECTION_LOG_PATH:-${HOME}/.tool-usage-collection/metamask-mobile-events.log}"
_log_dir=$(dirname "$_log_file")

# Extract the tool_name so we only do path-based detection on file-read tools.
# Matching SKILL.md paths inside StrReplace / WriteFile payloads would produce
# false positives because those tools carry skill paths as string content, not
# as the file being accessed.
_tool_name=$(printf '%s' "$_payload" \
  | grep -oE '"tool_name"[[:space:]]*:[[:space:]]*"[^"]+"' \
  | sed -E 's#"tool_name"[[:space:]]*:[[:space:]]*"([^"]+)"#\1#' \
  | head -1)

# Path-based skill detection: only for file-reading tools (ReadFile / Read).
case "${_tool_name:-}" in
  ReadFile|Read)
    _skill_path=$(printf '%s' "$_payload" \
      | grep -oE '\.(agents|cursor|claude)/skills/[^/"]+/SKILL\.md' \
      | head -1)
    if [ -n "$_skill_path" ]; then
      _skill_name=$(printf '%s' "$_skill_path" | sed -E 's#.*/skills/([^/]+)/SKILL\.md#\1#')
    fi
    ;;
esac

# Claude Skill tool: name given directly as "skill":"<name>" inside tool_input.
if [ -z "${_skill_name:-}" ]; then
  _skill_name=$(printf '%s' "$_payload" \
    | grep -oE '"skill"[[:space:]]*:[[:space:]]*"[a-z0-9][a-z0-9-]*"' \
    | sed -E 's#"skill"[[:space:]]*:[[:space:]]*"([^"]+)"#\1#' \
    | head -1)
fi

if [ -n "${_skill_name:-}" ]; then
  # Cursor uses session_id; Claude uses conversation_id.
  _session_id=$(printf '%s' "$_payload" | sed -n 's|.*"session_id"[[:space:]]*:[[:space:]]*"\([^"]*\)".*|\1|p' | head -1)
  if [ -z "${_session_id:-}" ]; then
    _session_id=$(printf '%s' "$_payload" | sed -n 's|.*"conversation_id"[[:space:]]*:[[:space:]]*"\([^"]*\)".*|\1|p' | head -1)
  fi

  _timestamp=$(date -u '+%Y-%m-%dT%H:%M:%SZ')

  mkdir -p "$_log_dir" 2>/dev/null || true
  # Write the header on first creation so the file is self-describing.
  if [ ! -f "$_log_file" ]; then
    printf 'tool_name,tool_type,event_type,agent_vendor,session_id,success,duration_ms,created_at\n' \
      >> "$_log_file" 2>/dev/null || true
  fi
  printf 'skill:%s,skill,start,%s,%s,,,%s\n' \
    "$_skill_name" "$_agent" "${_session_id:-}" "$_timestamp" \
    >> "$_log_file" 2>/dev/null || true
fi
