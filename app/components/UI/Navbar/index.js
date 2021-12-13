/* eslint-disable react/display-name */
import React from 'react';
import NavbarTitle from '../NavbarTitle';
import ModalNavbarTitle from '../ModalNavbarTitle';
import AccountRightButton from '../AccountRightButton';
import NavbarBrowserTitle from '../NavbarBrowserTitle';
import { Alert, Text, TouchableOpacity, View, StyleSheet, Image, Keyboard, InteractionManager } from 'react-native';
import { fontStyles, colors } from '../../../styles/common';
import IonicIcon from 'react-native-vector-icons/Ionicons';
import AntIcon from 'react-native-vector-icons/AntDesign';
import EvilIcons from 'react-native-vector-icons/EvilIcons';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import URL from 'url-parse';
import { strings } from '../../../../locales/i18n';
import AppConstants from '../../../core/AppConstants';
import DeeplinkManager from '../../../core/DeeplinkManager';
import Analytics from '../../../core/Analytics';
import { ANALYTICS_EVENT_OPTS } from '../../../util/analytics';
import { importAccountFromPrivateKey } from '../../../util/address';
import Device from '../../../util/device';
import { isGatewayUrl } from '../../../lib/ens-ipfs/resolver';
import { getHost } from '../../../util/browser';

const { HOMEPAGE_URL } = AppConstants;

const trackEvent = (event) => {
	InteractionManager.runAfterInteractions(() => {
		Analytics.trackEvent(event);
	});
};

const trackEventWithParameters = (event, params) => {
	InteractionManager.runAfterInteractions(() => {
		Analytics.trackEventWithParameters(event, params);
	});
};

const styles = StyleSheet.create({
	headerStyle: {
		shadowColor: colors.transparent,
		elevation: 0,
	},
	metamaskName: {
		width: 122,
		height: 15,
	},
	metamaskFox: {
		width: 40,
		height: 40,
		marginRight: 10,
	},
	backIcon: {
		color: colors.blue,
	},
	backIconIOS: {
		marginHorizontal: 4,
		marginTop: -4,
	},
	shareIconIOS: {
		marginHorizontal: -5,
	},
	hamburgerButton: {
		paddingLeft: Device.isAndroid() ? 22 : 18,
		paddingRight: Device.isAndroid() ? 22 : 18,
		paddingTop: Device.isAndroid() ? 14 : 10,
		paddingBottom: Device.isAndroid() ? 14 : 10,
	},
	backButton: {
		paddingLeft: Device.isAndroid() ? 22 : 18,
		paddingRight: Device.isAndroid() ? 22 : 18,
		marginTop: 5,
	},
	closeButton: {
		paddingHorizontal: Device.isAndroid() ? 22 : 18,
		paddingVertical: Device.isAndroid() ? 14 : 8,
	},
	infoButton: {
		paddingLeft: Device.isAndroid() ? 22 : 18,
		paddingRight: Device.isAndroid() ? 22 : 18,
		marginTop: 5,
	},
	infoIcon: {
		color: colors.blue,
	},
	closeButtonText: {
		color: colors.blue,
		fontSize: 14,
		...fontStyles.normal,
	},
	browserRightButton: {
		flex: 1,
		marginRight: Device.isAndroid() ? 10 : 0,
	},
	disabled: {
		opacity: 0.3,
	},
	optinHeaderLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		marginHorizontal: Device.isIos() ? 20 : 0,
	},
	metamaskNameTransparentWrapper: {
		alignItems: 'center',
		justifyContent: 'center',
		flex: 1,
	},
	metamaskNameWrapper: {
		marginLeft: Device.isAndroid() ? 20 : 0,
	},
	centeredTitle: {
		fontSize: 20,
		color: colors.fontPrimary,
		textAlign: 'center',
		...fontStyles.normal,
		alignItems: 'center',
	},
});

