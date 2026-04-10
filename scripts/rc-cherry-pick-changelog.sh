#!/usr/bin/env bash
#
# Markdown list of RC cherry-pick commits between:
#   • two build numbers (looks up "Bump version number to N"), or
#   • two SHAs (--from / --to).
#
# Git behavior:
#   • Build mode:  git log --first-parent --no-merges (release line).
#   • Hash mode:   git log --ancestry-path --no-merges (see below).
#
# Why --ancestry-path for --from/--to:
#   A plain range "A..B" lists every commit reachable from B but not from A.
#   After merges, that often includes whole subtrees merged in from other
#   branches—commits that are not on any single path from A to B. For an RC
#   changelog between two explicit SHAs we want only commits that lie *between*
#   those endpoints (ancestors of B and descendants of A on the same history).
#   git log --ancestry-path A..B does exactly that (see git-log(1)).
#   We do not add --first-parent here: combined with --ancestry-path it can
#   produce an empty log on typical release merges; plain --ancestry-path matches
#   the usual "what's between these two commits" intent.
#
# Subject filters: drop [skip ci]; keep only Runway / cherry-pick style messages.
#
set -euo pipefail

readonly DEFAULT_REPO_URL='https://github.com/MetaMask/metamask-mobile'

usage() {
  cat <<'EOF'
Usage:
  rc-cherry-pick-changelog.sh <prev_build> <current_build> [--ref <ref>]
  rc-cherry-pick-changelog.sh --from <sha> --to <sha> [--repo-url <url>]

Options:
  --ref <ref>     Ref for bump lookup (default: HEAD), e.g. release/7.73.0
  --repo-url <u>  GitHub base URL for links (default: MetaMask metamask-mobile)
  --full-graph    Build mode only: omit --first-parent
  -h, --help      This help

Examples:
  ./scripts/rc-cherry-pick-changelog.sh 4380 4421 --ref release/7.73.0
  ./scripts/rc-cherry-pick-changelog.sh --from 470307ed55 --to "$(git rev-parse release/7.73.0)"
EOF
  exit "${1:-0}"
}

die() {
  echo "Error: $*" >&2
  exit 1
}

# Commit subject filters (lowercase comparison)
_lower() {
  printf '%s' "$1" | tr '[:upper:]' '[:lower:]'
}

# Bump / automation lines we skip after git log.
subject_is_skip_ci() {
  [[ "$(_lower "$1")" == *'[skip ci]'* ]]
}

# RC cherry-pick heuristics (Runway + manual cherry-picks).
subject_is_cherry_pick() {
  local s
  s="$(_lower "$1")"
  [[ "$s" == *'cherry-pick'* || "$s" == *'cherry pick'* ]] && return 0
  [[ "$s" == chore\(runway\):* ]] && return 0
  [[ "$s" == *'ci: cherry pick'* || "$s" == *'chore: cherry pick'* || "$s" == *'chore:cherry pick'* ]] && return 0
  return 1
}

# Markdown line for one commit
markdown_line() {
  local sha="$1" subject="$2" base_url="$3"
  local short
  short="$(git rev-parse --short=7 "$sha" 2>/dev/null || echo "${sha:0:7}")"

  if grep -E -q '\(#[[:digit:]]+\)' <<<"$subject"; then
    local pr desc
    pr="$(awk '{print $NF}' <<<"$subject" | tr -d '()')"
    pr="${pr###}"
    desc="$(awk '{NF--; print $0}' <<<"$subject")"
    printf '%s\n' "- [#${pr}](${base_url}/pull/${pr}): ${desc}"
  else
    printf '%s\n' "- [\`${short}\`](${base_url}/commit/${sha}): ${subject}"
  fi
}

