import { Platform } from 'react-native';
import { getBuildNumber, getBrand } from 'react-native-device-info';
import type { AnalyticsUserTraits } from '@metamask/analytics-controller';
import getAnalyticsAppVersion from '../getAnalyticsAppVersion';

/**
 * Generate device analytics meta data
 * Returns AnalyticsUserTraits-compatible object
 */
const generateDeviceAnalyticsMetaData = (): AnalyticsUserTraits => ({
  platform: Platform.OS,
  currentBuildNumber: getBuildNumber(),
  applicationVersion: getAnalyticsAppVersion(),
  operatingSystemVersion: Platform.Version.toString(),
  deviceBrand: getBrand(),
});

export default generateDeviceAnalyticsMetaData;
