// Yarn Berry plugin — records directly user-invoked yarn script executions to
// the local CSV events log (defaults to
// ~/.tool-usage-collection/metamask-mobile-events.log).
//
// Appends one CSV line per event directly via fs.appendFileSync.
//
// Root-only tracking: a script spawned as a dependency of another script
// (e.g. `yarn build` shelling out to `yarn build:ios`) runs as a brand new
// `yarn` CLI process that inherits a marker env var from its parent and is
// skipped, so only the outermost script a user typed themselves produces log
// rows. See PARENT_MARKER_ENV_VAR below.
//
// IMPORTANT: the marker is set as soon as the plugin factory runs (module
// load / Yarn configuration bootstrap), NOT inside wrapScriptExecution. Yarn
// computes the env object passed to a script's spawned child process (via
// makeScriptEnv) BEFORE invoking the wrapScriptExecution hook — the executor
// closure already captures that env snapshot, so mutating process.env from
// inside the hook body is too late to affect it. Setting the marker at
// factory time guarantees it is present in process.env before Yarn builds
// that snapshot for any script this process goes on to run.
//
// NOTE: `yarn install` itself (the fetch/link steps) is NOT tracked — no
// plugin hook exists that wraps built-in command execution. However, the
// `preinstall`/`install`/`postinstall` lifecycle scripts a package.json can
// define ARE run through this same `wrapScriptExecution` hook, automatically,
// as part of `yarn install`. The user never types `yarn postinstall`
// themselves, so those script names are excluded unconditionally below (see
// LIFECYCLE_SCRIPT_NAMES), regardless of root/nested status.

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const childProcess = require('child_process');

const PLUGIN_NAME = 'plugin-usage-tracking';
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

// npm/Yarn install lifecycle scripts — Yarn runs these automatically as part
// of `yarn install` via the same wrapScriptExecution hook as any other
// package.json script, but a user never types `yarn postinstall` themselves.
const LIFECYCLE_SCRIPT_NAMES = new Set(['preinstall', 'install', 'postinstall']);

// Standard POSIX "128 + signal number" exit codes for the signals a Ctrl+C
// (or similar interruption) is realistically delivered as. Which exact
// signal a script's process receives when interrupted depends on how it was
// invoked — e.g. a single directly-spawned command may die from SIGHUP
// (129) while a chained script (`cmd1 && cmd2`) or one shelling out to a
// nested `yarn <script>` may die from SIGINT (130) instead — so all of them
// must be treated as "interrupted", not just 129.
const INTERRUPTED_EXIT_CODES = new Set([
  129, // SIGHUP
  130, // SIGINT
  131, // SIGQUIT
  137, // SIGKILL
  143, // SIGTERM
]);

// Set on process.env as soon as this process starts so any nested
// `yarn <script>` child process it later spawns (which inherits process.env)
// can tell it was launched by another script rather than typed by the user.
const PARENT_MARKER_ENV_VAR = 'MM_TOOL_USAGE_PARENT';

// Computed once at module-evaluation time (top-level code in a CJS module
// only runs once per process, even though Yarn calls the exported `factory()`
// more than once per process while resolving configuration/running a
// script). Checking and setting the marker inside factory() instead would
// make the second factory() call see the marker the first call just set,
// producing a false "dependent" reading for a genuinely root process.
const isRootProcess = process.env[PARENT_MARKER_ENV_VAR] == null;
// Idempotent: marks this process's env (root case) or leaves an already-set
// marker in place (nested case), so Yarn's env snapshot for any script run
// in this process — and therefore any nested `yarn` child it spawns —
// carries the marker forward.
process.env[PARENT_MARKER_ENV_VAR] = '1';

// Opportunistic once-a-day trigger: the first non-CI yarn script run after the
// 24h window spawns the anonymizer detached (non-blocking). The gate is the
// `last_run_at` field in anonymizer-state.json — the anonymizer re-checks and
// claims it, so concurrent spawns are harmless.
function maybeTriggerAnonymizer(repoRoot) {
  try {
    if (process.env.CI || process.env.TOOL_USAGE_COLLECTION_OPT_IN === 'false') {
      return;
    }

    const statePath = path.join(
      os.homedir(),
      '.tool-usage-collection',
      'anonymizer-state.json',
    );
    let lastRunAt = null;
    if (fs.existsSync(statePath)) {
      const parsed = JSON.parse(fs.readFileSync(statePath, 'utf8'));
      lastRunAt = parsed.last_run_at ?? null;
    }

    const nowMs = Date.now();
    if (lastRunAt) {
      const lastMs = Date.parse(lastRunAt);
      if (!Number.isNaN(lastMs) && nowMs - lastMs < TWENTY_FOUR_HOURS_MS) {
        return;
      }
    }

    const binPath = path.join(
      repoRoot,
      'node_modules',
      '@metamask',
      'tooling-insight',
      'dist',
      'daily-anonymizer.mjs',
    );
    if (!fs.existsSync(binPath)) {
      return;
    }
    childProcess.spawn(process.execPath, [binPath], {
      detached: true,
      stdio: 'ignore',
    }).unref();
  } catch (error) {
    // Best-effort trigger — never throw into the yarn hot path.
    try {
      const logPath = path.join(os.homedir(), '.tool-usage-collection', 'anonymizer.log');
      const entry = JSON.stringify({
        ts: new Date().toISOString(),
        cli: PLUGIN_NAME,
        level: 'error',
        message: 'maybeTriggerAnonymizer failed',
        extra: { error: error instanceof Error ? error.message : String(error) },
      });
      fs.appendFileSync(logPath, `${entry}\n`);
    } catch {
      // Logging failed — nothing more we can do.
    }
  }
}

