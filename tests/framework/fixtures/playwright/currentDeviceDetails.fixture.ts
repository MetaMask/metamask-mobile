import type { FullProject, TestInfo } from '@playwright/test';
import {
  WebDriverConfig,
  Platform,
  ProviderName,
  type DeviceConfig,
  type EmulatorConfig,
} from '../../types.ts';
import { applyResolvedAndroidAdbToDevice } from '../../services/providers/emulator/android/resolveAndroidAdbUdid.ts';
import type { CurrentDeviceDetails } from './types.ts';

export const currentDeviceDetailsFixture = {
  currentDeviceDetails: async (
    {}, // eslint-disable-line no-empty-pattern
    use: (deviceDetails: CurrentDeviceDetails) => Promise<void>,
    testInfo: TestInfo,
  ) => {
    const project = testInfo.project as FullProject<WebDriverConfig>;
    const platform = project.use.platform;
    const emulatorDevice = project.use.device as EmulatorConfig | undefined;
    const deviceNameField = emulatorDevice?.name;
    const deviceUdid = emulatorDevice?.udid;
    const packageName = project.use.app?.packageName;
    const appId = project.use.app?.appId;
    const launchableActivity = project.use.app?.launchableActivity;
    const deviceConfig = project.use.device as DeviceConfig | undefined;
    const isBrowserstack = deviceConfig?.provider === ProviderName.BROWSERSTACK;

    const hasLocalDeviceId =
      Boolean(deviceNameField) ||
      (platform === Platform.ANDROID && Boolean(deviceUdid));

    const missingFields = [
      ...(!platform ? ['"use.platform"'] : []),
      ...(!hasLocalDeviceId
        ? ['"use.device.name" and/or (Android) "use.device.udid"']
        : []),
    ];

    if (missingFields.length > 0) {
      throw new Error(
        `Missing ${missingFields.join(' and ')} for project "${project.name}" in tests/playwright.config.ts.`,
      );
    }

    const isLocalEmulator =
      emulatorDevice?.provider === ProviderName.EMULATOR ||
      emulatorDevice?.provider === ProviderName.SIMULATOR;

    if (platform === Platform.ANDROID && isLocalEmulator && emulatorDevice) {
      await applyResolvedAndroidAdbToDevice(emulatorDevice, {
        setAndroidSerialEnv: true,
      });
    }

    const displayName = deviceNameField ?? deviceUdid ?? 'unknown';
    const deviceDetails: CurrentDeviceDetails = {
      platform: platform as 'android' | 'ios',
      deviceName: displayName,
      udid: emulatorDevice?.udid,
      packageName,
      appId,
      launchableActivity,
      isBrowserstack,
    };

    await use(deviceDetails);
  },
};
