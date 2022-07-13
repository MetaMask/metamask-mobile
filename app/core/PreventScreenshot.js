import { NativeModules, Platform } from 'react-native';

const isAndroid = Platform.OS === 'android';

export default {
  forbid: () => {
    true;
  },
  allow: () => {
    true;
  },
};
