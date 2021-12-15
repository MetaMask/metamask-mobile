import { Colors } from '../models';
import baseColors from './base-colors';

const colors: Colors = {
	textDefault: '#370B1E',
	textAlternative: '#6E163C',
	backgroundDefault: '#E8DEF8',
	backgroundAlternative: '#F3EDF7',
	borderDefault: baseColors.grey100,
	muted: baseColors.grey100,
	overlay: baseColors.overlay,
	primary: '#FFD8E4',
	onPrimary: '#370B1E',
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
