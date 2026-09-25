import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  classifyRun,
  mergeRuns,
  orderFilesForAnalysis,
  partitionByCap,
  prepareRunConfigDir,
  rewriteModeOutputFile,
  runFlakyAiAnalysis,
  runWithConcurrency,
  stepOutputsFromArtifact,
  type AnalyzerOutput,
  type MergedAiAnalysis,
  type RunAnalyzer,
} from './flaky-ai-analysis';

jest.mock(
  '@actions/core',
  () => ({
    setFailed: jest.fn(),
    setOutput: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
  }),
  { virtual: true },
);

const conservative: AnalyzerOutput = {
  analyzedFiles: [],
  findings: [],
  confidence: 0,
  reasoning: 'AI analysis did not complete.',
};

const reviewedOutput = (file: string): AnalyzerOutput => ({
  analyzedFiles: [file],
  findings: [],
  confidence: 80,
  reasoning: 'Reviewed; no pattern.',
});

describe('orderFilesForAnalysis', () => {
  it('puts historically flaky files first and keeps relative order', () => {
    expect(
      orderFilesForAnalysis(
        ['a.test.ts', 'b.test.ts', 'c.test.ts', 'd.test.ts'],
        new Set(['c.test.ts', 'a.test.ts']),
      ),
    ).toEqual(['a.test.ts', 'c.test.ts', 'b.test.ts', 'd.test.ts']);
  });
});

describe('partitionByCap', () => {
  it('keeps the first maxFiles and marks the rest skipped', () => {
    expect(partitionByCap(['a.test.ts', 'b.test.ts', 'c.test.ts'], 2)).toEqual({
      toRun: ['a.test.ts', 'b.test.ts'],
      skipped: ['c.test.ts'],
    });
  });
});

describe('classifyRun', () => {
  const file = 'app/foo.test.ts';

  it('returns error on non-zero exit or missing output', () => {
    expect(
      classifyRun(
        file,
        { exitCode: 1, output: reviewedOutput(file) },
        conservative,
      ),
    ).toBe('error');
    expect(classifyRun(file, { exitCode: 0, output: null }, conservative)).toBe(
      'error',
    );
  });

  it('returns fallback when the output matches the conservative fallback', () => {
    expect(
      classifyRun(file, { exitCode: 0, output: conservative }, conservative),
    ).toBe('fallback');
  });

  it('returns fallback when analyzedFiles is empty', () => {
    expect(
      classifyRun(
        file,
        {
          exitCode: 0,
          output: {
            analyzedFiles: [],
            findings: [],
            confidence: 50,
            reasoning: 'gave up',
          },
        },
        conservative,
      ),
    ).toBe('fallback');
  });

  it('returns reviewed when analyzedFiles contains the file', () => {
    expect(
      classifyRun(
        file,
        { exitCode: 0, output: reviewedOutput(file) },
        conservative,
      ),
    ).toBe('reviewed');
  });
});

describe('mergeRuns and stepOutputsFromArtifact', () => {
  it('merges reviewed findings and lists per-file statuses', () => {
    const artifact = mergeRuns(
      [
        {
          file: 'a.test.ts',
          status: 'reviewed',
          attempts: 1,
          durationMs: 10,
          output: {
            analyzedFiles: ['a.test.ts'],
            findings: [
              {
                file: 'a.test.ts',
                line: 1,
                patternId: 'J3',
                patternName: 'mock leak',
                severity: 'high',
                explanation: 'leak',
                suggestedFix: 'clear',
                historicalHintUsed: false,
              },
            ],
            confidence: 90,
            reasoning: 'found J3',
          },
        },
        {
          file: 'b.test.ts',
          status: 'did_not_complete',
          attempts: 2,
          durationMs: 20,
          output: conservative,
        },
        {
          file: 'c.test.ts',
          status: 'skipped_cap',
          attempts: 0,
          durationMs: 0,
          output: null,
        },
      ],
      10,
    );

    expect(artifact.analyzedFiles).toEqual(['a.test.ts']);
    expect(artifact.findings).toHaveLength(1);
    expect(artifact.maxFiles).toBe(10);
    expect(artifact.runs.map((run) => run.status)).toEqual([
      'reviewed',
      'did_not_complete',
      'skipped_cap',
    ]);
    expect(stepOutputsFromArtifact(artifact)).toEqual({
      reviewed_count: '1',
      did_not_complete_files: 'b.test.ts',
      skipped_cap_files: 'c.test.ts',
    });
  });
});

