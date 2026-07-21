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
const childProcess = require('child_process');

const PLUGIN_NAME = 'plugin-usage-tracking';
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

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
            maybeTriggerAnonymizer(repoRoot);
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
