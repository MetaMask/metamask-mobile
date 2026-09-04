/* eslint-disable import-x/no-nodejs-modules */
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  isAdbTransportFault,
  withAdbHostLock,
  withAdbHostLockSync,
} from './adbHostLock.ts';

describe('withAdbHostLock', () => {
  let lockPath: string;
  let fakeNow: number;

  beforeEach(() => {
    lockPath = path.join(
      os.tmpdir(),
      `mm-e2e-adb-host-test-${process.pid}-${Date.now()}-${Math.random()}.lock`,
    );
    fakeNow = 1_000_000;
  });

  afterEach(() => {
    try {
      fs.unlinkSync(lockPath);
    } catch {
      // ignore
    }
  });

  const fakeOpts = () => ({
    lockPath,
    pollMs: 10,
    now: () => fakeNow,
    sleep: async (ms: number) => {
      fakeNow += ms;
    },
  });

  it('runs the critical section and returns its value', async () => {
    await expect(
      withAdbHostLock(async () => 'ok', fakeOpts()),
    ).resolves.toBe('ok');
  });

  it('clears a stale lock and proceeds', async () => {
    fs.writeFileSync(lockPath, 'stale');
    fs.utimesSync(lockPath, 1, 1);

    await expect(
      withAdbHostLock(async () => 'ok', {
        ...fakeOpts(),
        staleMs: 1_000,
      }),
    ).resolves.toBe('ok');
  });

  it('times out when the lock is held past maxWaitMs', async () => {
    fs.writeFileSync(lockPath, 'held');
    const freshSec = fakeNow / 1000;
    fs.utimesSync(lockPath, freshSec, freshSec);

    await expect(
      withAdbHostLock(async () => 'never', {
        ...fakeOpts(),
        staleMs: 60_000,
        maxWaitMs: 80,
      }),
    ).rejects.toThrow(/Timed out after 80ms waiting for adb host lock/);
  });
});

describe('withAdbHostLockSync', () => {
  let lockPath: string;

  beforeEach(() => {
    lockPath = path.join(
      os.tmpdir(),
      `mm-e2e-adb-host-sync-test-${process.pid}-${Date.now()}-${Math.random()}.lock`,
    );
  });

  afterEach(() => {
    try {
      fs.unlinkSync(lockPath);
    } catch {
      // ignore
    }
  });

  it('returns the critical-section result', () => {
    expect(withAdbHostLockSync(() => 42, { lockPath })).toBe(42);
  });
});

describe('isAdbTransportFault', () => {
  it('matches protocol fault / daemon / offline messages', () => {
    expect(
      isAdbTransportFault(
        "adb: error: protocol fault (couldn't read status): Success",
      ),
    ).toBe(true);
    expect(
      isAdbTransportFault(
        '* daemon not running; starting now at tcp:5037',
      ),
    ).toBe(true);
    expect(isAdbTransportFault('adb: error: device offline')).toBe(true);
    expect(isAdbTransportFault('not found')).toBe(false);
  });
});
