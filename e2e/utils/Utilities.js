import { blacklistURLs } from '../resources/blacklistURLs.json';

import {
  getFixturesServerPort,
  getGanachePort,
  getLocalTestDappPort,
  getMockServerPort,
} from '../fixtures/utils';
import { resolveConfig } from 'detox/internals';
export default class Utilities {
  static async openDeepLink(inputURL) {
    await device.launchApp({
      newInstance: true,
      url: inputURL,
      sourceApp: 'io.metamask',
      launchArgs: {
        fixtureServerPort: `${getFixturesServerPort()}`,
        detoxURLBlacklistRegex: this.BlacklistURLs,
      },
    });
  }

  /**
   * Reverses the TCP ports for necessary servers to ensure proper communication between the device and local services.
   * Only applicable for Android devices.
   *
   * @async
   * @returns {Promise<void>} Resolves once all required ports are reversed.
   */
  static async reverseServerPort() {
    if (device.getPlatform() === 'android') {
      await device.reverseTcpPort(getGanachePort());
      await device.reverseTcpPort(getFixturesServerPort());
      await device.reverseTcpPort(getLocalTestDappPort());
      await device.reverseTcpPort(getMockServerPort());
    }
  }

  /**
   * Launches the app with the specified options.
   * Automatically handles debug builds by using the `launchAppForDebugBuild` method.
   *
   * @async
   * @param {Object} launchOptions - The options to customize app launch behavior.
   * @returns {Promise<void>} Resolves once the app is launched.
   */
  static async launchApp(launchOptions) {
    const config = await resolveConfig();
    const platform = device.getPlatform();
    if (config.configurationName.endsWith('debug')) {
      return this.launchAppForDebugBuild(platform, launchOptions);
    }

    return device.launchApp(launchOptions);
  }

  /**
   * Launches the app in debug mode using a specific deep link URL.
   * Handles platform-specific logic for iOS and Android.
   *
   * @async
   * @param {string} platform - The platform on which the app is being launched (`ios` or `android`).
   * @param {Object} launchOptions - The options to customize app launch behavior.
   * @returns {Promise<void>} Resolves once the app is launched.
   */
  static async launchAppForDebugBuild(platform, launchOptions) {
    const deepLinkUrl = this.getDeepLinkUrl(
      this.getDevLauncherPackagerUrl(platform),
    );

    if (platform === 'ios') {
      await device.launchApp(launchOptions);
      return device.openURL({
        url: deepLinkUrl,
      });
    }

    return device.launchApp({
      url: deepLinkUrl,
      ...launchOptions,
    });
  }

  /**
   * Constructs a deep link URL for the app to facilitate specific launch scenarios.
   *
   * @param {string} url - The base URL to be encoded into the deep link.
   * @returns {string} The formatted deep link URL.
   */
  static getDeepLinkUrl(url) {
    return `expo-metamask://expo-development-client/?url=${encodeURIComponent(
      url,
    )}`;
  }

  /**
   * Generates the development packager URL for the Expo dev client.
   *
   * @param {string} platform - The platform for which the URL is being generated (`ios` or `android`).
   * @returns {string} The URL pointing to the development server bundle.
   */
  static getDevLauncherPackagerUrl(platform) {
    return `http://localhost:8081/index.bundle?platform=${platform}&dev=true&minify=false&disableOnboarding=1`;
  }

  /**
   * Relaunches the app by creating a new instance and applying specific launch arguments.
   *
   * @returns {Promise<void>} Resolves once the app is relaunched.
   */
  static relaunchApp() {
    return this.launchApp({
      newInstance: true,
      launchArgs: {
        detoxURLBlacklistRegex: Utilities.BlacklistURLs,
      },
    });
  }

  /**
   * Delays execution for a specified duration.
   *
   * @param {number} ms - The number of milliseconds to delay execution.
   * @returns {Promise<void>} Resolves after the specified delay.
   */
  static delay(ms) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, ms);
    });
  }

  /**
   * Formats an array of strings into a regex pattern string for exact matching.
   * This method takes an array of strings and returns a string formatted
   * for use in a regex pattern, designed to match any one of the provided strings exactly.
   * The resulting string is suitable for inclusion in a larger regex pattern.
   *
   * @param {string[]} regexstrings - An array of strings to be formatted for exact matching in a regex pattern.
   * @returns {string} A string formatted for exact matching within a regex pattern,
   *                    encapsulating the input strings in a way that they can be matched as literals.
   * @example
   * // returns '\\("apple","banana","cherry"\\)'
   * formatForExactMatchGroup(['apple', 'banana', 'cherry']);
   */
  static formatForExactMatchGroup(regexstrings) {
    return `\\("${regexstrings.join('","')}"\\)`;
  }

  /**
   * A getter method that returns a formatted string of blacklisted URLs for exact matching in a regex pattern.
   * This method leverages `formatForExactMatchGroup` to format the `blacklistURLs` array into a regex pattern string,
   * suitable for matching any one of the blacklisted URLs exactly. The `blacklistURLs` should be defined
   * within the class or accessible in the class context.
   *
   * @returns {string} A regex pattern string formatted for exact matching of blacklisted URLs.
   * @example
   */
  static get BlacklistURLs() {
    return this.formatForExactMatchGroup(blacklistURLs);
  }
}
