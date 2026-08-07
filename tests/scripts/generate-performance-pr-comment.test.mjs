import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const writeJson = (filePath, data) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

test('PR comment matches failed runs by cloud provider when test identity otherwise matches', () => {
  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'generate-performance-pr-comment-'),
  );
  const summaryPath = path.join(tempDir, 'summary.json');
  const outputPath = path.join(tempDir, 'performance-pr-comment.md');
  const testName = 'Import wallet with provider separation';

  try {
    writeJson(summaryPath, {
      uniqueTests: 2,
      platformDevices: {
        Android: ['Google Pixel 7 Pro+13'],
        iOS: [],
      },
      buildType: 'RC',
      branch: 'feature/provider-separation',
      commit: 'abcdef123456',
      failedTestsStats: {
        uniqueFailedTests: 1,
        failedTestsByTeam: {
          'Wallet Framework': {
            team: { teamId: 'Wallet Framework' },
            tests: [
              {
                testName,
                platform: 'Android',
                device: 'Google Pixel 7 Pro+13',
                cloudProvider: 'testmu-standard',
                failureReason: 'failed',
                recordingLink: 'https://example.com/standard-video',
              },
            ],
          },
        },
      },
    });

    writeJson(path.join(tempDir, 'performance-results.json'), {
      Android: {
        'Google Pixel 7 Pro+13': [
          {
            testName,
            totalTime: 12,
            team: { teamId: 'Wallet Framework' },
            cloudProvider: 'testmu-standard',
            videoURL: 'https://example.com/standard-video',
          },
          {
            testName,
            totalTime: 10,
            team: { teamId: 'Wallet Framework' },
            cloudProvider: 'testmu-hyperexecute',
            videoURL: 'https://example.com/he-video',
          },
        ],
      },
    });

    const result = spawnSync(
      process.execPath,
      [
        path.join(
          process.cwd(),
          'tests',
          'scripts',
          'generate-performance-pr-comment.mjs',
        ),
        summaryPath,
        outputPath,
      ],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          SKIP_APP_PROFILING_ENRICHMENT: 'true',
        },
        encoding: 'utf8',
      },
    );

    assert.equal(
      result.status,
      0,
      `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
    );

    const comment = fs.readFileSync(outputPath, 'utf8');

    assert.match(
      comment,
      /\| Platform \| Device \| Provider \| Reason \| Recording \|/,
    );
    assert.match(comment, /\| Android \| Google Pixel 7 Pro \(v13\) \| TestMu Standard \| Test error \|/);
    assert.match(comment, /<summary>✅ Passed Tests \(1\)<\/summary>/);
    assert.match(
      comment,
      /\| Test \| Platform \| Device \| Provider \| Duration \| Team \| Recording \|/,
    );
    assert.match(comment, /\| Import wallet with provider separation \| Android \| Google Pixel 7 Pro \(v13\) \| TestMu HE \| 10\.00s \| Wallet Framework \|/);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('PR comment matches provider-less legacy failed runs by test identity fallback', () => {
  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'generate-performance-pr-comment-'),
  );
  const summaryPath = path.join(tempDir, 'summary.json');
  const outputPath = path.join(tempDir, 'performance-pr-comment.md');
  const testName = 'Legacy import wallet without provider metadata';

  try {
    writeJson(summaryPath, {
      uniqueTests: 1,
      platformDevices: {
        Android: ['Google Pixel 7 Pro+13'],
        iOS: [],
      },
      buildType: 'RC',
      branch: 'feature/provider-less-legacy',
      commit: 'abcdef123456',
      failedTestsStats: {
        uniqueFailedTests: 1,
        failedTestsByTeam: {
          'Wallet Framework': {
            team: { teamId: 'Wallet Framework' },
            tests: [
              {
                testName,
                platform: 'Android',
                device: 'Google Pixel 7 Pro+13',
                failureReason: 'failed',
              },
            ],
          },
        },
      },
    });

    writeJson(path.join(tempDir, 'performance-results.json'), {
      Android: {
        'Google Pixel 7 Pro+13': [
          {
            testName,
            totalTime: 12,
            team: { teamId: 'Wallet Framework' },
          },
        ],
      },
    });

    const result = spawnSync(
      process.execPath,
      [
        path.join(
          process.cwd(),
          'tests',
          'scripts',
          'generate-performance-pr-comment.mjs',
        ),
        summaryPath,
        outputPath,
      ],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          SKIP_APP_PROFILING_ENRICHMENT: 'true',
        },
        encoding: 'utf8',
      },
    );

    assert.equal(
      result.status,
      0,
      `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
    );

    const comment = fs.readFileSync(outputPath, 'utf8');

    assert.match(comment, /### ❌ Failed Tests \(1\)/);
    assert.match(
      comment,
      /\| Android \| Google Pixel 7 Pro \(v13\) \| Unknown \| Test error \|/,
    );
    assert.doesNotMatch(comment, /<summary>✅ Passed Tests/);
    assert.doesNotMatch(
      comment,
      /\| Legacy import wallet without provider metadata \| Android \| Google Pixel 7 Pro \(v13\) \| Unknown \| 12\.00s \| Wallet Framework \|/,
    );
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
