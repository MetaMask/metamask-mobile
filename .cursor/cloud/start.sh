#!/usr/bin/env bash
#
# Cloud Agent per-boot start step for MetaMask Mobile.
#
# Raises kernel limits that Metro (bundling) and Jest (unit tests) need on this
# large React Native codebase. With the default vm.max_map_count (65530), a
# memory-heavy Metro bundle exhausts its mmap regions, which V8 misreports as a
# spurious "NewSpace::EnsureCurrentCapacity ... JavaScript heap out of memory"
# even though plenty of RAM is free. Raising the limit lets the full app bundle.
#
# These are kernel runtime settings and reset on every boot, so they belong in
# start (not install). Failures are non-fatal so a boot without sudo still works.
set -uo pipefail

if command -v sudo >/dev/null 2>&1; then
  sudo sysctl -w vm.max_map_count=1048576 || echo "warn: could not set vm.max_map_count"
  sudo sysctl -w vm.overcommit_memory=1   || echo "warn: could not set vm.overcommit_memory"
else
  sysctl -w vm.max_map_count=1048576 2>/dev/null || echo "warn: no sudo; vm.max_map_count unchanged"
  sysctl -w vm.overcommit_memory=1   2>/dev/null || true
fi

echo "start: vm.max_map_count=$(cat /proc/sys/vm/max_map_count) vm.overcommit_memory=$(cat /proc/sys/vm/overcommit_memory)"
