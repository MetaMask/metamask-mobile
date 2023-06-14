import { Platform, NativeModules } from 'react-native';
import { MetamaskMinimizer } from '../core/NativeModules';

export default Platform.select({
  ios: NativeModules.Minimizer,
  android: MetamaskMinimizer,
});
