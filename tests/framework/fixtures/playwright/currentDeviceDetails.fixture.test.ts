/* eslint-disable import-x/no-nodejs-modules */
// Exercise Playwright's real fixture scheduler in an isolated Node process.
import { spawnSync } from 'child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';

it('resolves device details after the worker assigns its emulator', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'device-fixture-'));
  const playwright = require.resolve('@playwright/test');
  const fixture = path.join(__dirname, 'currentDeviceDetails.fixture.ts');
  const config = path.join(directory, 'playwright.config.cjs');

  try {
    writeFileSync(
      config,
      `module.exports = {
        testDir: ${JSON.stringify(directory)},
        testMatch: 'device.spec.ts',
        workers: 1,
        reporter: 'line',
        use: {
          platform: 'android',
          device: { provider: 'emulator', udid: 'emulator-5554' }
        }
      };`,
    );
    writeFileSync(
      path.join(directory, 'device.spec.ts'),
      `import { test as base, expect } from ${JSON.stringify(playwright)};
      import { currentDeviceDetailsFixture } from ${JSON.stringify(fixture)};
      const test = base.extend({
        deviceProvider: [async ({}, use, workerInfo) => {
          workerInfo.project.use.device.udid = 'emulator-5556';
          await use({});
        }, { scope: 'worker' }],
        ...currentDeviceDetailsFixture,
      });
      test('uses the assigned worker device before creating a driver', async ({ currentDeviceDetails }) => {
        expect(currentDeviceDetails.udid).toBe('emulator-5556');
      });`,
    );

    const result = spawnSync(
      process.execPath,
      [require.resolve('@playwright/test/cli'), 'test', '--config', config],
      {
        encoding: 'utf8',
        timeout: 30_000,
        env: { ...process.env, JEST_WORKER_ID: undefined },
      },
    );

    expect({
      status: result.status,
      error: result.error,
      output: result.stdout + result.stderr,
    }).toEqual({
      status: 0,
      error: undefined,
      output: expect.stringContaining('1 passed'),
    });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}, 35_000);
