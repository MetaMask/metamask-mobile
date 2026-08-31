import type { FullProject, TestInfo } from '@playwright/test';
import {
  Platform,
  ProviderName,
  type DeviceConfig,
  type EmulatorConfig,
  type WebDriverConfig,
} from '../../types.ts';
import { applyResolvedAndroidAdbToDevice } from '../../services/providers/emulator/android/resolveAndroidAdbUdid.ts';
import { getIosSimulatorUdid } from '../../services/appium/EmulatorHelpers.ts';
import { createPlaywrightLogger } from '../../playwrightLogger.ts';
import type { CurrentDeviceDetails } from './types.ts';

const logger = createPlaywrightLogger('currentDeviceDetails');

export const currentDeviceDetailsFixture = {
  currentDeviceDetails: async (
    {}, // eslint-disable-line no-empty-pattern
    use: (deviceDetails: CurrentDeviceDetails) => Promise<void>,
    testInfo: TestInfo,
  ) => {
    const project = testInfo.project as FullProject<WebDriverConfig>;

    logger.info(
      `Resolving device details for project "${project.name}" (${testInfo.title})`,
    );

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
      logger.debug(
        `Resolving Android ADB serial for "${deviceNameField ?? deviceUdid}"`,
      );
      await applyResolvedAndroidAdbToDevice(emulatorDevice, {
        setAndroidSerialEnv: true,
      });
      logger.debug(
        `Android ADB serial resolved: ${emulatorDevice.udid ?? 'unknown'}`,
      );
    }

    // For iOS local simulators, resolve the UDID of the currently-booted device.
    // CI sets IOS_SIMULATOR_UDID (and project device.udid) from prepare-ios-appium-runner;
    // prefer those over name lookup when multiple simulators share a display name.
    let resolvedIosUdid: string | undefined;
    if (platform === Platform.IOS && isLocalEmulator && deviceNameField) {
      const preferredUdid =
        emulatorDevice?.udid?.trim() || process.env.IOS_SIMULATOR_UDID?.trim();
      resolvedIosUdid =
        preferredUdid || (await getIosSimulatorUdid(deviceNameField));
    }

    const displayName = deviceNameField ?? deviceUdid ?? 'unknown';
    const providerLabel = isBrowserstack
      ? 'browserstack'
      : (deviceConfig?.provider ?? 'unknown');
    const deviceDetails: CurrentDeviceDetails = {
      platform: platform as 'android' | 'ios',
      deviceName: displayName,
      udid: resolvedIosUdid ?? emulatorDevice?.udid,
      packageName,
      appId,
      launchableActivity,
      isBrowserstack,
    };

    logger.info(
      `Device details ready: platform=${platform}, device=${displayName}` +
        (deviceDetails.udid ? `, udid=${deviceDetails.udid}` : '') +
        `, provider=${providerLabel}` +
        (packageName ? `, package=${packageName}` : '') +
        (appId ? `, appId=${appId}` : ''),
    );

    await use(deviceDetails);
  },
};
