#!/bin/bash
# validate-recipe.sh — Execute a PR recipe against the running app via CDP.
#
# Usage:
#   validate-recipe.sh <recipe-folder-or-json>             # Run all steps
#   validate-recipe.sh <recipe-folder-or-json> --dry-run   # Print steps without executing
#   validate-recipe.sh <recipe-folder-or-json> --step <id> # Run single step by id
#   validate-recipe.sh <recipe-folder-or-json> --skip-manual
#
# Input can be:
#   - A folder (e.g. ~/dev/metamask/mobile-recipes/27323/) — reads recipe.json inside
#   - A .json file path (backward compat)
#
# When folder mode: screenshots are saved directly into the recipe folder.
#
# Exit codes: 0 = all passed, 1 = one or more failed
# Requires:   node, Metro running on WATCHER_PORT, CDP-compatible app
#
# CDP eval semantics (for writing recipe expressions):
#   eval_sync  — Runtime.evaluate synchronously. Use for expressions that return immediately.
#                Works:     Engine.context.PerpsController.state.activeProvider
#                Works:     JSON.stringify(someObject)
#
#   eval_async — Polls globalThis for a Promise result. Works in Hermes. Top-level await does NOT.
#                Expressions must use .then() chains or return a Promise:
#                Works:     someCall().then(function(r){ return JSON.stringify(r); })
#                Works:     Promise.all([a(), b()]).then(function(r){ return r; })
#                Broken:    await someCall()   ← top-level await not supported
#
# Metro log: defaults to .agent/metro.log (written by start-metro.sh).
#            Override with METRO_LOG env var.

set -euo pipefail
cd "$(dirname "$0")/../../.."

# Source port config so WATCHER_PORT is in env for cdp-bridge.js
# Any developer sources their .js.env which sets WATCHER_PORT for their setup.
[[ -f .js.env ]] && source .js.env
export WATCHER_PORT="${WATCHER_PORT:-8081}"

SD="scripts/perps/agentic"

# ── Args ──────────────────────────────────────────────────────────────
RECIPE="" DRY=false SKIP_MANUAL=false SINGLE=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)     DRY=true; shift ;;
    --skip-manual) SKIP_MANUAL=true; shift ;;
    --step)        SINGLE="$2"; shift 2 ;;
    -*)            echo "Unknown flag: $1"; exit 1 ;;
    *)             RECIPE="$1"; shift ;;
  esac
done

[ -z "$RECIPE" ] && { echo "Usage: validate-recipe.sh <recipe-folder-or-json> [--dry-run] [--step <id>] [--skip-manual]"; exit 1; }

# Resolve folder → recipe.json; track RECIPE_DIR for artifact output
RECIPE_DIR=""
if [ -d "$RECIPE" ]; then
  RECIPE_DIR="$RECIPE"
  RECIPE="$RECIPE_DIR/recipe.json"
elif [ -f "$RECIPE" ]; then
  # If it's a recipe.json inside a folder, use that folder
  if [ "$(basename "$RECIPE")" = "recipe.json" ]; then
    RECIPE_DIR="$(dirname "$RECIPE")"
  fi
fi
[ ! -f "$RECIPE" ] && { echo "ERROR: Recipe not found: $RECIPE"; exit 1; }

# Metro log: start-metro.sh writes to .agent/metro.log by default
METRO_LOG="${METRO_LOG:-.agent/metro.log}"

# ── JSON helpers (node one-liners) ────────────────────────────────────
# Read a top-level field from a JSON file
jfile() { node -p "JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'))[process.argv[2]]||''" "$1" "$2"; }
# Read a field from a JSON string passed as arg
jstr()  { node -p "JSON.parse(process.argv[1])[process.argv[2]]||''" "$1" "$2"; }

# ── Recipe metadata ───────────────────────────────────────────────────
TITLE=$(node -p "JSON.parse(require('fs').readFileSync(process.argv[1],'utf8')).title||'Untitled'" "$RECIPE")
PR=$(node -p "JSON.parse(require('fs').readFileSync(process.argv[1],'utf8')).pr||'?'" "$RECIPE")
PRECOND=$(node -p "const d=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'));const c=((d.validate||{}).runtime||{}).pre_conditions||[];c.join('; ')||'none'" "$RECIPE")

echo "Running recipe: $TITLE (PR #$PR)"
echo "Pre-conditions: $PRECOND"
echo ""

# ── Counters ──────────────────────────────────────────────────────────
TOTAL=0 PASSED=0 FAILED=0 SKIPPED=0

fail_recipe() {
  FAILED=$((FAILED + 1))
  echo ""
  echo "────────────────────────────────────────"
  echo "Results: $PASSED/$TOTAL passed, $FAILED failed"
  echo "Recipe: FAIL ❌"
  exit 1
}

