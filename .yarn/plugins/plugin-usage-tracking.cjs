// Yarn Berry plugin — records every yarn script execution in the local SQLite
// database (~/.tool-usage-collection/events.db) without modifying any script
// entries in package.json.
//
// Delegates all tracking logic to scripts/tooling/tool-usage-collection.ts
// (via tsx) so there is a single source of truth for schema, DB access, and
// event writing.

'use strict';

// CJS modules are wrapped in a function by Node.js, so `return` is valid here.
// Skip entirely in CI or when the developer has opted out — no hooks registered,
// no filesystem access, no spawning.
if (process.env.CI || process.env.TOOL_USAGE_COLLECTION_OPT_IN === 'false') {
  module.exports = { name: 'plugin-usage-tracking', factory: () => ({}) };
  return;
}

const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

// Resolve paths relative to this plugin file so the plugin works correctly
// regardless of which directory yarn is invoked from (e.g. .github/scripts in CI).
const PLUGIN_DIR = path.dirname(__filename);
const REPO_ROOT = path.resolve(PLUGIN_DIR, '..', '..');
const TSX_BIN = path.join(REPO_ROOT, 'node_modules', '.bin', 'tsx');
const COLLECTION_SCRIPT = path.join(
  REPO_ROOT,
  'scripts',
  'tooling',
  'tool-usage-collection.ts',
);
const DEBUG_LOG = path.join(os.homedir(), '.tool-usage-collection', 'plugin-debug.log');

function debugLog(message) {
  try {
    const dir = path.dirname(DEBUG_LOG);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(DEBUG_LOG, `[${new Date().toISOString()}] ${message}\n`);
  } catch {
    // If we can't write the debug log either, there's nothing we can do
  }
}

function track(scriptName, eventType, extra) {
  const args = [
    COLLECTION_SCRIPT,
    '--tool', `yarn:${scriptName}`,
    '--type', 'yarn_script',
    '--event', eventType,
  ];

  if (extra?.success != null) {
    args.push('--success', String(extra.success));
  }
  if (extra?.duration_ms != null) {
    args.push('--duration', String(extra.duration_ms));
  }

  // Guard: if tsx or the collection script are missing, skip silently.
  // This happens when yarn is invoked from a subdirectory (e.g. .github/scripts in CI)
  // where node_modules/.bin/tsx does not exist relative to that cwd.
  if (!fs.existsSync(TSX_BIN) || !fs.existsSync(COLLECTION_SCRIPT)) {
    debugLog(
      `skipping tracking — tsx or script not found\n` +
      `  tsx_bin=${TSX_BIN}\n` +
      `  script=${COLLECTION_SCRIPT}`,
    );
    return;
  }

  // Fire-and-forget: detach immediately so the subprocess never blocks the
  // user's terminal. The child writes its own DB errors to stderr (ignored
  // here); spawn-level failures are logged to the debug log file.
  const child = spawn(TSX_BIN, args, {
    detached: true,
    stdio: 'ignore',
    cwd: REPO_ROOT,
  });

  // Attach a no-op error handler to prevent unhandled 'error' events from
  // crashing Yarn when spawn fails (e.g. ENOENT on the binary).
  child.on('error', (err) => {
    debugLog(`spawn error: ${err.message}`);
  });

  if (child.pid === undefined) {
    debugLog(
      `spawn FAILED — tsx not found\n` +
      `  tsx_bin=${TSX_BIN}\n` +
      `  script=yarn:${scriptName} event=${eventType}`,
    );
    return;
  }

  // Detach from the parent (Yarn) event loop — the child runs independently
  child.unref();
}

module.exports = {
  name: `plugin-usage-tracking`,
  factory: () => ({
    hooks: {
      // wrapScriptExecution signature:
      //   (executor, project, locator, scriptName, extra) => Promise<() => Promise<number>>
      // The outer async resolves before the script runs; the inner async IS the script run.
      wrapScriptExecution: (executor, _project, _locator, scriptName) =>
        Promise.resolve(async () => {
          track(scriptName, 'start');

          const start = Date.now();
          let exitCode;
          try {
            exitCode = await executor();
          } finally {
            // exitCode 129 = SIGHUP (Yarn terminates the child via SIGHUP when
            // the user presses Ctrl+C). Record as 'interrupted' so the report can
            // distinguish abandoned sessions from genuine failures (success=0).
            const eventType = exitCode === 129 ? 'interrupted' : 'end';
            track(scriptName, eventType, {
              success: exitCode === 129 ? undefined : exitCode === 0,
              duration_ms: Date.now() - start,
            });
          }

          return exitCode;
        }),
    },
  }),
};
