import { JsonMap } from '@segment/analytics-react-native';

export type DeviceMetaData = JsonMap & {
  platform: string;
  currentBuildNumber: string;
  applicationVersion: string;
  operatingSystemVersion: string;
  deviceBrand: string;
};
