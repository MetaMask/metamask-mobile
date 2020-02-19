import Device from '../../../util/Device';
import { StyleSheet } from 'react-native';
import { colors, fontStyles } from '../../../styles/common';

const ANDROID_OFFSET = 30;

export default StyleSheet.create({
	wrapper: {
		flex: 1,
		backgroundColor: colors.white
	},
	header: {
		paddingTop: Device.isIphoneX() ? 60 : 24,
		backgroundColor: colors.grey000,
		height: Device.isIphoneX() ? 110 : 74,
		flexDirection: 'column',
		paddingBottom: 0
	},
	settings: {
		paddingHorizontal: 12,
		alignSelf: 'flex-end',
		alignItems: 'center',
		marginRight: 3,
		marginTop: Device.isAndroid() ? -3 : -10
	},
	settingsIcon: {
		marginBottom: 12
	},
	metamaskLogo: {
		flexDirection: 'row',
		flex: 1,
		marginTop: Device.isAndroid() ? 0 : 12,
		marginLeft: 15,
		paddingTop: Device.isAndroid() ? 10 : 0
	},
	metamaskFox: {
		height: 27,
		width: 27,
		marginRight: 15
	},
	metamaskName: {
		marginTop: 4,
		width: 90,
		height: 18
	},
	account: {
		flex: 1,
		backgroundColor: colors.grey000
	},
	accountBgOverlay: {
		borderBottomColor: colors.grey100,
		borderBottomWidth: 1,
		padding: 17
	},
	identiconWrapper: {
		marginBottom: 12,
		width: 56,
		height: 56
	},
	identiconBorder: {
		borderRadius: 96,
		borderWidth: 2,
		padding: 2,
		borderColor: colors.blue
	},
	accountNameWrapper: {
		flexDirection: 'row',
		paddingRight: 17
	},
	accountName: {
		fontSize: 20,
		lineHeight: 24,
		marginBottom: 5,
		color: colors.fontPrimary,
		...fontStyles.normal
	},
	caretDown: {
		textAlign: 'right',
		marginLeft: 7,
		marginTop: 3,
		fontSize: 18,
		color: colors.fontPrimary
	},
	accountBalance: {
		fontSize: 14,
		lineHeight: 17,
		marginBottom: 5,
		color: colors.fontPrimary,
		...fontStyles.normal
	},
	accountAddress: {
		fontSize: 12,
		lineHeight: 17,
		color: colors.fontSecondary,
		...fontStyles.normal
	},
	buttons: {
		flexDirection: 'row',
		borderBottomColor: colors.grey100,
		borderBottomWidth: 1,
		padding: 15
	},
	button: {
		flex: 1,
		flexDirection: 'row',
		borderRadius: 30,
		borderWidth: 1.5
	},
	leftButton: {
		marginRight: 5
	},
	rightButton: {
		marginLeft: 5
	},
	buttonText: {
		marginLeft: Device.isIos() ? 8 : 28,
		marginTop: Device.isIos() ? 0 : -23,
		paddingBottom: Device.isIos() ? 0 : 3,
		fontSize: 15,
		color: colors.blue,
		...fontStyles.normal
	},
	buttonContent: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		justifyContent: 'center'
	},
	buttonIcon: {
		marginTop: 0
	},
	buttonReceive: {
		transform: Device.isIos()
			? [{ rotate: '90deg' }]
			: [{ rotate: '90deg' }, { translateX: ANDROID_OFFSET }, { translateY: ANDROID_OFFSET }]
	},
	menu: {},
	noTopBorder: {
		borderTopWidth: 0
	},
	menuSection: {
		borderTopWidth: 1,
		borderColor: colors.grey100,
		paddingVertical: 10
	},
	menuItem: {
		flex: 1,
		flexDirection: 'row',
		paddingVertical: 9,
		paddingLeft: 17
	},
	selectedRoute: {
		backgroundColor: colors.blue000,
		marginRight: 10,
		borderTopRightRadius: 20,
		borderBottomRightRadius: 20
	},
	selectedName: {
		color: colors.blue
	},
	menuItemName: {
		flex: 1,
		paddingHorizontal: 15,
		paddingTop: 2,
		fontSize: 16,
		color: colors.grey400,
		...fontStyles.normal
	},
	noIcon: {
		paddingLeft: 0
	},
	menuItemIconImage: {
		width: 22,
		height: 22
	},
	bottomModal: {
		justifyContent: 'flex-end',
		margin: 0
	},
	modalView: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 20,
		flexDirection: 'column'
	},
	modalText: {
		fontSize: 18,
		textAlign: 'center',
		...fontStyles.normal
	},
	modalTitle: {
		fontSize: 22,
		marginBottom: 15,
		textAlign: 'center',
		...fontStyles.bold
	},
	secureModalText: {
		textAlign: 'center',
		fontSize: 13,
		...fontStyles.normal
	},
	bold: {
		...fontStyles.bold
	},
	secureModalImage: {
		width: 100,
		height: 100
	},
	importedWrapper: {
		marginTop: 10,
		width: 73,
		paddingHorizontal: 10,
		paddingVertical: 3,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: colors.grey400
	},
	importedText: {
		color: colors.grey400,
		fontSize: 10,
		...fontStyles.bold
	},
	instapayLogo: {
		width: 24,
		height: 24
	}
});
