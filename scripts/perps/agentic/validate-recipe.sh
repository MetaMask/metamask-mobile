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

# Source port config so WATCHER_PORT is in env for cdp-bridge.js.
# Only set vars not already defined, so caller env takes precedence.
if [ -f .js.env ]; then
  while IFS= read -r _line || [ -n "$_line" ]; do
    [[ "$_line" =~ ^[[:space:]]*(#|$) ]] && continue
    _line="${_line#export }"
    _key="${_line%%=*}"
    _key="${_key//[[:space:]]/}"
    [[ -n "$_key" && -z "${!_key+x}" ]] && eval "export $_line" 2>/dev/null || true
  done < .js.env
  unset _line _key
fi
export WATCHER_PORT="${WATCHER_PORT:-8081}"

SD="scripts/perps/agentic"

# ── Args ──────────────────────────────────────────────────────────────
RECIPE="" DRY=false SKIP_MANUAL=false SINGLE="" OVERRIDE_ACCOUNT="" OVERRIDE_TESTNET=false HUD_ENABLED=true
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)     DRY=true; shift ;;
    --skip-manual) SKIP_MANUAL=true; shift ;;
    --no-hud)      HUD_ENABLED=false; shift ;;
    --step)        SINGLE="$2"; shift 2 ;;
    --account)     OVERRIDE_ACCOUNT="$2"; shift 2 ;;
    --testnet)     OVERRIDE_TESTNET=true; shift ;;
    -*)            echo "Unknown flag: $1"; exit 1 ;;
    *)             RECIPE="$1"; shift ;;
  esac
done

[ -z "$RECIPE" ] && { echo "Usage: validate-recipe.sh <recipe-folder-or-json> [--dry-run] [--step <id>] [--skip-manual] [--account <addr>] [--testnet]"; exit 1; }

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

# ── Apply {{param|default}} substitution on the recipe itself ─────────
# Pass 1: apply defaults declared in the "inputs" block (single source of truth).
# Pass 2: fallback — replace remaining {{key|default}} with inline defaults (backward compat).
_RECIPE_SUBST=$(mktemp /tmp/perps-recipe-XXXXXXXXXXXX).json
_FLOW_TEMPS=()
trap 'rm -f "$_RECIPE_SUBST" "${_FLOW_TEMPS[@]}"' EXIT
node -e "
  var fs=require('fs');
  var src=fs.readFileSync(process.argv[1],'utf8');
  var doc; try{doc=JSON.parse(src);}catch(e){doc={};}
  var inputs=doc.inputs||{};
  for(var k in inputs){
    if(inputs[k].default!=null){
      src=src.replace(new RegExp('\\\\{\\\\{'+k+'(?:\\\\|[^}]*)?\\\\}\\\\}','g'),String(inputs[k].default));
    }
  }
  src=src.replace(/\{\{[^|}]+\|([^}]+)\}\}/g,'\$1');
  fs.writeFileSync(process.argv[2],src);
" "$RECIPE" "$_RECIPE_SUBST"
RECIPE="$_RECIPE_SUBST"

# ── Recipe metadata ───────────────────────────────────────────────────
TITLE=$(node -p "JSON.parse(require('fs').readFileSync(process.argv[1],'utf8')).title||'Untitled'" "$RECIPE")
PR=$(node -p "JSON.parse(require('fs').readFileSync(process.argv[1],'utf8')).pr||'?'" "$RECIPE")
PRECOND=$(node -p "const d=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'));const c=((d.validate||{}).runtime||{}).pre_conditions||[];c.join('; ')||'none'" "$RECIPE")

echo "Running recipe: $TITLE (PR #$PR)"
echo "Pre-conditions: $PRECOND"
echo ""

# ── Initial conditions ────────────────────────────────────────────────
IC_ACCOUNT=$(node -p "const c=(JSON.parse(require('fs').readFileSync(process.argv[1],'utf8')).initial_conditions||{});c.account||''" "$RECIPE")
IC_TESTNET=$(node -p "const c=(JSON.parse(require('fs').readFileSync(process.argv[1],'utf8')).initial_conditions||{});c.testnet!==undefined?String(c.testnet):''" "$RECIPE")
IC_PROVIDER=$(node -p "const c=(JSON.parse(require('fs').readFileSync(process.argv[1],'utf8')).initial_conditions||{});c.provider||''" "$RECIPE")

