import { NativeModules, Platform } from 'react-native';
import { isE2EOrExpEnvironment, isRc } from '../util/test/utils';

const isAndroid = Platform.OS === 'android';

export default {
  forbid:
    isE2EOrExpEnvironment || isRc
      ? () => true
      : isAndroid
        ? NativeModules.PreventScreenshot.forbid
        : () => true,
  allow:
    isE2EOrExpEnvironment || isRc
      ? () => true
      : isAndroid
        ? NativeModules.PreventScreenshot.allow
        : () => true,
};
