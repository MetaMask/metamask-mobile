/* eslint-disable import-x/no-nodejs-modules */
import { accessSync, constants } from 'node:fs';
import {
  APPIUM_SETTINGS_APK_NAME,
  APPIUM_SETTINGS_PACKAGE,
  buildAppiumSettingsInstallArgs,
  isAppiumSettingsPmPathInstalled,
  resolveAppiumSettingsApkPath,
} from './AppiumSettingsApp.ts';

describe('AppiumSettingsApp', () => {
  describe('resolveAppiumSettingsApkPath', () => {
    it('resolves the io.appium.settings debug APK from node_modules', () => {
      const apkPath = resolveAppiumSettingsApkPath();

      expect(apkPath).toContain(APPIUM_SETTINGS_PACKAGE);
      expect(apkPath.endsWith(APPIUM_SETTINGS_APK_NAME)).toBe(true);
      expect(() => accessSync(apkPath, constants.R_OK)).not.toThrow();
    });
  });

  describe('buildAppiumSettingsInstallArgs', () => {
    it('reinstalls with runtime permissions granted', () => {
      expect(
        buildAppiumSettingsInstallArgs(
          'emulator-5554',
          '/tmp/settings_apk-debug.apk',
        ),
      ).toEqual([
        '-s',
        'emulator-5554',
        'install',
        '-r',
        '-g',
        '/tmp/settings_apk-debug.apk',
      ]);
    });
  });

  describe('isAppiumSettingsPmPathInstalled', () => {
    it('treats a package: path as installed', () => {
      expect(
        isAppiumSettingsPmPathInstalled(
          'package:/data/app/io.appium.settings-1/base.apk',
        ),
      ).toBe(true);
    });

    it('treats empty pm path output as missing', () => {
      expect(isAppiumSettingsPmPathInstalled('')).toBe(false);
    });
  });
});