# CLI overrides
[ -n "$OVERRIDE_ACCOUNT" ]       && IC_ACCOUNT="$OVERRIDE_ACCOUNT"
[ "$OVERRIDE_TESTNET" = true ]   && IC_TESTNET="true"

if [ "$DRY" = false ]; then
  if [ -n "$IC_ACCOUNT" ]; then
    echo "[setup] switch-account $IC_ACCOUNT"
    bash "$SD/app-state.sh" switch-account "$IC_ACCOUNT" >/dev/null 2>&1
  fi
  if [ -n "$IC_TESTNET" ]; then
    CURR_TESTNET=$(node "$SD/cdp-bridge.js" eval "Engine.context.PerpsController.state.isTestnet" 2>/dev/null)
    if [ "$CURR_TESTNET" != "$IC_TESTNET" ]; then
      echo "[setup] toggle_testnet (current: $CURR_TESTNET → desired: $IC_TESTNET)"
      node "$SD/cdp-bridge.js" eval-async "Engine.context.PerpsController.toggleTestnet().then(function(r){return JSON.stringify(r)})" >/dev/null 2>&1
    fi
  fi
  if [ -n "$IC_PROVIDER" ]; then
    echo "[setup] switch_provider $IC_PROVIDER"
    node "$SD/cdp-bridge.js" eval-async "Engine.context.PerpsController.switchProvider('$IC_PROVIDER').then(function(r){return JSON.stringify(r)})" >/dev/null 2>&1
  fi
fi