const metamask_name = require('../../../images/metamask-name.png'); // eslint-disable-line
const metamask_fox = require('../../../images/fox.png'); // eslint-disable-line
/**
 * Function that returns the navigation options
 * This is used by views that will show our custom navbar
 * which contains accounts icon, Title or Metamask Logo and current network, and settings icon
 *
 * @param {string} title - Title in string format
 * @param {Object} navigation - Navigation object required to push new views
 * @param {bool} disableNetwork - Boolean that specifies if the network can be changed, defaults to false
 * @returns {Object} - Corresponding navbar options containing headerTitle, headerLeft, headerTruncatedBackTitle and headerRight
 */
export default function getNavbarOptions(title, navigation, disableNetwork = false) {
	function onPress() {
		Keyboard.dismiss();
		navigation.openDrawer();
		trackEvent(ANALYTICS_EVENT_OPTS.COMMON_TAPS_HAMBURGER_MENU);
	}

	return {
		headerTitle: () => <NavbarTitle title={title} disableNetwork={disableNetwork} />,
		headerLeft: () => (
			<TouchableOpacity onPress={onPress} style={styles.backButton}>
				<IonicIcon
					name={Device.isAndroid() ? 'md-menu' : 'ios-menu'}
					size={Device.isAndroid() ? 24 : 28}
					style={styles.backIcon}
				/>
			</TouchableOpacity>
		),
		headerRight: () => <AccountRightButton />,
	};
}

/**
 * Function that returns the navigation options
 * This is used by views that will show our custom navbar which contains Title
 *
 * @param {string} title - Title in string format
 * @param {Object} navigation - Navigation object required to push new views
 * @returns {Object} - Corresponding navbar options containing title and headerTitleStyle
 */
export function getNavigationOptionsTitle(title, navigation, isFullScreenModal) {
	function navigationPop() {
		navigation.pop();
	}
	return {
		title,
		headerTitleStyle: {
			fontSize: 20,
			color: colors.fontPrimary,
			...fontStyles.normal,
		},
		headerTintColor: colors.blue,
		headerRight: () =>
			isFullScreenModal ? (
				<TouchableOpacity onPress={navigationPop} style={styles.closeButton}>
					<IonicIcon name={'ios-close'} size={38} style={[styles.backIcon, styles.backIconIOS]} />
				</TouchableOpacity>
			) : null,
		headerLeft: () =>
			isFullScreenModal ? null : (
				<TouchableOpacity onPress={navigationPop} style={styles.backButton} testID={'title-back-arrow-button'}>
					<IonicIcon
						name={Device.isAndroid() ? 'md-arrow-back' : 'ios-arrow-back'}
						size={Device.isAndroid() ? 24 : 28}
						style={styles.backIcon}
					/>
				</TouchableOpacity>
			),
	};
}

/**
 * Function that returns the navigation options
 * This is used by contact form
 *
 * @param {string} title - Title in string format
 * @param {Object} navigation - Navigation object required to push new views
 * @returns {Object} - Corresponding navbar options
 */
export function getEditableOptions(title, navigation, route) {
	function navigationPop() {
		navigation.pop();
	}
	const rightAction = route.params?.dispatch;
	const editMode = route.params?.editMode === 'edit';
	const addMode = route.params?.mode === 'add';
	return {
		title,
		headerTitleStyle: {
			fontSize: 20,
			color: colors.fontPrimary,
			...fontStyles.normal,
		},
		headerTintColor: colors.blue,
		headerLeft: () => (
			<TouchableOpacity onPress={navigationPop} style={styles.backButton} testID={'edit-contact-back-button'}>
				<IonicIcon
					name={Device.isAndroid() ? 'md-arrow-back' : 'ios-arrow-back'}
					size={Device.isAndroid() ? 24 : 28}
					style={styles.backIcon}
				/>
			</TouchableOpacity>
		),
		headerRight: () =>
			!addMode ? (
				<TouchableOpacity onPress={rightAction} style={styles.backButton}>
					<Text style={styles.closeButtonText}>
						{editMode ? strings('address_book.edit') : strings('address_book.cancel')}
					</Text>
				</TouchableOpacity>
			) : (
				<View />
			),
	};
}

