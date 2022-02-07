import { Colors } from '../models';
import baseColors from './base-colors';

const colors: Colors = {
	textDefault: baseColors.white,
	textAlternative: baseColors.grey100,
	backgroundDefault: baseColors.grey900,
	backgroundAlternative: baseColors.grey800,
	navbarBackground: baseColors.grey900,
	borderDefault: baseColors.grey400,
	muted: baseColors.grey700,
	overlay: baseColors.overlay,
	primary: baseColors.blue500,
	onPrimary: baseColors.white,
	info: baseColors.blue000,
	onInfo: baseColors.blue500,
	error: baseColors.red000,
	onError: baseColors.red500,
	success: baseColors.green100,
	onSuccess: baseColors.green500,
	warning: baseColors.yellow000,
	onWarning: baseColors.yellow600,
	inverse: baseColors.grey800,
	onInverse: baseColors.white,
	alert: 'rgba(0,0,0,.75)',
	onAlert: baseColors.white,
	// UI escape hatches for grey colors with no general purpose
	ui4: baseColors.grey500,
	onUi4: baseColors.white,
	shadowColor: baseColors.gray900,
	// needs auditing
	transparent: 'transparent',
};

export default colors;
