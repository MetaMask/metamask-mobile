import {
  resolveCliLoginPushNudgeTurnOnAction,
  shouldShowCliLoginPushNudge,
} from './cliLoginPushNudgeRouting';

describe('cliLoginPushNudgeRouting', () => {
  describe('shouldShowCliLoginPushNudge', () => {
    it('returns true when MetaMask in-app notifications are off', () => {
      expect(
        shouldShowCliLoginPushNudge({
          isMetamaskNotificationsEnabled: false,
          isMetaMaskPushNotificationsEnabled: true,
          nativePushStatus: 'granted',
        }),
      ).toBe(true);
    });

    it('returns true when native push is not granted', () => {
      expect(
        shouldShowCliLoginPushNudge({
          isMetamaskNotificationsEnabled: true,
          isMetaMaskPushNotificationsEnabled: true,
          nativePushStatus: 'promptable',
        }),
      ).toBe(true);
    });

    it('returns true when push is not registered in the controller', () => {
      expect(
        shouldShowCliLoginPushNudge({
          isMetamaskNotificationsEnabled: true,
          isMetaMaskPushNotificationsEnabled: false,
          nativePushStatus: 'granted',
        }),
      ).toBe(true);
    });

    it('returns false when in-app, native, and push registration are all enabled', () => {
      expect(
        shouldShowCliLoginPushNudge({
          isMetamaskNotificationsEnabled: true,
          isMetaMaskPushNotificationsEnabled: true,
          nativePushStatus: 'granted',
        }),
      ).toBe(false);
    });
  });

  describe('resolveCliLoginPushNudgeTurnOnAction', () => {
    it('enables notifications when the OS dialog is still promptable', () => {
      expect(
        resolveCliLoginPushNudgeTurnOnAction({
          isGranted: false,
          isPromptable: true,
        }),
      ).toBe('enable_notifications');
    });

    it('enables notifications when OS push is already granted (in-app off)', () => {
      expect(
        resolveCliLoginPushNudgeTurnOnAction({
          isGranted: true,
          isPromptable: false,
        }),
      ).toBe('enable_notifications');
    });

    it('opens device settings when the OS is neither granted nor promptable', () => {
      expect(
        resolveCliLoginPushNudgeTurnOnAction({
          isGranted: false,
          isPromptable: false,
        }),
      ).toBe('open_device_settings');
    });
  });
});
