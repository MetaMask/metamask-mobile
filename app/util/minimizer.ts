import { Platform } from 'react-native';
import Minimizer from 'react-native-minimizer';
import { MetamaskMinimizer } from '../core/NativeModules';

export default Platform.select({
  ios: Minimizer,
  android: MetamaskMinimizer,
});
