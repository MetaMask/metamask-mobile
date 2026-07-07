// Yarn Berry plugin — records every yarn script execution to the local CSV
// events log (defaults to ~/.tool-usage-collection/metamask-mobile-events.log).
//
// Appends one CSV line per event directly via fs.appendFileSync.
//
// NOTE: `yarn install` (and other built-in Yarn commands) are NOT tracked.
// The `wrapScriptExecution` hook only fires for scripts defined in package.json,
// not for Yarn's own built-in commands. This is a Yarn Berry limitation — no
// plugin hook exists that wraps built-in command execution.

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
