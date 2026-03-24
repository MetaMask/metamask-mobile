'use strict';

import { Dimensions, Platform } from 'react-native';
import { hasNotch, getApiLevel } from 'react-native-device-info';
import compareVersions from 'compare-versions';

export default class Device {
  static getDeviceWidth() {
    return Dimensions.get('window').width;
  }

  static getDeviceHeight() {
    return Dimensions.get('window').height;
  }

  /**
   * Compares this device's React Native {@link Platform.Version} to `referenceVersion`
   * using the shared `compare-versions` package after normalizing both values to strings.
   *
   * @param {string|number} referenceVersion - Version to compare against (e.g. `"17.4"`).
   * @returns {number} `1` if current > reference, `-1` if current < reference, `0` if equal.
   * @remarks On iOS, `Platform.Version` is usually a string (`"17.3.1"`). On Android it is
   * typically the API level as a number (for example `34`). Both values are coerced to strings
   * before comparison so the helper remains safe across platforms while preserving component-wise
   * numeric comparison semantics.
   */
  static comparePlatformVersionTo(referenceVersion) {
    return compareVersions(String(Platform.Version), String(referenceVersion));
  }

  static isIos() {
    return Platform.OS === 'ios';
  }

  static isAndroid() {
    return Platform.OS === 'android';
  }

  static isIpad() {
    return this.getDeviceWidth() >= 1000 || this.getDeviceHeight() >= 1000;
  }

  static isLandscape() {
    return this.getDeviceWidth() > this.getDeviceHeight();
  }

  static isIphone5() {
    return this.getDeviceWidth() === 320;
  }

  static isIphone5S() {
    return this.getDeviceWidth() === 320;
  }

  static isIphone6() {
    return this.getDeviceWidth() === 375;
  }

  static isIphone6Plus() {
    return this.getDeviceWidth() === 414;
  }

  static isIphone6SPlus() {
    return this.getDeviceWidth() === 414;
  }

  static isIphoneX() {
    return this.getDeviceWidth() >= 375 && this.getDeviceHeight() >= 812;
  }

  static isIpadPortrait9_7() {
    return this.getDeviceHeight() === 1024 && this.getDeviceWidth() === 736;
  }
  static isIpadLandscape9_7() {
    return this.getDeviceHeight() === 736 && this.getDeviceWidth() === 1024;
  }

  static isIpadPortrait10_5() {
    return this.getDeviceHeight() === 1112 && this.getDeviceWidth() === 834;
  }
  static isIpadLandscape10_5() {
    return this.getDeviceWidth() === 1112 && this.getDeviceHeight() === 834;
  }

  static isIpadPortrait12_9() {
    return this.getDeviceWidth() === 1024 && this.getDeviceHeight() === 1366;
  }

  static isIpadLandscape12_9() {
    return this.getDeviceWidth() === 1366 && this.getDeviceHeight() === 1024;
  }

  static isSmallDevice() {
    return this.getDeviceHeight() < 600;
  }

  static isMediumDevice() {
    return this.getDeviceHeight() < 736;
  }

  static isLargeDevice() {
    return this.getDeviceHeight() > 736;
  }

  static hasNotch() {
    return hasNotch();
  }

  static async getDeviceAPILevel() {
    const apiLevel = await getApiLevel();
    return apiLevel;
  }
}