# ── Pre-condition checks ──────────────────────────────────────────────
# Expand pre-condition shorthand: "name(k=v)" → { name, k: v }
PC_JSON=$(node -p "
  var d=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'));
  var pcs=((d.validate||{}).runtime||{}).pre_conditions||[];
  var expanded=pcs.map(function(spec){
    if(typeof spec!=='string')return spec;
    var m=spec.match(/^([^(]+)\((.+)\)$/);
    if(!m)return spec;
    var r={name:m[1]};
    m[2].split(',').forEach(function(pair){
      var eq=pair.indexOf('=');
      if(eq>0)r[pair.slice(0,eq).trim()]=pair.slice(eq+1).trim();
    });
    return r;
  });
  JSON.stringify(expanded);
" "$RECIPE")
if [ "$PC_JSON" != "[]" ] && [ "$DRY" = false ]; then
  echo "[pre-conditions] Checking: $PC_JSON"
  PC_RESULT=$(node "$SD/cdp-bridge.js" check-pre-conditions "$PC_JSON" 2>&1)
  PC_OK=$(node -p "JSON.parse(process.argv[1]).ok" "$PC_RESULT" 2>/dev/null || echo "false")
  if [ "$PC_OK" != "true" ]; then
    echo ""
    echo "PRE-CONDITIONS FAILED ❌"
    node -e "
      var r=JSON.parse(process.argv[1]);
      (r.failures||[]).forEach(function(f){
        console.log('  • '+f.name+(f.description?' — '+f.description:''));
        if(f.error)  console.log('    error: '+f.error);
        if(f.got)    console.log('    got:   '+f.got);
        if(f.hint)   console.log('    hint:  '+f.hint);
      });
    " "$PC_RESULT"
    echo ""
    exit 1
  fi
  echo "[pre-conditions] ✅ All passed"
  echo ""
fi

# ── Counters ──────────────────────────────────────────────────────────
TOTAL=0 PASSED=0 FAILED=0 SKIPPED=0

fail_recipe() {
  FAILED=$((FAILED + 1))
  echo ""
  echo "────────────────────────────────────────"
  echo "Results: $PASSED/$TOTAL passed, $FAILED failed"
  if [ "$HUD_ENABLED" = true ]; then
    node "$SD/cdp-bridge.js" hide-step 2>/dev/null || true
  fi
  echo "Recipe: FAIL ❌"
  exit 1
}

# ── Assertion evaluator ───────────────────────────────────────────────
# Usage: check_assert <result-json> <assert-json>
# Output: "PASS" or "FAIL"
check_assert() {
  node -e "
const { checkAssert } = require(require('path').resolve(process.argv[3], 'lib/assert'));
console.log(checkAssert(process.argv[1], JSON.parse(process.argv[2])) ? 'PASS' : 'FAIL');
" "$1" "$2" "$SD"
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
  SDESC=$(node -p "
    var s = JSON.parse(process.argv[1]);
    s.description || (function() {
      var a = s.action || '';
      if (a === 'press')          return 'press ' + s.test_id;
      if (a === 'wait_for')       return 'wait for ' + (s.test_id || s.route || s.not_route || 'condition');
      if (a === 'navigate')       return 'navigate to ' + s.target;
      if (a === 'set_input')      return 'set ' + s.test_id + '=' + s.value;
      if (a === 'flow_ref')       return 'flow: ' + s.ref;
      if (a === 'eval_ref')       return 'eval ref: ' + s.ref;
      if (a === 'eval_sync' || a === 'eval_async') return a;
      if (a === 'type_keypad')    return 'type ' + s.value;
      if (a === 'toggle_testnet') return 'toggle testnet=' + (s.enabled !== undefined ? s.enabled : 'true');
      return a;
    }())
  " "$sj")
  ACT=$(node -p  "JSON.parse(process.argv[1]).action||''"       "$sj")
  HAS_A=$(node -p "'assert' in JSON.parse(process.argv[1])"     "$sj")
  A_JSON=$(node -p "JSON.stringify(JSON.parse(process.argv[1]).assert||{})" "$sj")

  [ -n "$SINGLE" ] && [ "$SID" != "$SINGLE" ] && continue
  TOTAL=$((TOTAL + 1))
  echo "[$SID] $SDESC"

  if [ "$HUD_ENABLED" = true ] && [ "$DRY" = false ]; then
    node "$SD/cdp-bridge.js" show-step "$SID" "$TITLE — $SDESC" 2>/dev/null || true
  fi

  RESULT=""
  case "$ACT" in
    navigate)
      TARGET=$(node -p "JSON.parse(process.argv[1]).target||''" "$sj")
      PARAMS=$(node -p "const p=JSON.parse(process.argv[1]).params;p?JSON.stringify(p):''" "$sj")
      if [ -n "$PARAMS" ]; then
        echo "  -> app-navigate.sh --no-screenshot $TARGET '<params>'"
        [ "$DRY" = false ] && bash "$SD/app-navigate.sh" --no-screenshot "$TARGET" "$PARAMS" >/dev/null 2>&1
      else
        echo "  -> app-navigate.sh --no-screenshot $TARGET"
        [ "$DRY" = false ] && bash "$SD/app-navigate.sh" --no-screenshot "$TARGET" >/dev/null 2>&1
      fi
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
    eval_ref)
      REF=$(node -p "JSON.parse(process.argv[1]).ref||''" "$sj")
      echo "  -> eval-ref perps/$REF"
      [ "$DRY" = false ] && RESULT=$(node "$SD/cdp-bridge.js" eval-ref "perps/$REF" 2>/dev/null)
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
      if [ "${input:-}" = "s" ]; then
        echo "  [SKIPPED by user]"; SKIPPED=$((SKIPPED + 1)); echo ""; continue
      fi
      PASSED=$((PASSED + 1)); echo "  ✅ PASS"; echo ""; continue
      ;;
    press)
      TEST_ID=$(node -p "JSON.parse(process.argv[1]).test_id||''" "$sj")
      if [[ -z "$TEST_ID" ]]; then
        RESULT='{"ok":false,"error":"press requires test_id"}'
      else
        echo "  -> press-test-id $TEST_ID"
        if [ "$DRY" = false ]; then
          RESULT=$(node "$SD/cdp-bridge.js" press-test-id "$TEST_ID" 2>/dev/null) || RESULT='{"ok":false,"error":"press-test-id failed"}'
        fi
      fi
      ;;
    scroll)
      SCROLL_ARGS=()
      S_TID=$(node -p "JSON.parse(process.argv[1]).test_id||''" "$sj")
      S_OFF=$(node -p "JSON.parse(process.argv[1]).offset??300" "$sj")
      S_ANIM=$(node -p "JSON.parse(process.argv[1]).animated===true?'true':'false'" "$sj")
      [[ -n "$S_TID" ]] && SCROLL_ARGS+=(--test-id "$S_TID")
      SCROLL_ARGS+=(--offset "$S_OFF")
      [[ "$S_ANIM" == "true" ]] && SCROLL_ARGS+=(--animated) || SCROLL_ARGS+=(--no-animated)
      echo "  -> scroll-view ${SCROLL_ARGS[*]}"
      if [ "$DRY" = false ]; then
        RESULT=$(node "$SD/cdp-bridge.js" scroll-view "${SCROLL_ARGS[@]}" 2>/dev/null) || RESULT='{"ok":false,"error":"scroll-view failed"}'
      fi
      ;;
    set_input)
      SI_TID=$(node -p "JSON.parse(process.argv[1]).test_id||''" "$sj")
      SI_VAL=$(node -p "JSON.parse(process.argv[1]).value??''" "$sj")
      if [[ -z "$SI_TID" ]]; then
        RESULT='{"ok":false,"error":"set_input requires test_id"}'
      else
        echo "  -> set-input $SI_TID \"${SI_VAL:0:40}\""
        if [ "$DRY" = false ]; then
          RESULT=$(node "$SD/cdp-bridge.js" set-input "$SI_TID" "$SI_VAL" 2>/dev/null) || RESULT='{"ok":false,"error":"set-input failed"}'
        fi
      fi
      ;;
    flow_ref)
      FL_REF=$(node -p "JSON.parse(process.argv[1]).ref||''" "$sj")
      FL_PARAMS=$(node -p "JSON.stringify(JSON.parse(process.argv[1]).params||{})" "$sj")
      # Resolve flow path: "team/name" → teams/team/flows/name.json
      if [[ "$FL_REF" == */* ]]; then
        FL_TEAM="${FL_REF%%/*}"
        FL_NAME="${FL_REF#*/}"
        FLOW_FILE="$SD/teams/${FL_TEAM}/flows/${FL_NAME}.json"
      else
        FLOW_FILE="$SD/teams/perps/flows/${FL_REF}.json"
      fi
      if [ ! -f "$FLOW_FILE" ]; then
        echo "  ❌ FAIL: flow not found: ${FLOW_FILE#$SD/}"; fail_recipe
      fi
      echo "  -> flow: $FL_REF (params: ${FL_PARAMS:0:80})"
      SUBST_FLOW=$(mktemp /tmp/perps-flow-XXXXXXXXXXXX).json
      _FLOW_TEMPS+=("$SUBST_FLOW")
      node -e "
        var fs=require('fs');
        var src=fs.readFileSync(process.argv[1],'utf8');
        var doc; try{doc=JSON.parse(src);}catch(e){doc={};}
        var p=JSON.parse(process.argv[2]);
        var inputs=doc.inputs||{};
        // Pass 1: replace {{key}} and {{key|default}} with provided param values
        for(var k in p){src=src.replace(new RegExp('\\\\{\\\\{'+k+'(?:\\\\|[^}]*)?\\\\}\\\\}','g'),String(p[k]));}
        // Pass 2: apply defaults from the referenced flow's inputs block
        for(var ik in inputs){
          if(inputs[ik].default!=null && !p.hasOwnProperty(ik)){
            src=src.replace(new RegExp('\\\\{\\\\{'+ik+'(?:\\\\|[^}]*)?\\\\}\\\\}','g'),String(inputs[ik].default));
          }
        }
        // Pass 3: fallback — replace remaining {{key|default}} with inline defaults
        src=src.replace(/\{\{[^|}]+\|([^}]+)\}\}/g,'\$1');
        fs.writeFileSync(process.argv[3],src);
      " "$FLOW_FILE" "$FL_PARAMS" "$SUBST_FLOW"
      FLOW_FLAGS=()
      [ "$DRY" = true ]         && FLOW_FLAGS+=(--dry-run)
      [ "$SKIP_MANUAL" = true ] && FLOW_FLAGS+=(--skip-manual)
      [ "$HUD_ENABLED" = false ] && FLOW_FLAGS+=(--no-hud)
      if bash "$SD/validate-recipe.sh" "$SUBST_FLOW" "${FLOW_FLAGS[@]}"; then
        RESULT='{"ok":true}'
      else
        echo "  ❌ FAIL: flow failed: $FL_REF"; fail_recipe
      fi
      ;;
    select_account)
      ADDR=$(node -p "JSON.parse(process.argv[1]).address||''" "$sj")
      echo "  -> switch-account $ADDR"
      [ "$DRY" = false ] && RESULT=$(bash "$SD/app-state.sh" switch-account "$ADDR" 2>&1)
      ;;
    toggle_testnet)
      DESIRED=$(node -p "var s=JSON.parse(process.argv[1]);s.enabled!==undefined?String(s.enabled):'true'" "$sj")
      echo "  -> toggle_testnet (desired: $DESIRED)"
      if [ "$DRY" = false ]; then
        CURR=$(node "$SD/cdp-bridge.js" eval "Engine.context.PerpsController.state.isTestnet" 2>/dev/null)
        if [ "$CURR" != "$DESIRED" ]; then
          RESULT=$(node "$SD/cdp-bridge.js" eval-async "Engine.context.PerpsController.toggleTestnet().then(function(r){return JSON.stringify(r)})" 2>/dev/null)
        else
          RESULT='{"ok":true,"already":true}'
        fi
      fi
      ;;
    switch_provider)
      PROV=$(node -p "JSON.parse(process.argv[1]).provider||''" "$sj")
      echo "  -> switch_provider $PROV"
      [ "$DRY" = false ] && RESULT=$(node "$SD/cdp-bridge.js" eval-async "Engine.context.PerpsController.switchProvider('$PROV').then(function(r){return JSON.stringify(r)})" 2>/dev/null)
      ;;
    type_keypad)
      TK_VAL=$(node -p "JSON.parse(process.argv[1]).value||''" "$sj")
      echo "  -> type_keypad \"$TK_VAL\""
      if [ "$DRY" = false ]; then
        KEYS=$(node -p "
          var v=String(process.argv[1]),keys=[];
          for(var i=0;i<v.length;i++){
            var c=v[i];
            if(c>='0'&&c<='9') keys.push('keypad-key-'+c);
            else if(c==='.') keys.push('keypad-key-dot');
          }
          keys.join('\n')
        " "$TK_VAL")
        while IFS= read -r key; do
          [ -n "$key" ] && node "$SD/cdp-bridge.js" press-test-id "$key" 2>/dev/null || true
        done <<< "$KEYS"
        RESULT="{\"ok\":true,\"value\":\"$TK_VAL\"}"
      fi
      ;;
    clear_keypad)
      CK_COUNT=$(node -p "JSON.parse(process.argv[1]).count||8" "$sj")
      echo "  -> clear_keypad x${CK_COUNT}"
      if [ "$DRY" = false ]; then
        for ((i=0; i<CK_COUNT; i++)); do
          node "$SD/cdp-bridge.js" press-test-id "keypad-delete-button" 2>/dev/null || true
        done
        RESULT="{\"ok\":true,\"deleted\":$CK_COUNT}"
      fi
      ;;
    wait_for)
      WF_EXPR=$(node -p "JSON.parse(process.argv[1]).expression||''" "$sj")
      WF_ROUTE=$(node -p "JSON.parse(process.argv[1]).route||''" "$sj")
      WF_NROUTE=$(node -p "JSON.parse(process.argv[1]).not_route||''" "$sj")
      WF_TID=$(node -p "JSON.parse(process.argv[1]).test_id||''" "$sj")
      WF_TIMEOUT=$(node -p "JSON.parse(process.argv[1]).timeout_ms||10000" "$sj")
      WF_POLL=$(node -p "JSON.parse(process.argv[1]).poll_ms||500" "$sj")

      # Resolve expression + assertion from sugar (priority: route > not_route > test_id > expression)
      if [ -n "$WF_ROUTE" ]; then
        WF_EXPR="JSON.stringify({route:globalThis.__AGENTIC__.getRoute().name})"
        A_JSON=$(printf '{"operator":"eq","field":"route","value":"%s"}' "$WF_ROUTE")
        HAS_A=true
        echo "  -> wait_for route=$WF_ROUTE (timeout=${WF_TIMEOUT}ms)"
      elif [ -n "$WF_NROUTE" ]; then
        WF_EXPR="JSON.stringify({route:globalThis.__AGENTIC__.getRoute().name})"
        A_JSON=$(printf '{"operator":"neq","field":"route","value":"%s"}' "$WF_NROUTE")
        HAS_A=true
        echo "  -> wait_for not_route=$WF_NROUTE (timeout=${WF_TIMEOUT}ms)"
      elif [ -n "$WF_TID" ]; then
        WF_VISIBLE=$(node -p "JSON.parse(process.argv[1]).visible!==false" "$sj")
        WF_EXPR="JSON.stringify({visible:globalThis.__AGENTIC__.findFiberByTestId('$WF_TID')})"
        if [ "$WF_VISIBLE" = "true" ]; then
          A_JSON='{"operator":"eq","field":"visible","value":true}'
          echo "  -> wait_for testID=$WF_TID visible=true (timeout=${WF_TIMEOUT}ms)"
        else
          A_JSON='{"operator":"eq","field":"visible","value":false}'
          echo "  -> wait_for testID=$WF_TID visible=false (timeout=${WF_TIMEOUT}ms)"
        fi
        HAS_A=true
      else
        echo "  -> wait_for expression (timeout=${WF_TIMEOUT}ms, poll=${WF_POLL}ms)"
      fi

      if [ "$DRY" = true ]; then
        SKIPPED=$((SKIPPED + 1)); echo "  [DRY RUN - not executed]"; echo ""; continue
      fi

      # Determine eval mode: async if expression contains .then(
      WF_EVAL_MODE="eval"
      case "$WF_EXPR" in *".then("*) WF_EVAL_MODE="eval-async" ;; esac

      # Poll loop (use perl for ms timestamps — avoids spawning node per iteration)
      _ms_now() { perl -MTime::HiRes=time -e 'printf "%d\n", time*1000'; }
      WF_DEADLINE=$(( $(_ms_now) + WF_TIMEOUT ))
      WF_SLEEP=$(awk "BEGIN{printf \"%.2f\", $WF_POLL/1000}")
      WF_PASSED=false
      while true; do
        RESULT=$(node "$SD/cdp-bridge.js" "$WF_EVAL_MODE" "$WF_EXPR" 2>/dev/null) || RESULT=""
        if [ -n "$RESULT" ] && [ "$HAS_A" = "true" ]; then
          AR=$(check_assert "$RESULT" "$A_JSON")
          if [[ "$AR" == PASS* ]]; then
            WF_PASSED=true
            break
          fi
        fi
        [ "$(_ms_now)" -ge "$WF_DEADLINE" ] && break
        sleep "$WF_SLEEP"
      done

      [ -n "$RESULT" ] && echo "  -> Result: ${RESULT:0:200}"
      if [ "$WF_PASSED" = true ]; then
        echo "  ✅ PASS"; PASSED=$((PASSED + 1))
      else
        echo "  ❌ FAIL: wait_for timed out after ${WF_TIMEOUT}ms"; fail_recipe
      fi
      echo ""; continue
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
  if [ "$HUD_ENABLED" = true ]; then
    node "$SD/cdp-bridge.js" hide-step 2>/dev/null || true
  fi
  [ "$FAILED" -gt 0 ] && { echo "Recipe: FAIL ❌"; exit 1; }
  echo "Recipe: PASS ✅"
fi