/**
 * Function that returns the navigation options
 * This is used by payment request view showing close and back buttons
 *
 * @param {string} title - Title in string format
 * @param {Object} navigation - Navigation object required to push new views
 * @returns {Object} - Corresponding navbar options containing title, headerLeft and headerRight
 */
export function getPaymentRequestOptionsTitle(title, navigation, route) {
	const goBack = route.params?.dispatch;
	return {
		title,
		headerTitleStyle: {
			fontSize: 20,
			color: colors.fontPrimary,
			...fontStyles.normal,
		},
		headerTintColor: colors.blue,
		headerLeft: () =>
			goBack ? (
				// eslint-disable-next-line react/jsx-no-bind
				<TouchableOpacity
					onPress={goBack}
					style={styles.backButton}
					testID={'request-search-asset-back-button'}
				>
					<IonicIcon
						name={Device.isAndroid() ? 'md-arrow-back' : 'ios-arrow-back'}
						size={Device.isAndroid() ? 24 : 28}
						style={styles.backIcon}
					/>
				</TouchableOpacity>
			) : (
				<View />
			),
		headerRight: () => (
			// eslint-disable-next-line react/jsx-no-bind
			<TouchableOpacity onPress={() => navigation.pop()} style={styles.closeButton}>
				<IonicIcon name={'ios-close'} size={38} style={[styles.backIcon, styles.backIconIOS]} />
			</TouchableOpacity>
		),
	};
}

/**
 * Function that returns the navigation options
 * This is used by payment request view showing close button
 *
 * @returns {Object} - Corresponding navbar options containing title, and headerRight
 */
export function getPaymentRequestSuccessOptionsTitle(navigation) {
	return {
		headerStyle: {
			shadowColor: colors.transparent,
			elevation: 0,
			backgroundColor: colors.white,
			borderBottomWidth: 0,
		},
		title: null,
		headerTintColor: colors.blue,
		headerLeft: () => <View />,
		headerRight: () => (
			<TouchableOpacity
				// eslint-disable-next-line react/jsx-no-bind
				onPress={() => navigation.pop()}
				style={styles.closeButton}
				testID={'send-link-close-button'}
			>
				<IonicIcon name="ios-close" size={38} style={[styles.backIcon, styles.backIconIOS]} />
			</TouchableOpacity>
		),
	};
}

/**
 * Function that returns the navigation options
 * This is used by views that confirms transactions, showing current network
 *
 * @param {string} title - Title in string format
 * @returns {Object} - Corresponding navbar options containing title and headerTitleStyle
 */
export function getTransactionOptionsTitle(_title, navigation, route) {
	const transactionMode = route.params?.mode ?? '';
	const { name } = route;
	const leftText = transactionMode === 'edit' ? strings('transaction.cancel') : strings('transaction.edit');
	const disableModeChange = route.params?.disableModeChange;
	const modeChange = route.params?.dispatch;
	const leftAction = () => modeChange('edit');
	const rightAction = () => navigation.pop();
	const rightText = strings('transaction.cancel');
	const title = transactionMode === 'edit' ? 'transaction.edit' : _title;
	return {
		headerTitle: () => <NavbarTitle title={title} disableNetwork />,
		headerLeft: () =>
			transactionMode !== 'edit' ? (
				<TouchableOpacity
					disabled={disableModeChange}
					// eslint-disable-next-line react/jsx-no-bind
					onPress={leftAction}
					style={styles.closeButton}
					testID={'confirm-txn-edit-button'}
				>
					<Text
						style={disableModeChange ? [styles.closeButtonText, styles.disabled] : [styles.closeButtonText]}
					>
						{leftText}
					</Text>
				</TouchableOpacity>
			) : (
				<View />
			),
		headerRight: () =>
			name === 'Send' ? (
				// eslint-disable-next-line react/jsx-no-bind
				<TouchableOpacity onPress={rightAction} style={styles.closeButton} testID={'send-back-button'}>
					<Text style={styles.closeButtonText}>{rightText}</Text>
				</TouchableOpacity>
			) : (
				<View />
			),
	};
}

