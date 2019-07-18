'use strict';

import { Dimensions } from 'react-native';

export default class DeviceSize {
	static isIpad() {
		return Dimensions.get('window').width >= 1000 || Dimensions.get('window').height >= 1000;
	}

	static isLandscape() {
		return Dimensions.get('window').width > Dimensions.get('window').height;
	}

	static isIphone5() {
		return Dimensions.get('window').width === 320;
	}

	static isIphone5S() {
		return Dimensions.get('window').width === 320;
	}

	static isIphone6() {
		return Dimensions.get('window').width === 375;
	}

	static isIphone6Plus() {
		return Dimensions.get('window').width === 414;
	}

	static isIphone6SPlus() {
		return Dimensions.get('window').width === 414;
	}

	static isIphoneX() {
		return Dimensions.get('window').width >= 375 && Dimensions.get('window').height >= 812;
	}

	static isIpadPortrait9_7() {
		return Dimensions.get('window').height === 1024 && Dimensions.get('window').width === 736;
	}
	static isIpadLandscape9_7() {
		return Dimensions.get('window').height === 736 && Dimensions.get('window').width === 1024;
	}

	static isIpadPortrait10_5() {
		return Dimensions.get('window').height === 1112 && Dimensions.get('window').width === 834;
	}
	static isIpadLandscape10_5() {
		return Dimensions.get('window').width === 1112 && Dimensions.get('window').height === 834;
	}

	static isIpadPortrait12_9() {
		return Dimensions.get('window').width === 1024 && Dimensions.get('window').height === 1366;
	}
	static isIpadLandscape12_9() {
		return Dimensions.get('window').width === 1366 && Dimensions.get('window').height === 1024;
	}

	static getDeviceWidth() {
		return Dimensions.get('window').width;
	}

	static isSmallDevice() {
		return Dimensions.get('window').height < 600;
	}
}
