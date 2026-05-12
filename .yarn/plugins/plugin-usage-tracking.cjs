// Yarn Berry plugin — records every yarn script execution to the local CSV
// events log (~/.tool-usage-collection/metamask-mobile-events.log).
//
// Appends one CSV line per event directly via fs.appendFileSync — no spawning,
// no tsx, no SQLite. The log is drained into the DB by dev-tooling-explorer
// and the nightly cronjob when they start up.

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const PLUGIN_NAME = 'plugin-usage-tracking';

function makeTrackingPlugin() {
  const LOG_FILE =
    process.env.TOOL_USAGE_COLLECTION_LOG_PATH ||
    path.join(os.homedir(), '.tool-usage-collection', 'metamask-mobile-events.log');
  const LOG_DIR = path.dirname(LOG_FILE);

  const DEBUG_LOG = path.join(LOG_DIR, 'plugin-debug.log');

  function debugLog(message) {
    try {
      if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
      fs.appendFileSync(DEBUG_LOG, `[${new Date().toISOString()}] ${message}\n`);
    } catch {
      // Nothing we can do if even the debug log fails.
    }
  }

  // Format: tool_name,tool_type,event_type,agent_vendor,session_id,success,duration_ms,created_at
  function appendEvent(toolName, eventType, extra) {
    const success = extra?.success != null ? String(extra.success) : '';
    const durationMs = extra?.duration_ms != null ? String(extra.duration_ms) : '';
    const timestamp = new Date().toISOString();

    // agent_vendor and session_id are always empty for Yarn plugin events.
    const line = `yarn:${toolName},yarn_script,${eventType},,,${success},${durationMs},${timestamp}`;

    try {
      if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
      // Write the header on first creation so the file is self-describing.
      if (!fs.existsSync(LOG_FILE)) {
        fs.appendFileSync(LOG_FILE, 'tool_name,tool_type,event_type,agent_vendor,session_id,success,duration_ms,created_at\n');
      }
      fs.appendFileSync(LOG_FILE, line + '\n');
    } catch (err) {
      debugLog(`append failed: ${err.message}`);
    }
  }

  return {
    hooks: {
      // wrapScriptExecution signature:
      //   (executor, project, locator, scriptName, extra) => Promise<() => Promise<number>>
      // The outer async resolves before the script runs; the inner async IS the script run.
      wrapScriptExecution: (executor, _project, _locator, scriptName) =>
        Promise.resolve(async () => {
          appendEvent(scriptName, 'start');

          const start = Date.now();
          let exitCode;
          try {
            exitCode = await executor();
          } finally {
            // exitCode 129 = SIGHUP (Yarn terminates the child via SIGHUP when
            // the user presses Ctrl+C). Record as 'interrupted' so the report can
            // distinguish abandoned sessions from genuine failures (success=0).
            const eventType = exitCode === 129 ? 'interrupted' : 'end';
            appendEvent(scriptName, eventType, {
              success: exitCode === 129 ? undefined : exitCode === 0,
              duration_ms: Date.now() - start,
            });
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
    return makeTrackingPlugin();
  },
};