export function getApproveNavbar(title) {
	return {
		headerTitle: () => <NavbarTitle title={title} disableNetwork />,
		headerLeft: () => <View />,
		headerRight: () => <View />,
	};
}

/**
 * Function that returns the navigation options
 * This is used by views in send flow
 *
 * @param {string} title - Title in string format
 * @returns {Object} - Corresponding navbar options containing title and headerTitleStyle
 */
export function getSendFlowTitle(title, navigation, route) {
	const rightAction = () => {
		const providerType = route.params?.providerType ?? '';
		trackEventWithParameters(ANALYTICS_EVENT_OPTS.SEND_FLOW_CANCEL, {
			view: title.split('.')[1],
			network: providerType,
		});
		navigation.dangerouslyGetParent()?.pop();
	};
	const leftAction = () => navigation.pop();

	const canGoBack = title !== 'send.send_to' && !route?.params?.isPaymentRequest;

	const titleToRender = title;

	return {
		headerTitle: () => <NavbarTitle title={titleToRender} disableNetwork />,
		headerRight: () => (
			// eslint-disable-next-line react/jsx-no-bind
			<TouchableOpacity onPress={rightAction} style={styles.closeButton} testID={'send-cancel-button'}>
				<Text style={styles.closeButtonText}>{strings('transaction.cancel')}</Text>
			</TouchableOpacity>
		),
		headerLeft: () =>
			canGoBack ? (
				// eslint-disable-next-line react/jsx-no-bind
				<TouchableOpacity onPress={leftAction} style={styles.closeButton}>
					<Text style={styles.closeButtonText}>{strings('transaction.back')}</Text>
				</TouchableOpacity>
			) : (
				<View />
			),
	};
}

/**
 * Function that returns the navigation options
 * This is used by views that will show our custom navbar
 * which contains accounts icon, Title or Metamask Logo and current network, and settings icon
 *
 * @param {Object} navigation - Navigation object required to push new views
 * @returns {Object} - Corresponding navbar options containing headerTitle, headerLeft and headerRight
 */
export function getBrowserViewNavbarOptions(navigation, route) {
	const url = route.params?.url ?? '';
	let host = null;
	let isHttps = false;

	const isHomepage = (url) => getHost(url) === getHost(HOMEPAGE_URL);
	const error = route.params?.error ?? '';
	const icon = route.params?.icon;

	if (url && !isHomepage(url)) {
		isHttps = url && url.toLowerCase().substr(0, 6) === 'https:';
		const urlObj = new URL(url);
		//Using host so the port number will be displayed on the address bar
		host = urlObj.host.toLowerCase().replace(/^www\./, '');
		if (isGatewayUrl(urlObj) && url.search(`${AppConstants.IPFS_OVERRIDE_PARAM}=false`) === -1) {
			const ensUrl = route.params?.currentEnsName ?? '';
			if (ensUrl) {
				host = ensUrl.toLowerCase().replace(/^www\./, '');
			}
		}
	} else {
		host = strings('browser.title');
	}

	function onPress() {
		Keyboard.dismiss();
		navigation.openDrawer();
		trackEvent(ANALYTICS_EVENT_OPTS.COMMON_TAPS_HAMBURGER_MENU);
	}

	return {
		gestureEnabled: false,
		headerLeft: () => (
			<TouchableOpacity onPress={onPress} style={styles.hamburgerButton} testID={'hamburger-menu-button-browser'}>
				<IonicIcon
					name={Device.isAndroid() ? 'md-menu' : 'ios-menu'}
					size={Device.isAndroid() ? 24 : 28}
					style={styles.backIcon}
				/>
			</TouchableOpacity>
		),
		headerTitle: () => (
			<NavbarBrowserTitle
				error={!!error}
				icon={url && !isHomepage(url) ? icon : null}
				navigation={navigation}
				route={route}
				url={url}
				hostname={host}
				https={isHttps}
			/>
		),
		headerRight: () => (
			<View style={styles.browserRightButton}>
				<AccountRightButton />
			</View>
		),
	};
}

