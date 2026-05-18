import { existsSync, mkdtempSync, readFileSync, rmSync } from 'fs';

/** Return only the data rows from the log file (skip the CSV header). */
function dataLines(file: string): string[] {
  return readFileSync(file, 'utf8')
    .trim()
    .split('\n')
    .filter((l) => !l.startsWith('tool_name,'));
}
import { tmpdir } from 'os';
import { join } from 'path';

// Disable tracking globally at module load time so no accidental writes can
// reach the real log file before beforeEach sets up the temp path.
process.env.CI = 'jest';
delete process.env.TOOL_USAGE_COLLECTION_LOG_PATH;

const plugin = require('../plugins/plugin-usage-tracking.cjs') as {
  name: string;
  factory: () => {
    hooks?: {
      wrapScriptExecution: (
        executor: () => Promise<number>,
        project: unknown,
        locator: unknown,
        scriptName: string,
      ) => Promise<() => Promise<number>>;
    };
  };
};

describe('plugin-usage-tracking', () => {
  let logDir: string;
  let logFile: string;
  let savedCI: string | undefined;
  let savedOptIn: string | undefined;

  beforeEach(() => {
    logDir = mkdtempSync(join(tmpdir(), 'plugin-test-'));
    logFile = join(logDir, 'events.log');

    savedCI = process.env.CI;
    savedOptIn = process.env.TOOL_USAGE_COLLECTION_OPT_IN;

    delete process.env.CI;
    delete process.env.TOOL_USAGE_COLLECTION_OPT_IN;
    process.env.TOOL_USAGE_COLLECTION_LOG_PATH = logFile;
  });

  afterEach(() => {
    rmSync(logDir, { recursive: true, force: true });

    if (savedCI === undefined) delete process.env.CI;
    else process.env.CI = savedCI;

    if (savedOptIn === undefined)
      delete process.env.TOOL_USAGE_COLLECTION_OPT_IN;
    else process.env.TOOL_USAGE_COLLECTION_OPT_IN = savedOptIn;

    delete process.env.TOOL_USAGE_COLLECTION_LOG_PATH;
  });

  describe('CI / opt-out guard', () => {
    it('registers no hooks when CI is set', () => {
      process.env.CI = '1';
      expect(plugin.factory()).toEqual({});
    });

    it('registers no hooks when TOOL_USAGE_COLLECTION_OPT_IN is false', () => {
      process.env.TOOL_USAGE_COLLECTION_OPT_IN = 'false';
      expect(plugin.factory()).toEqual({});
    });

    it('registers hooks when neither CI nor opt-out is set', () => {
      const result = plugin.factory();
      expect(result.hooks).toBeDefined();
      expect(typeof result.hooks?.wrapScriptExecution).toBe('function');
    });
  });

  describe('wrapScriptExecution', () => {
    async function runScript(
      scriptName: string,
      exitCode: number,
    ): Promise<void> {
      const { hooks } = plugin.factory();
      const executor = jest.fn().mockResolvedValue(exitCode);
      const wrappedFactory = await hooks!.wrapScriptExecution(
        executor,
        null,
        null,
        scriptName,
      );
      await wrappedFactory();
    }

    // CSV columns: tool_name,tool_type,event_type,agent_vendor,session_id,success,duration_ms,created_at
    // agent_vendor and session_id are always empty for Yarn plugin events.

    it('appends a start row then an end row for a successful script', async () => {
      await runScript('test:unit', 0);

      const lines = dataLines(logFile);
      expect(lines).toHaveLength(2);

      const [startLine, endLine] = lines;
      // start: success='', duration_ms=''
      expect(startLine).toMatch(/^yarn:test:unit,yarn_script,start,,,,,.+Z$/);
      // end: success=true, duration_ms=<number>
      expect(endLine).toMatch(
        /^yarn:test:unit,yarn_script,end,,,true,\d+,.+Z$/,
      );
    });

    it('appends a start row then an end row with success=false for a failed script', async () => {
      await runScript('lint', 1);

      const lines = dataLines(logFile);
      expect(lines).toHaveLength(2);

      const [, endLine] = lines;
      expect(endLine).toMatch(/^yarn:lint,yarn_script,end,,,false,\d+,.+Z$/);
    });

    it('appends an interrupted row for exit code 129 (SIGHUP)', async () => {
      await runScript('build', 129);

      const lines = dataLines(logFile);
      expect(lines).toHaveLength(2);

      const [, interruptedLine] = lines;
      // interrupted: success='', duration_ms=<number>
      expect(interruptedLine).toMatch(
        /^yarn:build,yarn_script,interrupted,,,,\d+,.+Z$/,
      );
    });

    it('accumulates rows across multiple script runs', async () => {
      await runScript('test:unit', 0);
      await runScript('lint', 0);

      const lines = dataLines(logFile);
      // 2 rows per run × 2 runs
      expect(lines).toHaveLength(4);
      expect(lines[0]).toMatch(/^yarn:test:unit,/);
      expect(lines[2]).toMatch(/^yarn:lint,/);
    });

    it('does not write to the log when CI is set', async () => {
      process.env.CI = '1';
      plugin.factory(); // returns {} when CI is set — no filesystem access
      expect(existsSync(logFile)).toBe(false);
    });
  });
});
