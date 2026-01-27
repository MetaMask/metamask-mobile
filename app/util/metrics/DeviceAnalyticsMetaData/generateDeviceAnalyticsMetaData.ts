import { Platform } from 'react-native';
import { getBuildNumber, getVersion, getBrand } from 'react-native-device-info';
import type { AnalyticsUserTraits } from '@metamask/analytics-controller';

/**
 * Generate device analytics meta data
 * Returns AnalyticsUserTraits-compatible object
 */
const generateDeviceAnalyticsMetaData = (): AnalyticsUserTraits => ({
  platform: Platform.OS,
  currentBuildNumber: getBuildNumber(),
  applicationVersion: getVersion(),
  operatingSystemVersion: Platform.Version.toString(),
  deviceBrand: getBrand(),
});

export default generateDeviceAnalyticsMetaData;
