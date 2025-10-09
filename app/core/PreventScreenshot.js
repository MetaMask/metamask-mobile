import { NativeModules, Platform } from 'react-native';
import { isQa } from '../util/test/utils';

const isAndroid = Platform.OS === 'android';

export default {
  forbid: isQa
    ? () => true
    : isAndroid
    ? NativeModules.PreventScreenshot.forbid
    : () => true,
  allow: isQa
    ? () => true
    : isAndroid
    ? NativeModules.PreventScreenshot.allow
    : () => true,
};
