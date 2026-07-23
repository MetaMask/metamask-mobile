import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
  mkdirSync,
} from 'fs';
import { spawn } from 'child_process';
import { tmpdir } from 'os';
import { join } from 'path';

/** Return only the data rows from the log file (skip the CSV header). */
function dataLines(file: string): string[] {
  return readFileSync(file, 'utf8')
    .trim()
    .split('\n')
    .filter((l) => !l.startsWith('tool_name,'));
}

type Plugin = {
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

/**
 * Loads a fresh instance of the plugin module, re-executing its top-level
 * code against the current process.env. This mirrors how a real
 * `yarn <script>` invocation is a brand new OS process: the module's
 * root/marker detection runs exactly once per process, at module-evaluation
 * time, not on every `factory()` call (Yarn calls `factory()` more than once
 * within a single process while resolving configuration).
 */
function loadPlugin(): Plugin {
  jest.resetModules();
  return require('../plugins/plugin-usage-tracking.cjs');
}

describe('plugin-usage-tracking', () => {
  let logDir: string;
  let logFile: string;
  let savedCI: string | undefined;
  let savedOptIn: string | undefined;
  let savedParentMarker: string | undefined;

  beforeEach(() => {
    logDir = mkdtempSync(join(tmpdir(), 'plugin-test-'));
    logFile = join(logDir, 'events.log');

    savedCI = process.env.CI;
    savedOptIn = process.env.TOOL_USAGE_COLLECTION_OPT_IN;
    savedParentMarker = process.env.MM_TOOL_USAGE_PARENT;

    delete process.env.CI;
    delete process.env.TOOL_USAGE_COLLECTION_OPT_IN;
    delete process.env.MM_TOOL_USAGE_PARENT;
    process.env.TOOL_USAGE_COLLECTION_LOG_PATH = logFile;
  });

  afterEach(() => {
    rmSync(logDir, { recursive: true, force: true });

    if (savedCI === undefined) delete process.env.CI;
    else process.env.CI = savedCI;

    if (savedOptIn === undefined)
      delete process.env.TOOL_USAGE_COLLECTION_OPT_IN;
    else process.env.TOOL_USAGE_COLLECTION_OPT_IN = savedOptIn;

    if (savedParentMarker === undefined)
      delete process.env.MM_TOOL_USAGE_PARENT;
    else process.env.MM_TOOL_USAGE_PARENT = savedParentMarker;

    delete process.env.TOOL_USAGE_COLLECTION_LOG_PATH;
  });

  describe('CI / opt-out guard', () => {
    it('registers no hooks when CI is set', () => {
      process.env.CI = '1';
      expect(loadPlugin().factory()).toEqual({});
    });

    it('registers no hooks when TOOL_USAGE_COLLECTION_OPT_IN is false', () => {
      process.env.TOOL_USAGE_COLLECTION_OPT_IN = 'false';
      expect(loadPlugin().factory()).toEqual({});
    });

    it('registers hooks when neither CI nor opt-out is set', () => {
      const result = loadPlugin().factory();
      expect(result.hooks).toBeDefined();
      expect(typeof result.hooks?.wrapScriptExecution).toBe('function');
    });
  });

  describe('wrapScriptExecution', () => {
    async function runScript(
      scriptName: string,
      exitCode: number,
      plugin: Plugin = loadPlugin(),
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

    // Which signal a script's process actually dies from when interrupted
    // (e.g. via Ctrl+C) depends on how it was invoked — a single
    // directly-spawned command may see SIGHUP (129), while a chained script
    // or one shelling out to a nested `yarn <script>` may see SIGINT (130)
    // or another terminating signal instead. All must map to 'interrupted'.
    it.each([
      [129, 'SIGHUP'],
      [130, 'SIGINT'],
      [131, 'SIGQUIT'],
      [137, 'SIGKILL'],
      [143, 'SIGTERM'],
    ])('appends an interrupted row for exit code %i (%s)', async (exitCode) => {
      await runScript('build', exitCode);

      const lines = dataLines(logFile);
      expect(lines).toHaveLength(2);

      const [, interruptedLine] = lines;
      // interrupted: success='', duration_ms=<number>
      expect(interruptedLine).toMatch(
        /^yarn:build,yarn_script,interrupted,,,,\d+,.+Z$/,
      );
    });

    // A chained script (`cmd1 && cmd2`) or one shelling out to a nested
    // `yarn <script>` can resolve with an ordinary-looking exit code (e.g. 1)
    // even when the process was genuinely interrupted, because the
    // interrupted sub-step's own signal-death can race with, and resolve
    // before, Yarn's own interrupt handling. Observing the signal directly
    // must classify this as 'interrupted' regardless of the resolved code.
    it.each(['SIGINT', 'SIGHUP', 'SIGTERM'])(
      'appends an interrupted row when %s is received during the script, even if the executor resolves with a non-signal exit code',
      async (signal) => {
        const plugin = loadPlugin();
        const { hooks } = plugin.factory();
        const executor = jest.fn().mockImplementation(async () => {
          process.emit(signal);
          return 1; // ordinary failure code, not a signal-based one
        });
        const wrappedFactory = await hooks!.wrapScriptExecution(
          executor,
          null,
          null,
          'clean',
        );
        await wrappedFactory();

        const lines = dataLines(logFile);
        expect(lines).toHaveLength(2);
        expect(lines[1]).toMatch(
          /^yarn:clean,yarn_script,interrupted,,,,\d+,.+Z$/,
        );
      },
    );

    it('does not leak its interrupt-signal listeners after the script finishes', async () => {
      const before = {
        SIGINT: process.listenerCount('SIGINT'),
        SIGHUP: process.listenerCount('SIGHUP'),
        SIGTERM: process.listenerCount('SIGTERM'),
      };

      await runScript('test:unit', 0);

      expect(process.listenerCount('SIGINT')).toBe(before.SIGINT);
      expect(process.listenerCount('SIGHUP')).toBe(before.SIGHUP);
      expect(process.listenerCount('SIGTERM')).toBe(before.SIGTERM);
    });

    it('accumulates rows across multiple script runs', async () => {
      // Each `yarn <script>` a user types is its own OS process with a fresh
      // (unmarked) env — simulate that by loading a brand new plugin
      // instance and clearing the marker the first run set, since real
      // processes never share process.env with one another.
      await runScript('test:unit', 0);
      delete process.env.MM_TOOL_USAGE_PARENT;
      await runScript('lint', 0);

      const lines = dataLines(logFile);
      // 2 rows per run × 2 runs
      expect(lines).toHaveLength(4);
      expect(lines[0]).toMatch(/^yarn:test:unit,/);
      expect(lines[2]).toMatch(/^yarn:lint,/);
    });

    it('does not write to the log when CI is set', async () => {
      process.env.CI = '1';
      loadPlugin().factory(); // returns {} when CI is set — no filesystem access
      expect(existsSync(logFile)).toBe(false);
    });

    it('logs a root script run (no parent marker set)', async () => {
      await runScript('test:unit', 0);

      const lines = dataLines(logFile);
      expect(lines).toHaveLength(2);
      expect(lines[0]).toMatch(/^yarn:test:unit,yarn_script,start,/);
    });

    it('does not log a dependent script run (parent marker already set)', async () => {
      process.env.MM_TOOL_USAGE_PARENT = '1';
      await runScript('test:unit', 0);

      expect(existsSync(logFile)).toBe(false);
    });

    // preinstall/install/postinstall are run automatically by `yarn install`
    // through the same wrapScriptExecution hook, even for a genuinely root
    // process — the user never types `yarn postinstall` themselves.
    it.each(['preinstall', 'install', 'postinstall'])(
      'does not log the %s lifecycle script even for a root process',
      async (scriptName) => {
        await runScript(scriptName, 0);

        expect(existsSync(logFile)).toBe(false);
      },
    );

    // Yarn computes the env object it hands to a script's spawned child
    // process (and therefore to any nested `yarn` process it shells out to)
    // BEFORE invoking wrapScriptExecution — mutating process.env from inside
    // the hook would be too late. The marker must already be present on
    // process.env as soon as the module's top-level code runs.
    it('sets the parent marker on process.env as soon as the module loads, before any script executes', () => {
      expect(process.env.MM_TOOL_USAGE_PARENT).toBeUndefined();

      loadPlugin();

      expect(process.env.MM_TOOL_USAGE_PARENT).toBe('1');
    });

    it('leaves the parent marker set once a root script has finished running (no restore)', async () => {
      expect(process.env.MM_TOOL_USAGE_PARENT).toBeUndefined();
      await runScript('test:unit', 0);
      expect(process.env.MM_TOOL_USAGE_PARENT).toBe('1');
    });

    it('leaves an already-set parent marker untouched once a dependent script has finished running', async () => {
      process.env.MM_TOOL_USAGE_PARENT = '1';
      await runScript('test:unit', 0);
      expect(process.env.MM_TOOL_USAGE_PARENT).toBe('1');
    });

    // Regression test: Yarn calls the exported factory() more than once
    // within a single process while resolving configuration/running a
    // script. Root/marker detection must happen once at module-evaluation
    // time so a later factory() call in the same process doesn't see the
    // marker the first factory() call already set and misreport itself as
    // a dependent (nested) run.
    it('treats every factory() call within the same process as root when the process itself is root', async () => {
      const plugin = loadPlugin();

      plugin.factory(); // simulates Yarn's first, earlier factory() call
      const { hooks } = plugin.factory(); // the instance Yarn actually uses

      const executor = jest.fn().mockResolvedValue(0);
      const wrappedFactory = await hooks!.wrapScriptExecution(
        executor,
        null,
        null,
        'clean:ios',
      );
      await wrappedFactory();

      const lines = dataLines(logFile);
      expect(lines).toHaveLength(2);
      expect(lines[0]).toMatch(/^yarn:clean:ios,yarn_script,start,/);
    });
  });

  describe('maybeTriggerAnonymizer guard', () => {
    let homeDir: string;
    let savedHome: string | undefined;
    let spawnSpy: jest.SpiedFunction<typeof spawn>;

    beforeEach(() => {
      spawnSpy = jest
        .spyOn(require('child_process'), 'spawn')
        .mockImplementation(
          () => ({ unref: jest.fn() }) as ReturnType<typeof spawn>,
        );
      homeDir = mkdtempSync(join(tmpdir(), 'plugin-trigger-home-'));
      savedHome = process.env.HOME;
      process.env.HOME = homeDir;
      delete process.env.CI;
      mkdirSync(join(homeDir, '.tool-usage-collection'), { recursive: true });
    });

    afterEach(() => {
      spawnSpy.mockRestore();
      rmSync(homeDir, { recursive: true, force: true });
      if (savedHome === undefined) {
        delete process.env.HOME;
      } else {
        process.env.HOME = savedHome;
      }
    });

    async function runScript(scriptName: string): Promise<void> {
      const { hooks } = loadPlugin().factory();
      const executor = jest.fn().mockResolvedValue(0);
      const wrappedFactory = await hooks!.wrapScriptExecution(
        executor,
        null,
        null,
        scriptName,
      );
      await wrappedFactory();
    }

    it('does not spawn when last_run_at is within 24h', async () => {
      writeFileSync(
        join(homeDir, '.tool-usage-collection', 'anonymizer-state.json'),
        JSON.stringify({
          version: 1,
          instance_uuid: 'uuid',
          last_run_at: new Date().toISOString(),
          last_pushed_day: null,
        }),
      );
      await runScript('test:unit');
      expect(spawnSpy).not.toHaveBeenCalled();
    });

    it('does not spawn when CI is set', () => {
      process.env.CI = '1';
      expect(loadPlugin().factory()).toEqual({});
      expect(spawnSpy).not.toHaveBeenCalled();
    });

    it('does not spawn for a dependent script run (parent marker already set)', async () => {
      process.env.MM_TOOL_USAGE_PARENT = '1';
      await runScript('test:unit');
      expect(spawnSpy).not.toHaveBeenCalled();
    });

    it('does not spawn for a root postinstall lifecycle script', async () => {
      await runScript('postinstall');
      expect(spawnSpy).not.toHaveBeenCalled();
    });
  });
});
