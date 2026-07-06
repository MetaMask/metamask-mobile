import {
  ANDROID_E2E_PACKAGES_TO_DISABLE,
  findAnrDialogRecoveryTapPoint,
  findAnrDialogWaitTapPoint,
  isAndroidPingSuccessful,
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
});
