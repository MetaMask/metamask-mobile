import { NativeModules, Platform } from 'react-native';

const isAndroid = Platform.OS === 'android';

export default {
  forbid:()=>{ return true},
	allow:()=>{ return true}
};
