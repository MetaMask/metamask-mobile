import { StyleSheet } from 'react-native';
import { colors, fontStyles } from '../../../styles/common';
import Device from '../../../util/device';

export default StyleSheet.create({
	wrapper: {
		flex: 1,
		width: 315,
		backgroundColor: colors.white,
	},
	header: {
		paddingTop: Device.isIphoneX() ? 60 : 24,
		backgroundColor: colors.grey000,
		height: Device.isIphoneX() ? 110 : 74,
		flexDirection: 'column',
		paddingBottom: 0,
	},
	metamaskLogo: {
		flexDirection: 'row',
		flex: 1,
		marginTop: Device.isAndroid() ? 0 : 12,
		marginLeft: 15,
		paddingTop: Device.isAndroid() ? 10 : 0,
	},
	metamaskFox: {
		height: 27,
		width: 27,
		marginRight: 15,
	},
	metamaskName: {
		marginTop: 4,
		width: 90,
		height: 18,
	},
	account: {
		flex: 1,
		backgroundColor: colors.grey000,
	},
	accountBgOverlay: {
		borderBottomColor: colors.grey100,
		borderBottomWidth: 1,
		padding: 17,
	},
	identiconWrapper: {
		marginBottom: 12,
		width: 56,
		height: 56,
	},
	identiconBorder: {
		borderRadius: 96,
		borderWidth: 2,
		padding: 2,
		borderColor: colors.blue,
	},
	accountNameWrapper: {
		flexDirection: 'row',
		paddingRight: 17,
	},
	accountName: {
		fontSize: 20,
		lineHeight: 24,
		marginBottom: 5,
		color: colors.fontPrimary,
		...fontStyles.normal,
	},
	caretDown: {
		textAlign: 'right',
		marginLeft: 7,
		marginTop: 3,
		fontSize: 18,
		color: colors.fontPrimary,
	},
	accountBalance: {
		fontSize: 14,
		lineHeight: 17,
		marginBottom: 5,
		color: colors.fontPrimary,
		...fontStyles.normal,
	},
	accountAddress: {
		fontSize: 12,
		lineHeight: 17,
		color: colors.fontSecondary,
		...(fontStyles.normal as any),
	},
	buttons: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		borderBottomColor: colors.grey100,
		borderBottomWidth: 1,
		padding: 15,
	},
	button: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: 30,
		borderWidth: 1.5,
	},
	leftButton: {
		marginRight: 5,
	},
	rightButton: {
		marginLeft: 5,
	},
	buttonText: {
		paddingLeft: 8,
		fontSize: 15,
		color: colors.blue,
		...fontStyles.normal,
	},
	buttonContent: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
	},
	buttonIcon: {
		marginTop: 0,
	},
	buttonReceive: {
		transform: [{ rotate: '90deg' }],
	},
	menu: {},
	noTopBorder: {
		borderTopWidth: 0,
	},
	menuSection: {
		borderTopWidth: 1,
		borderColor: colors.grey100,
		paddingVertical: 10,
	},
	menuItem: {
		flex: 1,
		flexDirection: 'row',
		paddingVertical: 9,
		paddingLeft: 17,
	},
	selectedRoute: {
		backgroundColor: colors.blue000,
		marginRight: 10,
		borderTopRightRadius: 20,
		borderBottomRightRadius: 20,
	},
	selectedName: {
		color: colors.blue,
	},
	menuItemName: {
		flex: 1,
		paddingHorizontal: 15,
		paddingTop: 2,
		fontSize: 16,
		color: colors.grey400,
		...fontStyles.normal,
	},
	menuItemWarningText: {
		color: colors.red,
		fontSize: 12,
		...(fontStyles.normal as any),
	},
	noIcon: {
		paddingLeft: 0,
	},
	menuItemIconImage: {
		width: 22,
		height: 22,
	},
	bottomModal: {
		justifyContent: 'flex-end',
		margin: 0,
	},
	importedWrapper: {
		marginTop: 10,
		width: 73,
		paddingHorizontal: 10,
		paddingVertical: 3,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: colors.grey400,
	},
	importedText: {
		color: colors.grey400,
		fontSize: 10,
		...(fontStyles.bold as any),
	},
	protectWalletContainer: {
		backgroundColor: colors.white,
		paddingTop: 24,
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		paddingVertical: 16,
		paddingBottom: Device.isIphoneX() ? 20 : 0,
		paddingHorizontal: 40,
	},
	protectWalletIconContainer: {
		alignSelf: 'center',
		width: 56,
		height: 56,
		borderRadius: 28,
		backgroundColor: colors.red000,
		borderColor: colors.red,
		borderWidth: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
	},
	protectWalletIcon: { alignSelf: 'center', color: colors.red },
	protectWalletTitle: { textAlign: 'center', fontSize: 18, marginVertical: 8, ...fontStyles.bold },
	protectWalletContent: {
		textAlign: 'center',
		fontSize: 14,
		marginVertical: 8,
		justifyContent: 'center',
		...fontStyles.normal,
	},
	protectWalletButtonWrapper: { marginVertical: 8 },
});