describe('runWithConcurrency', () => {
  it('never exceeds the concurrency limit', async () => {
    let current = 0;
    let peak = 0;
    const result = await runWithConcurrency([1, 2, 3, 4, 5], 2, async (n) => {
      current += 1;
      peak = Math.max(peak, current);
      await new Promise((resolve) => setTimeout(resolve, 20));
      current -= 1;
      return n * 2;
    });

    expect(peak).toBe(2);
    expect(result).toEqual([2, 4, 6, 8, 10]);
  });
});

describe('rewriteModeOutputFile', () => {
  it('replaces the existing outputFile line with a quoted absolute path', () => {
    const yaml = rewriteModeOutputFile(
      'id: flaky-unit-test-analysis\noutputFile: .ai-pr-analyzer/flaky-ai-analysis.json\n',
      '/tmp/run-0.json',
    );
    expect(yaml).toContain('outputFile: "/tmp/run-0.json"');
    expect(yaml).not.toContain('.ai-pr-analyzer/flaky-ai-analysis.json');
  });
});

describe('prepareRunConfigDir', () => {
  it('copies config and mode files, rewrites outputFile, and symlinks skills', () => {
    const root = mkdtempSync(join(tmpdir(), 'flaky-ai-config-'));
    try {
      const source = join(root, 'source');
      const modeSrc = join(source, 'modes/flaky-unit-test-analysis');
      mkdirSync(modeSrc, { recursive: true });
      mkdirSync(join(source, 'skills'), { recursive: true });
      writeFileSync(join(source, 'config.yaml'), 'repo: test\n');
      writeFileSync(
        join(modeSrc, 'mode.yaml'),
        'id: flaky-unit-test-analysis\noutputFile: .ai-pr-analyzer/flaky-ai-analysis.json\n',
      );
      writeFileSync(join(modeSrc, 'task-prompt.md'), 'prompt');
      writeFileSync(
        join(source, 'skills/mms-flaky-test-detection.md'),
        'skill',
      );

      const outputPath = join(root, 'runs/0.json');
      const configDir = prepareRunConfigDir({
        runIndex: 0,
        tempRoot: join(root, 'temp'),
        sourceConfigDir: source,
        outputPath,
      });

      expect(configDir).toBe(join(root, 'temp/flaky-ai-config-0'));
      expect(readFileSync(join(configDir, 'config.yaml'), 'utf8')).toBe(
        'repo: test\n',
      );
      expect(
        readFileSync(
          join(configDir, 'modes/flaky-unit-test-analysis/mode.yaml'),
          'utf8',
        ),
      ).toContain(`outputFile: ${JSON.stringify(outputPath)}`);
      expect(
        readFileSync(
          join(configDir, 'skills/mms-flaky-test-detection.md'),
          'utf8',
        ),
      ).toBe('skill');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('runFlakyAiAnalysis', () => {
  const baseInput = {
    historicallyFlaky: new Set<string>(),
    maxFiles: 10,
    maxAttempts: 2,
    concurrency: 3,
    tempRoot: '/tmp',
    sourceConfigDir: '/tmp/source',
    runsDir: '/tmp/runs',
    conservativeFallback: conservative,
    prepareConfigDir: () => '/tmp/config',
    now: (() => {
      let t = 0;
      return () => {
        t += 5;
        return t;
      };
    })(),
  };

  it('retries once after fallback then records reviewed', async () => {
    const calls: string[] = [];
    const runAnalyzer: RunAnalyzer = async (file) => {
      calls.push(file);
      if (calls.length === 1) {
        return { exitCode: 0, output: conservative };
      }
      return { exitCode: 0, output: reviewedOutput(file) };
    };

    const result = await runFlakyAiAnalysis({
      ...baseInput,
      filesToAnalyze: ['app/foo.test.ts'],
      runAnalyzer,
    });

    expect(calls).toHaveLength(2);
    expect(result.shouldFail).toBe(false);
    expect(result.artifact.runs).toEqual([
      {
        file: 'app/foo.test.ts',
        status: 'reviewed',
        attempts: 2,
        durationMs: 5,
      },
    ]);
  });

  it('writes a complete artifact before the first analyzer starts', async () => {
    const snapshots: MergedAiAnalysis[] = [];

    await runFlakyAiAnalysis({
      ...baseInput,
      filesToAnalyze: ['a.test.ts', 'b.test.ts'],
      maxAttempts: 1,
      concurrency: 1,
      runAnalyzer: async (file) => ({
        exitCode: 0,
        output: reviewedOutput(file),
      }),
      writeArtifact: (artifact) => snapshots.push(artifact),
    });

    // A timeout kill before any file finished must still leave Stage 3 an
    // artifact that says "not reviewed" rather than nothing at all.
    expect(snapshots[0].runs).toEqual([
      {
        file: 'a.test.ts',
        status: 'did_not_complete',
        attempts: 0,
        durationMs: 0,
      },
      {
        file: 'b.test.ts',
        status: 'did_not_complete',
        attempts: 0,
        durationMs: 0,
      },
    ]);
  });

  it('rewrites the artifact after every file so a kill keeps finished work', async () => {
    const snapshots: MergedAiAnalysis[] = [];

    await runFlakyAiAnalysis({
      ...baseInput,
      filesToAnalyze: ['a.test.ts', 'b.test.ts'],
      maxAttempts: 1,
      concurrency: 1,
      runAnalyzer: async (file) => ({
        exitCode: 0,
        output: reviewedOutput(file),
      }),
      writeArtifact: (artifact) => snapshots.push(artifact),
    });

    expect(snapshots).toHaveLength(3);
    expect(snapshots[1].analyzedFiles).toEqual(['a.test.ts']);
    expect(snapshots[1].runs[1].status).toBe('did_not_complete');
    expect(snapshots[2].analyzedFiles).toEqual(['a.test.ts', 'b.test.ts']);
  });

  it('records skipped_cap after the file cap and fails when nothing was reviewed', async () => {
    const runAnalyzer: RunAnalyzer = async () => ({
      exitCode: 0,
      output: conservative,
    });

    const result = await runFlakyAiAnalysis({
      ...baseInput,
      filesToAnalyze: ['a.test.ts', 'b.test.ts', 'c.test.ts'],
      maxFiles: 1,
      maxAttempts: 1,
      runAnalyzer,
    });

    expect(result.shouldFail).toBe(true);
    expect(result.artifact.runs.map((run) => run.status)).toEqual([
      'did_not_complete',
      'skipped_cap',
      'skipped_cap',
    ]);
    expect(stepOutputsFromArtifact(result.artifact)).toEqual({
      reviewed_count: '0',
      did_not_complete_files: 'a.test.ts',
      skipped_cap_files: 'b.test.ts c.test.ts',
    });
  });

  it('honours the concurrency limit across files', async () => {
    let current = 0;
    let peak = 0;
    const runAnalyzer: RunAnalyzer = async (file) => {
      current += 1;
      peak = Math.max(peak, current);
      await new Promise((resolve) => setTimeout(resolve, 20));
      current -= 1;
      return { exitCode: 0, output: reviewedOutput(file) };
    };

    const result = await runFlakyAiAnalysis({
      ...baseInput,
      filesToAnalyze: ['a.test.ts', 'b.test.ts', 'c.test.ts', 'd.test.ts'],
      concurrency: 2,
      runAnalyzer,
    });

    expect(peak).toBe(2);
    expect(result.shouldFail).toBe(false);
    expect(result.artifact.analyzedFiles).toEqual([
      'a.test.ts',
      'b.test.ts',
      'c.test.ts',
      'd.test.ts',
    ]);
  });
});
