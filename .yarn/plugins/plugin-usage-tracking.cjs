// Yarn Berry plugin — records every yarn script execution in the local SQLite
// database (~/.tool-usage-collection/events.db) without modifying any script
// entries in package.json.
//
// Delegates all tracking logic to scripts/tooling/tool-usage-collection.ts
// (via tsx) so there is a single source of truth for schema, DB access, and
// event writing.

'use strict';

const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

// Resolve tsx from the project's node_modules so the plugin works regardless
// of global tool availability.
const TSX_BIN = path.join(process.cwd(), 'node_modules', '.bin', 'tsx');
const COLLECTION_SCRIPT = path.join(
  process.cwd(),
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

  // Fire-and-forget: detach immediately so the subprocess never blocks the
  // user's terminal. The child writes its own DB errors to stderr (ignored
  // here); spawn-level failures (e.g. tsx not found) are logged to the debug
  // log file since that's the only information available before unref().
  const child = spawn(TSX_BIN, args, {
    detached: true,
    stdio: 'ignore',
    cwd: process.cwd(),
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
            track(scriptName, 'end', {
              // exitCode is undefined if executor threw — treat as failure
              success: exitCode === 0,
              duration_ms: Date.now() - start,
            });
          }

          return exitCode;
        }),
    },
  }),
};
