import { NativeModules, Platform } from 'react-native';
import { isQa, isRc } from '../util/test/utils';

const isAndroid = Platform.OS === 'android';

export default {
  forbid:
    isQa || isRc
      ? () => true
      : isAndroid
      ? NativeModules.PreventScreenshot.forbid
      : () => true,
  allow:
    isQa || isRc
      ? () => true
      : isAndroid
      ? NativeModules.PreventScreenshot.allow
      : () => true,
};
