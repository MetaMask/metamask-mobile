import DeviceAnalyticsMetaData from './DeviceAnalyticsMetaData/generateDeviceAnalyticsMetaData';
import UserSettingsAnalyticsMetaData from './UserSettingsAnalyticsMetaData/generateUserProfileAnalyticsMetaData';
import {
  shouldEmitDappViewedEvent,
  trackDappViewedEvent,
} from './trackDappViewedEvent';

export default DeviceAnalyticsMetaData;
export { UserSettingsAnalyticsMetaData };
export { trackDappViewedEvent, shouldEmitDappViewedEvent };
