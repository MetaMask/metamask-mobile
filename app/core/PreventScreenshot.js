// import { NativeModules, Platform } from 'react-native';
// const isAndroid = Platform.OS === 'android';

// NOTE: needed for Browserstack testing
export default {
	//forbid: isAndroid ? NativeModules.PreventScreenshot.forbid : () => true,
	//allow: isAndroid ? NativeModules.PreventScreenshot.allow : () => true,
	forbid: () => true,
	allow: () => true,
};
