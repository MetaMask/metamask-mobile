import { JsonMap } from '@segment/analytics-react-native';

// export interface DeviceMetaData extends JsonMap {
//   platform: string;
//   currentBuildNumber: string;
//   applicationVersion: string;
//   operatingSystemVersion: string;
//   deviceBrand: string;
// }

export type DeviceMetaData = JsonMap & {
  platform: string;
  currentBuildNumber: string;
  applicationVersion: string;
  operatingSystemVersion: string;
  deviceBrand: string;
};
