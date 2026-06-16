import { Platform } from 'react-native';
import { Context, NativeRampsSdk } from '@consensys/native-ramps-sdk';
import I18n from '../../../../../locales/i18n';
import { getSdkEnvironment } from './getSdkEnvironment';

const environment = getSdkEnvironment();
const context =
  Platform.OS === 'ios' ? Context.MobileIOS : Context.MobileAndroid;

export const DepositSDKNoAuth = new NativeRampsSdk(
  {
    context,
    locale: I18n.locale,
  },
  environment,
);