/**
 * Function that returns the navigation options
 * for our modals
 *
 * @param {string} title - Title in string format
 * @returns {Object} - Corresponding navbar options containing headerTitle
 */
export function getModalNavbarOptions(title) {
	return {
		headerTitle: () => <ModalNavbarTitle title={title} />,
	};
}

/**
 * Function that returns the navigation options
 * for our onboarding screens,
 * which is just the metamask log and the Back button
 *
 * @returns {Object} - Corresponding navbar options containing headerTitle, headerTitle and headerTitle
 */
export function getOnboardingNavbarOptions(navigation, route, { headerLeft } = {}) {
	const headerLeftHide = headerLeft || route.params?.headerLeft;

	return {
		headerStyle: {
			shadowColor: colors.transparent,
			elevation: 0,
			backgroundColor: colors.white,
			borderBottomWidth: 0,
		},
		headerTitle: () => (
			<View style={styles.metamaskNameTransparentWrapper}>
				<Image source={metamask_name} style={styles.metamaskName} resizeMethod={'auto'} />
			</View>
		),
		headerBackTitle: strings('navigation.back'),
		headerRight: () => <View />,
		headerLeft: headerLeftHide,
	};
}

/**
 * Function that returns a transparent navigation options for our onboarding screens.
 *
 * @returns {Object} - Corresponding navbar options containing headerTitle
 */
export function getTransparentOnboardingNavbarOptions() {
	return {
		headerTitle: () => (
			<View style={styles.metamaskNameTransparentWrapper}>
				<Image source={metamask_name} style={styles.metamaskName} resizeMethod={'auto'} />
			</View>
		),
		headerLeft: () => <View />,
		headerRight: () => <View />,
		headerStyle: styles.headerStyle,
	};
}

/**
 * Function that returns a transparent navigation options for our onboarding screens.
 *
 * @returns {Object} - Corresponding navbar options containing headerTitle and a back button
 */
export function getTransparentBackOnboardingNavbarOptions() {
	return {
		headerTitle: () => (
			<View style={styles.metamaskNameTransparentWrapper}>
				<Image source={metamask_name} style={styles.metamaskName} resizeMethod={'auto'} />
			</View>
		),
		headerBackTitle: strings('navigation.back'),
		headerRight: () => <View />,
		headerStyle: styles.headerStyle,
	};
}

/**
 * Function that returns the navigation options
 * for our metric opt-in screen
 *
 * @returns {Object} - Corresponding navbar options containing headerLeft
 */
export function getOptinMetricsNavbarOptions() {
	return {
		headerStyle: {
			shadowColor: colors.transparent,
			elevation: 0,
			backgroundColor: colors.white,
			borderBottomWidth: 0,
			height: 100,
		},
		title: null,
		headerLeft: () => (
			<View style={styles.optinHeaderLeft}>
				<View style={styles.metamaskNameWrapper}>
					<Image source={metamask_fox} style={styles.metamaskFox} resizeMethod={'auto'} />
				</View>
				<View style={styles.metamaskNameWrapper}>
					<Image source={metamask_name} style={styles.metamaskName} resizeMethod={'auto'} />
				</View>
			</View>
		),
	};
}
/**
 * Function that returns the navigation options
 * for our closable screens,
 *
 * @returns {Object} - Corresponding navbar options containing headerTitle, headerTitle and headerTitle
 */
