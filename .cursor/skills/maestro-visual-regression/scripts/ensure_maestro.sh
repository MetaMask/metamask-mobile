#!/usr/bin/env bash
# Install Maestro CLI on this machine (not the repo).
# If Homebrew is missing, install that first, then `mobile-dev-inc/tap/maestro`.
set -euo pipefail

log() { printf '%s\n' "$*"; }
die() { printf 'error: %s\n' "$*" >&2; exit 1; }

have() { command -v "$1" >/dev/null 2>&1; }

find_brew() {
  if have brew; then
    command -v brew
    return 0
  fi
  local candidate
  for candidate in /opt/homebrew/bin/brew /usr/local/bin/brew; do
    if [[ -x "${candidate}" ]]; then
      printf '%s\n' "${candidate}"
      return 0
    fi
  done
  return 1
}

find_maestro() {
  if have maestro; then
    command -v maestro
    return 0
  fi
  if [[ -x "${HOME}/.maestro/bin/maestro" ]]; then
    printf '%s\n' "${HOME}/.maestro/bin/maestro"
    return 0
  fi
  return 1
}

export_brew_env() {
  eval "$("$1" shellenv)"
}

install_homebrew() {
  [[ "$(uname -s)" == "Darwin" ]] || die "Homebrew auto-install is only implemented for macOS."
  log "Homebrew not found. Installing Homebrew (official installer)."
  log "You may need to enter your macOS password."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  local brew_bin
  brew_bin="$(find_brew)" || die "Homebrew installer finished but brew was not found on PATH or in /opt/homebrew or /usr/local."
  export_brew_env "${brew_bin}"
  log "Homebrew ready: $(command -v brew)"
}

ensure_java() {
  if have java; then
    local version
    version="$(java -version 2>&1 | head -n 1 || true)"
    log "Java present: ${version}"
    return 0
  fi
  log "Java 17+ is required for Maestro. Installing openjdk@17 via Homebrew."
  brew install openjdk@17
  local prefix
  prefix="$(brew --prefix openjdk@17)"
  export PATH="${prefix}/bin:${PATH}"
  export JAVA_HOME="${prefix}"
  have java || die "openjdk@17 installed but java is not on PATH. Add ${prefix}/bin to PATH and set JAVA_HOME=${prefix}."
}

install_maestro() {
  local brew_bin
  brew_bin="$(find_brew)" || die "brew is required to install Maestro."
  export_brew_env "${brew_bin}"
  # Fully-qualified formula: `brew install maestro` can install the unrelated Maestro AI cask.
  brew tap mobile-dev-inc/tap
  brew trust --formula mobile-dev-inc/tap/maestro || true
  brew install mobile-dev-inc/tap/maestro
}

main() {
  if maestro_bin="$(find_maestro)"; then
    log "Maestro already installed: ${maestro_bin}"
    "${maestro_bin}" --version 2>/dev/null || "${maestro_bin}" --help >/dev/null
    exit 0
  fi

  if brew_bin="$(find_brew)"; then
    export_brew_env "${brew_bin}"
  else
    install_homebrew
  fi

  ensure_java
  install_maestro

  maestro_bin="$(find_maestro)" || die "Maestro install finished but maestro was not found. Open a new shell or add Homebrew's bin to PATH."
  export PATH="$(dirname "${maestro_bin}"):${PATH}"
  maestro --help >/dev/null
  log "Maestro ready: $(command -v maestro)"
}

main "$@"
