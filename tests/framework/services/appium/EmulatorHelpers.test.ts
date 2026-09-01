/* eslint-disable import-x/no-nodejs-modules */
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  ANDROID_E2E_PACKAGES_TO_DISABLE,
  ANDROID_EMULATOR_GOLDEN_SNAPSHOT_NAME,
  buildAndroidEmulatorArgs,
  computeAndroidSystemImageFingerprint,
  findAnrDialogRecoveryTapPoint,
  findAnrDialogWaitTapPoint,
  getGoldenSnapshotDir,
  hasGoldenSnapshot,
  isAndroidPingSuccessful,
  isGoldenSnapshotUsable,
  resolveAndroidBootMode,
  shouldWaitForOfflineEmulator,
  shouldWaitForUnidentifiedOfflineEmulator,
} from './EmulatorHelpers.ts';

describe('EmulatorHelpers', () => {
  describe('shouldWaitForOfflineEmulator', () => {
    it('returns true only when resolved AVD matches the request', () => {
      expect(
        shouldWaitForOfflineEmulator('appium_smoke_avd', 'appium_smoke_avd'),
      ).toBe(true);
    });

    it('returns false when AVD name is unknown', () => {
      expect(shouldWaitForOfflineEmulator('appium_smoke_avd', undefined)).toBe(
        false,
      );
    });

    it('returns false when offline emulator belongs to a different AVD', () => {
      expect(shouldWaitForOfflineEmulator('appium_smoke_avd', 'emulator')).toBe(
        false,
      );
    });
  });

  describe('shouldWaitForUnidentifiedOfflineEmulator', () => {
    it('returns true in CI when exactly one emulator is starting', () => {
      expect(
        shouldWaitForUnidentifiedOfflineEmulator({
          isCI: true,
          offlineOrAuthorizingCount: 1,
        }),
      ).toBe(true);
    });

    it('returns false when multiple emulators are starting or not in CI', () => {
      expect(
        shouldWaitForUnidentifiedOfflineEmulator({
          isCI: true,
          offlineOrAuthorizingCount: 2,
        }),
      ).toBe(false);
      expect(
        shouldWaitForUnidentifiedOfflineEmulator({
          isCI: false,
          offlineOrAuthorizingCount: 1,
        }),
      ).toBe(false);
    });
  });

  describe('findAnrDialogWaitTapPoint', () => {
    it('returns Wait button center when Pixel Launcher ANR is visible', () => {
      const uiDump = `
        <node text="Pixel Launcher isn't responding" bounds="[100,500][980,700]" />
        <node text="Close app" bounds="[120,620][480,680]" clickable="true" />
        <node text="Wait" bounds="[600,620][960,680]" clickable="true" />
      `;

      expect(findAnrDialogWaitTapPoint(uiDump)).toEqual({ x: 780, y: 650 });
    });

    it('returns undefined when no ANR dialog is present', () => {
      const uiDump =
        '<node text="Settings" bounds="[0,0][100,100]" clickable="true" />';

      expect(findAnrDialogWaitTapPoint(uiDump)).toBeUndefined();
    });

    it('falls back to Close app when Wait is absent', () => {
      const uiDump = `
        <node text="Messages isn't responding" bounds="[100,500][980,700]" />
        <node text="Close app" bounds="[120,620][480,680]" clickable="true" />
      `;

      expect(findAnrDialogWaitTapPoint(uiDump)).toEqual({ x: 300, y: 650 });
    });
  });

  describe('findAnrDialogRecoveryTapPoint', () => {
    it('prefers Close app for Pixel Launcher ANR', () => {
      const uiDump = `
        <node text="Pixel Launcher isn't responding" bounds="[100,500][980,700]" />
        <node text="Close app" bounds="[120,620][480,680]" clickable="true" />
        <node text="Wait" bounds="[600,620][960,680]" clickable="true" />
      `;

      expect(findAnrDialogRecoveryTapPoint(uiDump)).toEqual({ x: 300, y: 650 });
    });

    it('lists Play Store and GMS in packages to disable', () => {
      expect(ANDROID_E2E_PACKAGES_TO_DISABLE).toContain('com.android.vending');
      expect(ANDROID_E2E_PACKAGES_TO_DISABLE).toContain(
        'com.google.android.gms',
      );
    });
  });

  describe('isAndroidPingSuccessful', () => {
    it('returns true for common successful ping outputs', () => {
      expect(
        isAndroidPingSuccessful(
          'PING 8.8.8.8 (8.8.8.8) 56(84) bytes of data.\n64 bytes from 8.8.8.8: icmp_seq=1 ttl=118 time=12.3 ms\n\n--- 8.8.8.8 ping statistics ---\n1 packets transmitted, 1 received, 0% packet loss',
        ),
      ).toBe(true);
    });

    it('returns false when ping did not receive a reply', () => {
      expect(
        isAndroidPingSuccessful(
          '1 packets transmitted, 0 received, 100% packet loss',
        ),
      ).toBe(false);
    });
  });

  describe('resolveAndroidBootMode', () => {
    it('defaults to auto when unset, empty, or unrecognized', () => {
      expect(resolveAndroidBootMode({})).toBe('auto');
      expect(resolveAndroidBootMode({ ANDROID_EMULATOR_BOOT_MODE: ' ' })).toBe(
        'auto',
      );
      expect(
        resolveAndroidBootMode({ ANDROID_EMULATOR_BOOT_MODE: 'bogus' }),
      ).toBe('auto');
    });

    it('accepts snapshot and cold, case-insensitively', () => {
      expect(
        resolveAndroidBootMode({ ANDROID_EMULATOR_BOOT_MODE: 'snapshot' }),
      ).toBe('snapshot');
      expect(
        resolveAndroidBootMode({ ANDROID_EMULATOR_BOOT_MODE: 'COLD' }),
      ).toBe('cold');
    });
  });

  describe('buildAndroidEmulatorArgs', () => {
    const base = { avdName: 'appium_smoke_avd', isCI: true };

    it('cold mode reproduces the historical CI flag set exactly', () => {
      expect(buildAndroidEmulatorArgs({ ...base, bootMode: 'cold' })).toEqual([
        '-avd',
        'appium_smoke_avd',
        '-skin',
        '1440x3120',
        '-memory',
        '12288',
        '-cores',
        '8',
        '-dns-server',
        '8.8.8.8',
        '-gpu',
        'swiftshader_indirect',
        '-no-audio',
        '-no-boot-anim',
        '-partition-size',
        '8192',
        '-no-snapshot-save',
        '-no-snapshot-load',
        '-cache-size',
        '2048',
        '-accel',
        'on',
        '-wipe-data',
        '-read-only',
        '-no-window',
      ]);
    });

    it('cold mode honors cores and skin overrides', () => {
      const args = buildAndroidEmulatorArgs({
        ...base,
        bootMode: 'cold',
        cores: '4',
        skin: '1080x2340',
      });
      expect(args).toContain('-cores');
      expect(args[args.indexOf('-cores') + 1]).toBe('4');
      expect(args[args.indexOf('-skin') + 1]).toBe('1080x2340');
    });

    it('snapshot-resume quick-boots read-only and never writes back', () => {
      const args = buildAndroidEmulatorArgs({
        ...base,
        bootMode: 'snapshot-resume',
      });
      expect(args).toContain('-snapshot');
      expect(args[args.indexOf('-snapshot') + 1]).toBe(
        ANDROID_EMULATOR_GOLDEN_SNAPSHOT_NAME,
      );
      expect(args).toContain('-no-snapshot-save');
      expect(args).toContain('-read-only');
      // Must not wipe or bypass the snapshot it is resuming from.
      expect(args).not.toContain('-wipe-data');
      expect(args).not.toContain('-no-snapshot-load');
      expect(args).not.toContain('-partition-size');
    });

    it('snapshot-resume allows opting out of -read-only', () => {
      const args = buildAndroidEmulatorArgs({
        ...base,
        bootMode: 'snapshot-resume',
        snapshotReadOnly: false,
      });
      expect(args).not.toContain('-read-only');
      expect(args).toContain('-snapshot');
    });

    it('snapshot-resume accepts a custom snapshot name', () => {
      const args = buildAndroidEmulatorArgs({
        ...base,
        bootMode: 'snapshot-resume',
        snapshotName: 'my_snapshot',
      });
      expect(args[args.indexOf('-snapshot') + 1]).toBe('my_snapshot');
    });

    it('snapshot-prime boots writable with wipe-data and snapshot save enabled', () => {
      const args = buildAndroidEmulatorArgs({
        ...base,
        bootMode: 'snapshot-prime',
      });
      expect(args).toContain('-wipe-data');
      expect(args).toContain('-no-snapshot-load');
      expect(args).toContain('-partition-size');
      expect(args).toContain('-no-window');
      // Snapshot save requires a writable image.
      expect(args).not.toContain('-read-only');
      expect(args).not.toContain('-no-snapshot-save');
      expect(args).not.toContain('-snapshot');
    });

    it('non-CI keeps the minimal local flag set regardless of mode', () => {
      for (const bootMode of [
        'cold',
        'snapshot-prime',
        'snapshot-resume',
      ] as const) {
        expect(
          buildAndroidEmulatorArgs({ avdName: 'test', isCI: false, bootMode }),
        ).toEqual(['-avd', 'test', '-no-snapshot-load']);
      }
    });
  });

  describe('golden snapshot state', () => {
    const avdName = 'appium_smoke_avd';
    let avdHome: string;
    let snapshotDir: string;

    beforeEach(() => {
      avdHome = fs.mkdtempSync(path.join(os.tmpdir(), 'mm-avd-test-'));
      snapshotDir = path.join(
        avdHome,
        `${avdName}.avd`,
        'snapshots',
        ANDROID_EMULATOR_GOLDEN_SNAPSHOT_NAME,
      );
    });

    afterEach(() => {
      fs.rmSync(avdHome, { recursive: true, force: true });
    });

    function writeSnapshot(fingerprint?: string): void {
      fs.mkdirSync(snapshotDir, { recursive: true });
      fs.writeFileSync(path.join(snapshotDir, 'snapshot.pb'), 'pb');
      if (fingerprint !== undefined) {
        fs.writeFileSync(
          path.join(
            avdHome,
            `${avdName}.avd`,
            'snapshots',
            `${ANDROID_EMULATOR_GOLDEN_SNAPSHOT_NAME}.fingerprint.txt`,
          ),
          `${fingerprint}\n`,
        );
      }
    }

    it('getGoldenSnapshotDir points at the named snapshot inside the AVD', () => {
      expect(getGoldenSnapshotDir(avdName, { ANDROID_AVD_HOME: avdHome })).toBe(
        snapshotDir,
      );
    });

    it('hasGoldenSnapshot is false without snapshot.pb and true with it', () => {
      const env = { ANDROID_AVD_HOME: avdHome };
      expect(hasGoldenSnapshot(avdName, env)).toBe(false);
      writeSnapshot();
      expect(hasGoldenSnapshot(avdName, env)).toBe(true);
    });

    it('isGoldenSnapshotUsable accepts on existence when no fingerprint is set', () => {
      writeSnapshot();
      expect(
        isGoldenSnapshotUsable(avdName, { ANDROID_AVD_HOME: avdHome }),
      ).toBe(true);
    });

    it('isGoldenSnapshotUsable rejects missing fingerprint in CI', () => {
      writeSnapshot();
      expect(
        isGoldenSnapshotUsable(avdName, {
          ANDROID_AVD_HOME: avdHome,
          CI: 'true',
        }),
      ).toBe(false);
    });

    it('isGoldenSnapshotUsable rejects when ANDROID_GOLDEN_SNAPSHOT_VALID is false', () => {
      writeSnapshot('fp-1');
      expect(
        isGoldenSnapshotUsable(avdName, {
          ANDROID_AVD_HOME: avdHome,
          ANDROID_EMULATOR_IMAGE_FINGERPRINT: 'fp-1',
          ANDROID_GOLDEN_SNAPSHOT_VALID: 'false',
        }),
      ).toBe(false);
    });

    it('isGoldenSnapshotUsable enforces the fingerprint when set', () => {
      writeSnapshot('fp-1');
      const env = {
        ANDROID_AVD_HOME: avdHome,
        ANDROID_EMULATOR_IMAGE_FINGERPRINT: 'fp-1',
      };
      expect(isGoldenSnapshotUsable(avdName, env)).toBe(true);
      expect(
        isGoldenSnapshotUsable(avdName, {
          ...env,
          ANDROID_EMULATOR_IMAGE_FINGERPRINT: 'fp-2',
        }),
      ).toBe(false);
    });

    it('isGoldenSnapshotUsable rejects a snapshot with no fingerprint file', () => {
      writeSnapshot();
      expect(
        isGoldenSnapshotUsable(avdName, {
          ANDROID_AVD_HOME: avdHome,
          ANDROID_EMULATOR_IMAGE_FINGERPRINT: 'fp-1',
        }),
      ).toBe(false);
    });
  });

  describe('computeAndroidSystemImageFingerprint', () => {
    let androidHome: string;

    beforeEach(() => {
      androidHome = fs.mkdtempSync(path.join(os.tmpdir(), 'mm-android-home-'));
      const imageDir = path.join(
        androidHome,
        'system-images',
        'android-36',
        'default',
        'x86_64',
      );
      fs.mkdirSync(imageDir, { recursive: true });
      fs.writeFileSync(
        path.join(imageDir, 'source.properties'),
        'Pkg.Revision=1',
      );
      fs.writeFileSync(path.join(imageDir, 'build.props'), 'ro.build.id=test');
      const emulatorDir = path.join(androidHome, 'emulator');
      fs.mkdirSync(emulatorDir, { recursive: true });
      const emulatorBin = path.join(emulatorDir, 'emulator');
      fs.writeFileSync(
        emulatorBin,
        '#!/bin/sh\necho "Android emulator version 1.0.0"\n',
      );
      fs.chmodSync(emulatorBin, 0o755);
    });

    afterEach(() => {
      fs.rmSync(androidHome, { recursive: true, force: true });
    });

    it('changes when ANDROID_EMULATOR_CI_CORES changes', async () => {
      const base = {
        ANDROID_HOME: androidHome,
        ANDROID_SYSTEM_IMAGE_API_LEVEL: '36',
        ANDROID_SYSTEM_IMAGE_TAG: 'default',
        ANDROID_SYSTEM_IMAGE_ABI: 'x86_64',
      };
      const fp8 = await computeAndroidSystemImageFingerprint({
        ...base,
        ANDROID_EMULATOR_CI_CORES: '8',
      });
      const fp16 = await computeAndroidSystemImageFingerprint({
        ...base,
        ANDROID_EMULATOR_CI_CORES: '16',
      });
      expect(fp8).not.toBe(fp16);
    });

    it('changes when ANDROID_EMULATOR_CI_SKIN changes', async () => {
      const base = {
        ANDROID_HOME: androidHome,
        ANDROID_SYSTEM_IMAGE_API_LEVEL: '36',
        ANDROID_SYSTEM_IMAGE_TAG: 'default',
        ANDROID_SYSTEM_IMAGE_ABI: 'x86_64',
        ANDROID_EMULATOR_CI_CORES: '8',
      };
      const fpA = await computeAndroidSystemImageFingerprint({
        ...base,
        ANDROID_EMULATOR_CI_SKIN: '1080x2340',
      });
      const fpB = await computeAndroidSystemImageFingerprint({
        ...base,
        ANDROID_EMULATOR_CI_SKIN: '1440x3120',
      });
      expect(fpA).not.toBe(fpB);
    });
  });
});