function makeTrackingPlugin(repoRoot) {
  const LOG_FILE =
    process.env.TOOL_USAGE_COLLECTION_LOG_PATH ||
    path.join(os.homedir(), '.tool-usage-collection', 'metamask-mobile-events.log');
  const LOG_DIR = path.dirname(LOG_FILE);

  const HEADER = 'tool_name,tool_type,event_type,agent_vendor,session_id,success,duration_ms,created_at\n';

  // Format: tool_name,tool_type,event_type,agent_vendor,session_id,success,duration_ms,created_at
  function appendEvent(toolName, eventType, extra) {
    const success = extra?.success != null ? String(extra.success) : '';
    const durationMs = extra?.duration_ms != null ? String(extra.duration_ms) : '';
    const timestamp = new Date().toISOString();

    // agent_vendor and session_id are always empty for Yarn plugin events.
    const line = `yarn:${toolName},yarn_script,${eventType},,,${success},${durationMs},${timestamp}`;

    try {
      if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
      // Exclusive-create (O_EXCL): only the first concurrent writer creates the
      // header; EEXIST from any other writer is silently swallowed, preventing
      // duplicate header rows when two yarn scripts start in parallel.
      try {
        fs.writeFileSync(LOG_FILE, HEADER, { flag: 'wx' });
      } catch (e) {
        if (e.code !== 'EEXIST') throw e;
      }
      fs.appendFileSync(LOG_FILE, line + '\n');
    } catch {
      // Silently swallow — nothing we can do if the log write fails.
    }
  }

  return {
    hooks: {
      // wrapScriptExecution signature:
      //   (executor, project, locator, scriptName, extra) => Promise<() => Promise<number>>
      // The outer async resolves before the script runs; the inner async IS the script run.
      wrapScriptExecution: (executor, _project, _locator, scriptName) =>
        Promise.resolve(async () => {
          const shouldLog = isRootProcess && !LIFECYCLE_SCRIPT_NAMES.has(scriptName);

          if (shouldLog) {
            appendEvent(scriptName, 'start');
          }

          // For a single directly-spawned command, an interrupted script
          // reliably resolves to a signal-based exit code (see
          // INTERRUPTED_EXIT_CODES). For a chained script (`cmd1 && cmd2`) or
          // one shelling out to a nested `yarn <script>`, the interrupted
          // sub-step's own signal-death can race with — and resolve before —
          // Yarn's own interrupt handling, so the whole script can end up
          // resolving with an ordinary-looking failure code (e.g. 1) that's
          // indistinguishable from a genuine failure by exit code alone.
          // Observing the signal directly closes that gap. This listener is
          // additive: Node only auto-terminates a process on these signals
          // when it has zero listeners, and Yarn's own process-level signal
          // handling already exists (see INTERRUPTED_EXIT_CODES's 129
          // observed for single-command scripts) — this listener never calls
          // process.exit() itself, so it doesn't change that behavior.
          let receivedInterruptSignal = false;
          const onInterruptSignal = () => {
            receivedInterruptSignal = true;
          };
          const interruptSignals = ['SIGINT', 'SIGHUP', 'SIGTERM'];
          if (shouldLog) {
            for (const signal of interruptSignals) {
              process.on(signal, onInterruptSignal);
            }
          }

          const start = Date.now();
          let exitCode;
          try {
            exitCode = await executor();
          } finally {
            if (shouldLog) {
              for (const signal of interruptSignals) {
                process.off(signal, onInterruptSignal);
              }

              // Record as 'interrupted' so the report can distinguish
              // abandoned sessions from genuine failures (success=0).
              const interrupted =
                receivedInterruptSignal || INTERRUPTED_EXIT_CODES.has(exitCode);
              const eventType = interrupted ? 'interrupted' : 'end';
              appendEvent(scriptName, eventType, {
                success: interrupted ? undefined : exitCode === 0,
                duration_ms: Date.now() - start,
              });
              maybeTriggerAnonymizer(repoRoot);
            }
          }

          return exitCode;
        }),
    },
  };
}

module.exports = {
  name: PLUGIN_NAME,
  factory: () => {
    // Skip entirely in CI or when the developer has opted out — no hooks registered,
    // no filesystem access.
    if (process.env.CI || process.env.TOOL_USAGE_COLLECTION_OPT_IN === 'false') {
      return {};
    }
    return makeTrackingPlugin(process.cwd());
  },
};
