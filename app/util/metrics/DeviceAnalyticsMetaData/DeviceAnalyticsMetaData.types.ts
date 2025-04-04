interface AnalyticsProperties {
  [key: string]: string;
}
export interface DeviceMetaData extends AnalyticsProperties {
  platform: string;
  currentBuildNumber: string;
  applicationVersion: string;
  operatingSystemVersion: string;
  deviceBrand: string;
}