export function getClosableNavigationOptions(title, backButtonText, navigation) {
	function navigationPop() {
		navigation.pop();
	}
	return {
		title,
		headerTitleStyle: {
			fontSize: 20,
			...fontStyles.normal,
		},
		headerLeft: () =>
			Device.isIos() ? (
				<TouchableOpacity onPress={navigationPop} style={styles.closeButton} testID={'nav-ios-back'}>
					<Text style={styles.closeButtonText}>{backButtonText}</Text>
				</TouchableOpacity>
			) : (
				<TouchableOpacity onPress={navigationPop} style={styles.backButton} testID={'nav-android-back'}>
					<IonicIcon name={'md-arrow-back'} size={24} style={styles.backIcon} />
				</TouchableOpacity>
			),
	};
}

/**
 * Function that returns the navigation options
 * for our closable screens,
 *
 * @returns {Object} - Corresponding navbar options containing headerTitle, headerTitle and headerTitle
 */
export function getOfflineModalNavbar() {
	return {
		headerShown: false,
	};
}

/**
 * Function that returns the navigation options
 * for our wallet screen,
 *
 * @returns {Object} - Corresponding navbar options containing headerTitle, headerTitle and headerTitle
 */
export function getWalletNavbarOptions(title, navigation) {
	const onScanSuccess = (data, content) => {
		if (data.private_key) {
			Alert.alert(
				strings('wallet.private_key_detected'),
				strings('wallet.do_you_want_to_import_this_account'),
				[
					{
						text: strings('wallet.cancel'),
						onPress: () => false,
						style: 'cancel',
					},
					{
						text: strings('wallet.yes'),
						onPress: async () => {
							try {
								await importAccountFromPrivateKey(data.private_key);
								navigation.navigate('ImportPrivateKeyView', { screen: 'ImportPrivateKeySuccess' });
							} catch (e) {
								Alert.alert(
									strings('import_private_key.error_title'),
									strings('import_private_key.error_message')
								);
							}
						},
					},
				],
				{ cancelable: false }
			);
		} else if (data.seed) {
			Alert.alert(strings('wallet.error'), strings('wallet.logout_to_import_seed'));
		} else {
			setTimeout(() => {
				DeeplinkManager.parse(content, { origin: AppConstants.DEEPLINKS.ORIGIN_QR_CODE });
			}, 500);
		}
	};

	function openDrawer() {
		navigation.openDrawer();
		trackEvent(ANALYTICS_EVENT_OPTS.COMMON_TAPS_HAMBURGER_MENU);
	}

	function openQRScanner() {
		navigation.navigate('QRScanner', {
			onScanSuccess,
		});
		trackEvent(ANALYTICS_EVENT_OPTS.WALLET_QR_SCANNER);
	}

	return {
		headerTitle: () => <NavbarTitle title={title} />,
		headerLeft: () => (
			<TouchableOpacity onPress={openDrawer} style={styles.backButton} testID={'hamburger-menu-button-wallet'}>
				<IonicIcon
					name={Device.isAndroid() ? 'md-menu' : 'ios-menu'}
					size={Device.isAndroid() ? 24 : 28}
					style={styles.backIcon}
				/>
			</TouchableOpacity>
		),
		headerRight: () => (
			<TouchableOpacity
				style={styles.infoButton}
				// eslint-disable-next-line
				onPress={openQRScanner}
			>
				<AntIcon name="scan1" size={28} style={styles.infoIcon} />
			</TouchableOpacity>
		),
	};
}

/**
 * Function that returns the navigation options containing title and network indicator
 *
 * @param {string} title - Title in string format
 * @param {string} translate - Boolean that specifies if the title needs translation
 * @param {Object} navigation - Navigation object required to push new views
 * @returns {Object} - Corresponding navbar options containing headerTitle and headerTitle
 */
