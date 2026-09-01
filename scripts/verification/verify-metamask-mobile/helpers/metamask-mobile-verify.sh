#!/usr/bin/env bash
# Verification harness for MetaMask Mobile (JS test layers).
# Usage: metamask-mobile-verify.sh <doctor|drive-predict-views|drive-static|cleanup> [path...]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"

RUN_ID="${RUN_ID:-mm-verify-$(date +%s)}"
ARTIFACTS_DIR="${MM_VERIFY_ARTIFACTS:-/tmp/metamask-mobile-verify-${RUN_ID}}"

export PATH="/home/ubuntu/.nvm/versions/node/v24.18.0/bin:${PATH:-}"

mkdir -p "$ARTIFACTS_DIR"

doctor() {
  echo "== metamask-mobile doctor =="
  echo "repo: $REPO_ROOT"
  echo "run_id: $RUN_ID"
  echo "artifacts: $ARTIFACTS_DIR"
  echo "node: $(node -v)"
  echo "yarn: $(yarn -v)"

  if [[ -f "${REPO_ROOT}/.js.env" || -f "${REPO_ROOT}/.js.env.example" ]]; then
    echo "js_env: ok"
  else
    echo "js_env: missing .js.env and .js.env.example"
    return 1
  fi

  if [[ -d "${REPO_ROOT}/node_modules" ]]; then
    echo "node_modules: present"
  else
    echo "node_modules: missing — run yarn install"
    return 1
  fi

  echo "doctor: pass"
}

drive_predict_views() {
  cd "$REPO_ROOT"
  local log="${ARTIFACTS_DIR}/predict-views.log"
  yarn jest -c jest.config.view.js app/components/UI/Predict/views \
    --runInBand --silent --coverage=false 2>&1 | tee "$log"
  local exit_code="${PIPESTATUS[0]}"
  {
    echo "feature: predict-views"
    echo "run_id: $RUN_ID"
    echo "command: yarn jest -c jest.config.view.js app/components/UI/Predict/views --runInBand"
    echo "exit_code: $exit_code"
  } >"${ARTIFACTS_DIR}/predict-views-proof.txt"
  if [[ "$exit_code" -ne 0 ]]; then
    echo "drive-predict-views: failed — see $log" >&2
    return "$exit_code"
  fi
  echo "drive-predict-views: pass — artifacts in $ARTIFACTS_DIR"
}

drive_static() {
  cd "$REPO_ROOT"
  local target="${1:-app/components/UI/Predict/}"
  local lint_log="${ARTIFACTS_DIR}/lint.log"
  local tsc_log="${ARTIFACTS_DIR}/tsc.log"

  yarn lint -- "$target" 2>&1 | tee "$lint_log"
  local lint_code="${PIPESTATUS[0]}"

  yarn lint:tsc 2>&1 | tee "$tsc_log"
  local tsc_code="${PIPESTATUS[0]}"

  {
    echo "feature: static-analysis"
    echo "run_id: $RUN_ID"
    echo "lint_target: $target"
    echo "lint_exit: $lint_code"
    echo "tsc_exit: $tsc_code"
  } >"${ARTIFACTS_DIR}/static-proof.txt"

  if [[ "$lint_code" -ne 0 || "$tsc_code" -ne 0 ]]; then
    echo "drive-static: failed" >&2
    return 1
  fi
  echo "drive-static: pass — artifacts in $ARTIFACTS_DIR"
}

cleanup() {
  echo "cleanup: no processes to stop (test-only harness)"
  echo "cleanup: artifacts preserved at $ARTIFACTS_DIR"
}

usage() {
  echo "Usage: $0 <doctor|drive-predict-views|drive-static> [lint-target]"
  exit 1
}

case "${1:-}" in
  doctor) doctor ;;
  drive-predict-views) drive_predict_views ;;
  drive-static) shift; drive_static "${1:-app/components/UI/Predict/}" ;;
  cleanup) cleanup ;;
  *) usage ;;
esac