# ── Assertion evaluator ───────────────────────────────────────────────
# Usage: check_assert <result-json> <assert-json>
# Output: "PASS" or "FAIL: <reason>"
check_assert() {
  node -e "
const raw=process.argv[1],spec=JSON.parse(process.argv[2]);
let val;try{val=JSON.parse(raw);}catch(e){val=raw;}
if(typeof val==='string'){try{val=JSON.parse(val);}catch(e){}}
const f=spec.field||'';
if(f){for(const p of f.split('.')){if(val&&typeof val==='object')val=Array.isArray(val)&&/^\d+$/.test(p)?val[+p]:val[p];else{val=undefined;break;}}}
const op=spec.operator||'',exp=spec.value;
let pass=false,reason='';
if(op==='not_null'){pass=val!=null;reason='expected not null, got null';}
else if(op==='eq'){pass=val===exp;reason='expected '+JSON.stringify(exp)+', got '+JSON.stringify(val);}
else if(op==='gt'){pass=val>exp;reason='expected > '+exp+', got '+val;}
else if(op==='length_eq'){const n=val!=null?val.length:null;pass=n===exp;reason='expected length=='+exp+', got '+n;}
else if(op==='length_gt'){const n=val!=null?val.length:null;pass=n!=null&&n>exp;reason='expected length>'+exp+', got '+n;}
else if(op==='contains'){const t=String(exp);pass=typeof val==='string'?val.includes(t):Array.isArray(val)&&val.map(String).includes(t);reason=JSON.stringify(val)+' does not contain '+t;}
else if(op==='not_contains'){const t=String(exp);pass=typeof val==='string'?!val.includes(t):Array.isArray(val)&&!val.map(String).includes(t);reason=JSON.stringify(val)+' contains '+t;}
else{reason='unknown operator: '+op;}
console.log(pass?'PASS':'FAIL: '+reason);
" "$1" "$2"
}

# ── Log scanner ───────────────────────────────────────────────────────
# Usage: scan_log <step-json> <log-path>
# Output: JSON {pass, must_not_found[], watch_counts{}}
scan_log() {
  node -e "
const fs=require('fs'),step=JSON.parse(process.argv[1]),logPath=process.argv[2];
const mustNot=step.must_not_appear||[],watchFor=step.watch_for||[];
let lines=[];try{lines=fs.readFileSync(logPath,'utf8').split('\n');}catch(e){}
const recent=lines.slice(-500),r={pass:true,must_not_found:[],watch_counts:{}};
for(const t of mustNot){if(recent.some(l=>l.toLowerCase().includes(t.toLowerCase()))){r.pass=false;r.must_not_found.push(t);}}
for(const t of watchFor){r.watch_counts[t]=recent.filter(l=>l.toLowerCase().includes(t.toLowerCase())).length;}
console.log(JSON.stringify(r));
" "$1" "$2"
}