export function getNetworkNavbarOptions(title, translate, navigation) {
	return {
		headerTitle: () => <NavbarTitle title={title} translate={translate} />,
		headerLeft: () => (
			// eslint-disable-next-line react/jsx-no-bind
			<TouchableOpacity onPress={() => navigation.pop()} style={styles.backButton} testID={'asset-back-button'}>
				<IonicIcon
					name={Device.isAndroid() ? 'md-arrow-back' : 'ios-arrow-back'}
					size={Device.isAndroid() ? 24 : 28}
					style={styles.backIcon}
				/>
			</TouchableOpacity>
		),
		headerRight: () => <View />,
	};
}

/**
 * Function that returns the navigation options containing title and network indicator
 *
 * @returns {Object} - Corresponding navbar options containing headerTitle and headerTitle
 */
export function getWebviewNavbar(navigation, route) {
	const title = route.params?.title ?? '';
	const share = route.params?.dispatch;
	return {
		headerTitle: () => <Text style={styles.centeredTitle}>{title}</Text>,
		headerLeft: () =>
			Device.isAndroid() ? (
				// eslint-disable-next-line react/jsx-no-bind
				<TouchableOpacity onPress={() => navigation.pop()} style={styles.backButton}>
					<IonicIcon name={'md-arrow-back'} size={24} style={styles.backIcon} />
				</TouchableOpacity>
			) : (
				// eslint-disable-next-line react/jsx-no-bind
				<TouchableOpacity onPress={() => navigation.pop()} style={styles.backButton}>
					<IonicIcon name="ios-close" size={38} style={[styles.backIcon, styles.backIconIOS]} />
				</TouchableOpacity>
			),
		headerRight: () =>
			Device.isAndroid() ? (
				<TouchableOpacity onPress={share} style={styles.backButton}>
					<MaterialCommunityIcon name="share-variant" size={24} style={styles.backIcon} />
				</TouchableOpacity>
			) : (
				<TouchableOpacity onPress={share} style={styles.backButton}>
					<EvilIcons name="share-apple" size={32} style={[styles.backIcon, styles.shareIconIOS]} />
				</TouchableOpacity>
			),
	};
}

export function getPaymentSelectorMethodNavbar(navigation, onPop) {
	return {
		headerTitle: () => <Text style={styles.centeredTitle}>{strings('fiat_on_ramp.purchase_method')}</Text>,
		headerLeft: () => <View />,
		headerRight: () => (
			// eslint-disable-next-line react/jsx-no-bind
			<TouchableOpacity
				onPress={() => {
					navigation.dangerouslyGetParent()?.pop();
					onPop?.();
				}}
				style={styles.closeButton}
			>
				<Text style={styles.closeButtonText}>{strings('navigation.cancel')}</Text>
			</TouchableOpacity>
		),
	};
}

export function getPaymentMethodApplePayNavbar(navigation, onPop, onExit) {
	return {
		title: strings('fiat_on_ramp.amount_to_buy'),
		headerTitleStyle: {
			fontSize: 20,
			color: colors.fontPrimary,
			...fontStyles.normal,
		},
		headerRight: () => (
			// eslint-disable-next-line react/jsx-no-bind
			<TouchableOpacity
				onPress={() => {
					navigation.dangerouslyGetParent()?.pop();
					onExit?.();
				}}
				style={styles.closeButton}
			>
				<Text style={styles.closeButtonText}>{strings('navigation.cancel')}</Text>
			</TouchableOpacity>
		),
		headerLeft: () =>
			Device.isAndroid() ? (
				// eslint-disable-next-line react/jsx-no-bind
				<TouchableOpacity
					onPress={() => {
						navigation.pop();
						onPop?.();
					}}
					style={styles.backButton}
				>
					<IonicIcon name={'md-arrow-back'} size={24} style={styles.backIcon} />
				</TouchableOpacity>
			) : (
				// eslint-disable-next-line react/jsx-no-bind
				<TouchableOpacity
					onPress={() => {
						navigation.pop();
						onPop?.();
					}}
					style={styles.closeButton}
				>
					<Text style={styles.closeButtonText}>{strings('navigation.back')}</Text>
				</TouchableOpacity>
			),
	};
}

