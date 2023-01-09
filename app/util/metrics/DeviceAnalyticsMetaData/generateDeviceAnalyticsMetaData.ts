import { Platform } from 'react-native';
import { getBuildNumber, getVersion, getBrand } from 'react-native-device-info';
import { DeviceMetaData } from './DeviceAnalyticsMetaData.types';

const generateDeviceAnalyticsMetaData = (): DeviceMetaData => ({
  platform: Platform.OS,
  currentBuildNumber: getBuildNumber(),
  applicationVersion: getVersion(),
  operatingSystemVersion: Platform.Version.toString(),
  deviceBrand: getBrand(),
});

export default generateDeviceAnalyticsMetaData;
