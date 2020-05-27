'use strict';

import { Dimensions, Platform } from 'react-native';

export default class Device {
	static getDeviceWidth() {
		return Dimensions.get('window').width;
	}

	static getDeviceHeight() {
		return Dimensions.get('window').height;
	}

	static isIos() {
		return Platform.OS === 'ios';
	}

	static isAndroid() {
		return Platform.OS === 'android';
	}

	static isIpad() {
		return this.getDeviceWidth() >= 1000 || this.getDeviceHeight() >= 1000;
	}

	static isLandscape() {
		return this.getDeviceWidth() > this.getDeviceHeight();
	}

	static isIphone5() {
		return this.getDeviceWidth() === 320;
	}

	static isIphone5S() {
		return this.getDeviceWidth() === 320;
	}

	static isIphone6() {
		return this.getDeviceWidth() === 375;
	}

	static isIphone6Plus() {
		return this.getDeviceWidth() === 414;
	}

	static isIphone6SPlus() {
		return this.getDeviceWidth() === 414;
	}

	static isIphoneX() {
		return this.getDeviceWidth() >= 375 && this.getDeviceHeight() >= 812;
	}

	static isIpadPortrait9_7() {
		return this.getDeviceHeight() === 1024 && this.getDeviceWidth() === 736;
	}
	static isIpadLandscape9_7() {
		return this.getDeviceHeight() === 736 && this.getDeviceWidth() === 1024;
	}

	static isIpadPortrait10_5() {
		return this.getDeviceHeight() === 1112 && this.getDeviceWidth() === 834;
	}
	static isIpadLandscape10_5() {
		return this.getDeviceWidth() === 1112 && this.getDeviceHeight() === 834;
	}

	static isIpadPortrait12_9() {
		return this.getDeviceWidth() === 1024 && this.getDeviceHeight() === 1366;
	}

	static isIpadLandscape12_9() {
		return this.getDeviceWidth() === 1366 && this.getDeviceHeight() === 1024;
	}

	static isSmallDevice() {
		return this.getDeviceHeight() < 600;
	}

	static isMediumDevice() {
		return this.getDeviceHeight() < 736;
	}
}