export function getTransakWebviewNavbar(navigation, route, onPop) {
	const title = route.params?.title ?? '';
	return {
		title,
		headerTitleStyle: {
			fontSize: 20,
			color: colors.fontPrimary,
			...fontStyles.normal,
		},
		headerLeft: () =>
			Device.isAndroid() ? (
				// eslint-disable-next-line react/jsx-no-bind
				<TouchableOpacity
					onPress={() => {
						navigation.pop();
						onPop?.();
					}}
					style={styles.backButton}
				>
					<IonicIcon name={'md-arrow-back'} size={24} style={styles.backIcon} />
				</TouchableOpacity>
			) : (
				// eslint-disable-next-line react/jsx-no-bind
				<TouchableOpacity
					onPress={() => {
						navigation.pop();
						onPop?.();
					}}
					style={styles.backButton}
				>
					<IonicIcon name="ios-close" size={38} style={[styles.backIcon, styles.backIconIOS]} />
				</TouchableOpacity>
			),
	};
}

export function getSwapsAmountNavbar(navigation, route) {
	const title = route.params?.title ?? 'Swap';
	return {
		headerTitle: () => <NavbarTitle title={title} disableNetwork translate={false} />,
		headerLeft: () => <View />,
		headerRight: () => (
			// eslint-disable-next-line react/jsx-no-bind
			<TouchableOpacity onPress={() => navigation.dangerouslyGetParent()?.pop()} style={styles.closeButton}>
				<Text style={styles.closeButtonText}>{strings('navigation.cancel')}</Text>
			</TouchableOpacity>
		),
	};
}
export function getSwapsQuotesNavbar(navigation, route) {
	const title = route.params?.title ?? 'Swap';
	const leftActionText = route.params?.leftAction ?? strings('navigation.back');

	const leftAction = () => {
		const trade = route.params?.requestedTrade;
		const selectedQuote = route.params?.selectedQuote;
		const quoteBegin = route.params?.quoteBegin;
		if (!selectedQuote) {
			InteractionManager.runAfterInteractions(() => {
				Analytics.trackEventWithParameters(ANALYTICS_EVENT_OPTS.QUOTES_REQUEST_CANCELLED, {
					...trade,
					responseTime: new Date().getTime() - quoteBegin,
				});
			});
		}
		navigation.pop();
	};

	const rightAction = () => {
		const trade = route.params?.requestedTrade;
		const selectedQuote = route.params?.selectedQuote;
		const quoteBegin = route.params?.quoteBegin;
		if (!selectedQuote) {
			InteractionManager.runAfterInteractions(() => {
				Analytics.trackEventWithParameters(ANALYTICS_EVENT_OPTS.QUOTES_REQUEST_CANCELLED, {
					...trade,
					responseTime: new Date().getTime() - quoteBegin,
				});
			});
		}
		navigation.dangerouslyGetParent()?.pop();
	};

	return {
		headerTitle: () => <NavbarTitle title={title} disableNetwork translate={false} />,
		headerLeft: () =>
			Device.isAndroid() ? (
				// eslint-disable-next-line react/jsx-no-bind
				<TouchableOpacity onPress={leftAction} style={styles.backButton}>
					<IonicIcon name={'md-arrow-back'} size={24} style={styles.backIcon} />
				</TouchableOpacity>
			) : (
				// eslint-disable-next-line react/jsx-no-bind
				<TouchableOpacity onPress={leftAction} style={styles.closeButton}>
					<Text style={styles.closeButtonText}>{leftActionText}</Text>
				</TouchableOpacity>
			),
		headerRight: () => (
			// eslint-disable-next-line react/jsx-no-bind
			<TouchableOpacity onPress={rightAction} style={styles.closeButton}>
				<Text style={styles.closeButtonText}>{strings('navigation.cancel')}</Text>
			</TouchableOpacity>
		),
	};
}
