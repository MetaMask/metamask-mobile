import { NativeModules } from 'react-native';

// replaces react-native-minimizer native module on Android
const MetamaskMinimizer = NativeModules.GoBack;

// TODO: add all native modules here
export { MetamaskMinimizer };
