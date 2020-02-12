'use strict';

import { Dimensions } from 'react-native';

const getDeviceWidth = () => Dimensions.get('window').width;
const getDeviceHeight = () => Dimensions.get('window').height;

export default class Device {
	static isIpad() {
		return getDeviceWidth() >= 1000 || getDeviceHeight() >= 1000;
	}

	static isLandscape() {
		return getDeviceWidth() > getDeviceHeight();
	}

	static isIphone5() {
		return getDeviceWidth() === 320;
	}

	static isIphone5S() {
		return getDeviceWidth() === 320;
	}

	static isIphone6() {
		return getDeviceWidth() === 375;
	}

	static isIphone6Plus() {
		return getDeviceWidth() === 414;
	}

	static isIphone6SPlus() {
		return getDeviceWidth() === 414;
	}

	static isIphoneX() {
		return getDeviceWidth() >= 375 && getDeviceHeight() >= 812;
	}

	static isIpadPortrait9_7() {
		return getDeviceHeight() === 1024 && getDeviceWidth() === 736;
	}
	static isIpadLandscape9_7() {
		return getDeviceHeight() === 736 && getDeviceWidth() === 1024;
	}

	static isIpadPortrait10_5() {
		return getDeviceHeight() === 1112 && getDeviceWidth() === 834;
	}
	static isIpadLandscape10_5() {
		return getDeviceWidth() === 1112 && getDeviceHeight() === 834;
	}

	static isIpadPortrait12_9() {
		return getDeviceWidth() === 1024 && getDeviceHeight() === 1366;
	}
	static isIpadLandscape12_9() {
		return getDeviceWidth() === 1366 && getDeviceHeight() === 1024;
	}

	static getDeviceWidth() {
		return getDeviceWidth();
	}

	static isSmallDevice() {
		return getDeviceHeight() < 600;
	}
}