# ── Main loop ─────────────────────────────────────────────────────────
while IFS= read -r sj; do
  SID=$(node -p  "JSON.parse(process.argv[1]).id||'?'"          "$sj")
  SDESC=$(node -p "JSON.parse(process.argv[1]).description||''" "$sj")
  ACT=$(node -p  "JSON.parse(process.argv[1]).action||''"       "$sj")
  HAS_A=$(node -p "'assert' in JSON.parse(process.argv[1])"     "$sj")
  A_JSON=$(node -p "JSON.stringify(JSON.parse(process.argv[1]).assert||{})" "$sj")

  [ -n "$SINGLE" ] && [ "$SID" != "$SINGLE" ] && continue
  TOTAL=$((TOTAL + 1))
  echo "[$SID] $SDESC"

  RESULT=""
  case "$ACT" in
    navigate)
      TARGET=$(node -p "JSON.parse(process.argv[1]).target||''" "$sj")
      echo "  -> app-navigate.sh --no-screenshot $TARGET"
      [ "$DRY" = false ] && bash "$SD/app-navigate.sh" --no-screenshot "$TARGET" >/dev/null 2>&1
      ;;
    eval_sync)
      EXPR=$(node -p "JSON.parse(process.argv[1]).expression||''" "$sj")
      echo "  -> eval \"${EXPR:0:80}\"..."
      [ "$DRY" = false ] && RESULT=$(node "$SD/cdp-bridge.js" eval "$EXPR" 2>/dev/null)
      ;;
    eval_async)
      EXPR=$(node -p "JSON.parse(process.argv[1]).expression||''" "$sj")
      echo "  -> eval-async \"${EXPR:0:80}\"..."
      [ "$DRY" = false ] && RESULT=$(node "$SD/cdp-bridge.js" eval-async "$EXPR" 2>/dev/null)
      ;;
    recipe_ref)
      REF=$(node -p "JSON.parse(process.argv[1]).ref||''" "$sj")
      echo "  -> recipe perps/$REF"
      [ "$DRY" = false ] && RESULT=$(node "$SD/cdp-bridge.js" recipe "perps/$REF" 2>/dev/null)
      ;;
    log_watch)
      WS=$(node -p "JSON.parse(process.argv[1]).window_seconds||10" "$sj")
      echo "  -> Scanning $METRO_LOG (last ${WS}s)"
      if [ "$DRY" = false ]; then
        if [ ! -f "$METRO_LOG" ]; then
          echo "  -> WARNING: Metro log not found: $METRO_LOG"
          LRESULT='{"pass":true,"must_not_found":[],"watch_counts":{}}'
        else
          LRESULT=$(scan_log "$sj" "$METRO_LOG")
        fi
        LP=$(node -p "JSON.parse(process.argv[1]).pass"                       "$LRESULT")
        MNF=$(node -p "JSON.parse(process.argv[1]).must_not_found.join(', ')" "$LRESULT")
        WC=$(node -p "const c=JSON.parse(process.argv[1]).watch_counts;Object.entries(c).map(([k,v])=>'\"'+k+'\": '+v).join('; ')||'none'" "$LRESULT")
        [ "$WC" != "none" ] && echo "  -> watch_for: $WC"
        if [ "$LP" = "false" ]; then
          echo "  ❌ FAIL: must_not_appear found: $MNF"; fail_recipe
        fi
        echo "  ✅ PASS (must_not_appear strings absent)"
        PASSED=$((PASSED + 1)); echo ""; continue
      fi
      ;;
    screenshot)
      FN=$(node -p "JSON.parse(process.argv[1]).filename||'screenshot'" "$sj")
      echo "  -> screenshot.sh $FN"
      if [ "$DRY" = false ]; then
        SPATH=$(bash "$SD/screenshot.sh" "$FN" 2>/dev/null) || true
        if [ -n "${SPATH:-}" ]; then
          if [ -n "$RECIPE_DIR" ]; then
            cp "$SPATH" "$RECIPE_DIR/" 2>/dev/null && echo "  -> Saved to $RECIPE_DIR/$(basename "$SPATH")" || true
          else
            mkdir -p .agent/artifacts/recipe-screenshots
            cp "$SPATH" .agent/artifacts/recipe-screenshots/ 2>/dev/null || true
          fi
        fi
      fi
      ;;
    wait)
      MS=$(node -p "JSON.parse(process.argv[1]).ms||1000" "$sj")
      echo "  -> wait ${MS}ms"
      [ "$DRY" = false ] && sleep "$(node -p "(+process.argv[1]/1000).toFixed(2)" "$MS")"
      ;;
    manual)
      NOTE=$(node -p "JSON.parse(process.argv[1]).note||''" "$sj")
      [ -n "$NOTE" ] && echo "  -> Note: $NOTE"
      if [ "$DRY" = true ] || [ "$SKIP_MANUAL" = true ]; then
        echo "  [SKIPPED - manual step]"; SKIPPED=$((SKIPPED + 1)); echo ""; continue
      fi
      read -rp "  Press ENTER when done, or 's' to skip: " input
      [ "${input:-}" = "s" ] && echo "  [SKIPPED by user]"
      PASSED=$((PASSED + 1)); echo "  ✅ PASS"; echo ""; continue
      ;;
    *)
      echo "  ❌ FAIL: unknown action '$ACT'"
      FAILED=$((FAILED + 1)); echo ""; continue
      ;;
  esac

  if [ "$DRY" = true ]; then
    SKIPPED=$((SKIPPED + 1)); echo "  [DRY RUN - not executed]"; echo ""; continue
  fi

  [ -n "$RESULT" ] && echo "  -> Result: ${RESULT:0:200}"

  if [ "$HAS_A" = "true" ]; then
    AR=$(check_assert "$RESULT" "$A_JSON")
    if [[ "$AR" == PASS* ]]; then
      echo "  ✅ PASS"; PASSED=$((PASSED + 1))
    else
      echo "  ❌ $AR"; fail_recipe
    fi
  else
    echo "  ✅ PASS"; PASSED=$((PASSED + 1))
  fi
  echo ""

done < <(node -e "
const d=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'));
const steps=((d.validate||{}).runtime||{}).steps||[];
steps.forEach(s=>console.log(JSON.stringify(s)));
" "$RECIPE")

# ── Summary ───────────────────────────────────────────────────────────
echo "────────────────────────────────────────"
if [ "$DRY" = true ]; then
  echo "Results: $TOTAL steps (dry run — none executed)"
  echo "Recipe: DRY RUN"
else
  echo "Results: $PASSED/$TOTAL passed"
  [ "$FAILED" -gt 0 ] && { echo "Recipe: FAIL ❌"; exit 1; }
  echo "Recipe: PASS ✅"
fi
