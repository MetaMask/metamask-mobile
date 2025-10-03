import { getDeviceName } from 'react-native-device-info';

export const getDeviceVersion = async () => {
  try {
    const deviceName = await getDeviceName();
    return deviceName;
  } catch (error) {
    console.error('Error getting device name:', error);
    return 'Unknown';
  }
};