main() {
  local repo_url="${DEFAULT_REPO_URL}"
  local git_ref='HEAD'
  local from_sha='' to_sha=''
  local prev_build='' cur_build=''
  local full_graph=false
  local hash_range=false

  # Parse arguments
  while [[ $# -gt 0 ]]; do
    case "$1" in
      -h | --help) usage 0 ;;
      --ref)
        [[ $# -ge 2 ]] || die "--ref needs a value"
        git_ref="$2"
        shift 2
        ;;
      --repo-url)
        [[ $# -ge 2 ]] || die "--repo-url needs a value"
        repo_url="${2%/}"
        shift 2
        ;;
      --from)
        [[ $# -ge 2 ]] || die "--from needs a SHA"
        from_sha="$2"
        shift 2
        ;;
      --to)
        [[ $# -ge 2 ]] || die "--to needs a SHA"
        to_sha="$2"
        shift 2
        ;;
      --full-graph) full_graph=true; shift ;;
      *)
        if [[ -z "${prev_build}" ]] && [[ "$1" =~ ^[0-9]+$ ]]; then
          prev_build="$1"
        elif [[ -z "${cur_build}" ]] && [[ "$1" =~ ^[0-9]+$ ]]; then
          cur_build="$1"
        else
          die "unexpected argument: $1"
        fi
        shift
        ;;
    esac
  done

  # Resolve endpoints to full SHAs
  if [[ -n "${from_sha}" || -n "${to_sha}" ]]; then
    [[ -n "${from_sha}" && -n "${to_sha}" ]] || die "use both --from and --to"
    [[ "${from_sha}" =~ ^[0-9a-fA-F]{7,40}$ ]] || die "invalid --from SHA"
    [[ "${to_sha}" =~ ^[0-9a-fA-F]{7,40}$ ]] || die "invalid --to SHA"
    [[ -z "${prev_build}" && -z "${cur_build}" ]] || die "do not mix build numbers with --from/--to"
    hash_range=true
  else
    [[ -n "${prev_build}" && -n "${cur_build}" ]] || usage 1
    local bump_from bump_to
    bump_from="$(git log "${git_ref}" --grep="Bump version number to ${prev_build}" -1 --format='%H' 2>/dev/null || true)"
    bump_to="$(git log "${git_ref}" --grep="Bump version number to ${cur_build}" -1 --format='%H' 2>/dev/null || true)"
    [[ -n "${bump_from}" ]] || die "no commit for build ${prev_build} (try --ref release/X.Y.Z)"
    [[ -n "${bump_to}" ]] || die "no commit for build ${cur_build} (try --ref release/X.Y.Z)"
    from_sha="${bump_from}"
    to_sha="${bump_to}"
  fi

  [[ "${from_sha}" == "${to_sha}" ]] && {
    echo "Nothing to list: from and to are the same commit."
    exit 0
  }

  git merge-base --is-ancestor "${from_sha}" "${to_sha}" 2>/dev/null ||
    die "--from must be an ancestor of --to"

  # git log: traversal flags depend on mode
  local -a log_args=(--reverse --no-merges --format='%H%n%s')
  if [[ "${hash_range}" == true ]]; then
    # Exclude merged-in subtrees that are not strictly between from..to (see file header).
    log_args=(--ancestry-path "${log_args[@]}")
  elif [[ "${full_graph}" != true ]]; then
    log_args=(--first-parent "${log_args[@]}")
  fi

  local raw_log
  raw_log="$(git log "${log_args[@]}" "${from_sha}..${to_sha}" 2>/dev/null || true)"
  [[ -n "${raw_log}" ]] || {
    echo "No commits in range ${from_sha:0:7}..${to_sha:0:7}."
    exit 0
  }

  local left="commit ${from_sha:0:7}"
  local right="commit ${to_sha:0:7}"
  if [[ -n "${prev_build}" ]]; then
    left="build ${prev_build}"
    right="build ${cur_build}"
  fi
  echo "## RC cherry-picks: ${left} → ${right}"
  echo ""

  # Filter subjects and print
  local count=0
  local sha subject
  while IFS= read -r sha && IFS= read -r subject; do
    [[ -z "${sha}" ]] && continue
    subject_is_skip_ci "${subject}" && continue
    subject_is_cherry_pick "${subject}" || continue
    markdown_line "${sha}" "${subject}" "${repo_url}"
    count=$((count + 1))
  done <<<"${raw_log}"

  if [[ "${count}" -eq 0 ]]; then
    echo "_No cherry-pick commits in this range (after filters)._"
  fi
}

main "$@"
