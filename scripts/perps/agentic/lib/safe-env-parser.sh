#!/bin/bash
# Shared safe .js.env parser. Source this file, then call load_js_env.
# Values are treated as data — no eval/source. Only allowlisted keys are exported.
# Caller env takes precedence (vars already set are not overwritten).

_JS_ENV_ALLOWED="WATCHER_PORT SIM_UDID IOS_SIMULATOR ANDROID_DEVICE ADB_SERIAL PLATFORM METAMASK_ENVIRONMENT MM_PASSWORD MM_WALLET_PASSWORD CDP_TIMEOUT CDP_DISCOVERY_RETRIES DETOX_SIMULATOR AGENTIC_SIMULATOR MM_BUILD_CACHE_DIR WALLET_FIXTURE BUILD_TYPE METAMASK_DEBUG"

load_js_env() {
  local envfile="${1:-.js.env}"
  [ -f "$envfile" ] || return 0
  local _line _key _val
  while IFS= read -r _line || [ -n "$_line" ]; do
    [[ "$_line" =~ ^[[:space:]]*(#|$) ]] && continue
    _line="${_line#export }"
    _key="${_line%%=*}"
    _key="${_key//[[:space:]]/}"
    _val="${_line#*=}"
    _val="${_val#\"}" ; _val="${_val%\"}"
    _val="${_val#\'}" ; _val="${_val%\'}"
    case " $_JS_ENV_ALLOWED " in
      *" $_key "*) ;;
      *) continue ;;
    esac
    [[ -z "${!_key+x}" ]] && export "$_key=$_val"
  done < "$envfile"
  return 0
}
