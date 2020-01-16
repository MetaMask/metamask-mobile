import React from 'react';
import NavbarTitle from '../NavbarTitle';
import ModalNavbarTitle from '../ModalNavbarTitle';
import AccountRightButton from '../AccountRightButton';
import NavbarBrowserTitle from '../NavbarBrowserTitle';
import {
	Alert,
	Text,
	Platform,
	TouchableOpacity,
	View,
	StyleSheet,
	Image,
	Keyboard,
	InteractionManager
} from 'react-native';
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
import ANALYTICS_EVENT_OPTS from '../../../util/analytics';
import { importAccountFromPrivateKey } from '../../../util/address';
import { isGatewayUrl } from '../../../lib/ens-ipfs/resolver';
import { getHost } from '../../../util/browser';

const { HOMEPAGE_URL } = AppConstants;

const trackEvent = event => {
	InteractionManager.runAfterInteractions(() => {
		Analytics.trackEvent(event);
	});
};

const styles = StyleSheet.create({
	rightButton: {
		marginTop: 7,
		marginRight: 12,
		marginBottom: 12
	},
	metamaskName: {
		width: 122,
		height: 15
	},
	metamaskFox: {
		width: 40,
		height: 40,
		marginRight: 10
	},
	closeIcon: {
		paddingLeft: Platform.OS === 'android' ? 22 : 18,
		color: colors.blue
	},
	backIcon: {
		color: colors.blue
	},
	backIconIOS: {
		marginHorizontal: 5
	},
	shareIconIOS: {
		marginHorizontal: -5
	},
	backButton: {
		paddingLeft: Platform.OS === 'android' ? 22 : 18,
		paddingRight: Platform.OS === 'android' ? 22 : 18,
		marginTop: 5
	},
	closeButton: {
		paddingHorizontal: Platform.OS === 'android' ? 22 : 18
	},
	infoButton: {
		paddingLeft: Platform.OS === 'android' ? 22 : 18,
		paddingRight: Platform.OS === 'android' ? 22 : 18,
		marginTop: 5
	},
	infoIcon: {
		color: colors.blue
	},
	moreIcon: {
		marginTop: 5
	},
	flex: {
		flex: 1
	},
	closeButtonText: {
		color: colors.blue,
		fontSize: 14,
		...fontStyles.normal
	},
	title: {
		fontSize: 18,
		...fontStyles.normal
	},
	titleWrapper: {
		alignItems: 'center',
		flex: 1
	},
	browserRightButton: {
		flex: 1,
		marginRight: Platform.OS === 'android' ? 10 : 0
	},
	tabIconAndroidWrapper: {
		alignItems: 'center',
		width: 36,
		marginLeft: 5
	},
	disabled: {
		opacity: 0.3
	},
	optinHeaderLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		marginHorizontal: Platform.OS === 'ios' ? 20 : 0
	},
	tabIconAndroid: {
		marginTop: 13,
		marginLeft: 0,
		marginRight: 3,
		width: 24,
		height: 24
	},
	metamaskNameTransparentWrapper: {
		alignItems: 'center',
		flex: 1
	},
	metamaskNameWrapper: {
		marginLeft: Platform.OS === 'android' ? 20 : 0
	}
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
		headerTitle: <NavbarTitle title={title} disableNetwork={disableNetwork} />,
		headerLeft: (
			<TouchableOpacity onPress={onPress} style={styles.backButton}>
				<IonicIcon
					name={Platform.OS === 'android' ? 'md-menu' : 'ios-menu'}
					size={Platform.OS === 'android' ? 24 : 28}
					style={styles.backIcon}
				/>
			</TouchableOpacity>
		),
		headerRight: <AccountRightButton />
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
export function getNavigationOptionsTitle(title, navigation) {
	function navigationPop() {
		navigation.pop();
	}
	return {
		title,
		headerTitleStyle: {
			fontSize: 20,
			color: colors.fontPrimary,
			...fontStyles.normal
		},
		headerTintColor: colors.blue,
		headerLeft: (
			<TouchableOpacity onPress={navigationPop} style={styles.backButton}>
				<IonicIcon
					name={Platform.OS === 'android' ? 'md-arrow-back' : 'ios-arrow-back'}
					size={Platform.OS === 'android' ? 24 : 28}
					style={styles.backIcon}
				/>
			</TouchableOpacity>
		)
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
export function getPaymentRequestOptionsTitle(title, navigation) {
	const goBack = navigation.getParam('dispatch', undefined);
	return {
		title,
		headerTitleStyle: {
			fontSize: 20,
			color: colors.fontPrimary,
			...fontStyles.normal
		},
		headerTintColor: colors.blue,
		headerLeft: goBack ? (
			// eslint-disable-next-line react/jsx-no-bind
			<TouchableOpacity
				onPress={() => goBack()}
				style={styles.backButton}
				testID={'request-search-asset-back-button'}
			>
				<IonicIcon
					name={Platform.OS === 'android' ? 'md-arrow-back' : 'ios-arrow-back'}
					size={Platform.OS === 'android' ? 24 : 28}
					style={styles.backIcon}
				/>
			</TouchableOpacity>
		) : (
			<View />
		),
		headerRight: (
			// eslint-disable-next-line react/jsx-no-bind
			<TouchableOpacity onPress={() => navigation.pop()} style={styles.closeButton}>
				<IonicIcon name={'ios-close'} size={38} style={styles.backIcon} />
			</TouchableOpacity>
		)
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
			borderBottomWidth: 0
		},
		headerTintColor: colors.blue,
		headerLeft: <View />,
		headerRight: (
			// eslint-disable-next-line react/jsx-no-bind
			<TouchableOpacity
				onPress={() => navigation.pop()}
				style={styles.closeButton}
				testID={'send-link-close-button'}
			>
				<IonicIcon name="ios-close" size={38} style={[styles.backIcon, styles.backIconIOS]} />
			</TouchableOpacity>
		)
	};
}

/**
 * Function that returns the navigation options
 * This is used by views that confirms transactions, showing current network
 *
 * @param {string} title - Title in string format
 * @returns {Object} - Corresponding navbar options containing title and headerTitleStyle
 */
export function getTransactionOptionsTitle(title, navigation) {
	const transactionMode = navigation.getParam('mode', '');
	const leftText = transactionMode === 'edit' ? strings('transaction.cancel') : strings('transaction.edit');
	const toEditLeftAction = navigation.getParam('dispatch', () => {
		'';
	});
	const leftAction = transactionMode === 'edit' ? () => navigation.pop() : () => toEditLeftAction('edit');
	return {
		headerTitle: <NavbarTitle title={title} disableNetwork />,
		headerLeft: (
			// eslint-disable-next-line react/jsx-no-bind
			<TouchableOpacity onPress={leftAction} style={styles.closeButton} testID={'confirm-txn-edit-button'}>
				<Text style={styles.closeButtonText}>{leftText}</Text>
			</TouchableOpacity>
		),
		headerRight: <View />
	};
}

/**
 * Function that returns the navigation options
 * This is used by views in send flow
 *
 * @param {string} title - Title in string format
 * @returns {Object} - Corresponding navbar options containing title and headerTitleStyle
 */
export function getSendFlowTitle(title, navigation) {
	const rightAction = () => navigation.dismiss();
	const leftAction = () => navigation.pop();
	const canGoBack = title !== 'send.send_to';
	return {
		headerTitle: <NavbarTitle title={title} disableNetwork />,
		headerRight: (
			// eslint-disable-next-line react/jsx-no-bind
			<TouchableOpacity onPress={rightAction} style={styles.closeButton}>
				<Text style={styles.closeButtonText}>{'Cancel'}</Text>
			</TouchableOpacity>
		),
		headerLeft: canGoBack ? (
			// eslint-disable-next-line react/jsx-no-bind
			<TouchableOpacity onPress={leftAction} style={styles.closeButton}>
				<Text style={styles.closeButtonText}>{'Back'}</Text>
			</TouchableOpacity>
		) : (
			<View />
		)
	};
}

/**
 * Function that returns the navigation options for InstaPay screend
 *
 * @param {string} title - Title name to use with strings
 * @returns {Object} - Corresponding navbar options containing title and headerTitleStyle
 */
export function getInstaPayNavigations(title, navigation) {
	return {
		headerTitle: <NavbarTitle title={title} disableNetwork />,
		headerLeft: (
			// eslint-disable-next-line react/jsx-no-bind
			<TouchableOpacity onPress={() => navigation.pop()} style={styles.backButton}>
				<IonicIcon
					name={Platform.OS === 'android' ? 'md-arrow-back' : 'ios-arrow-back'}
					size={Platform.OS === 'android' ? 24 : 28}
					style={styles.backIcon}
				/>
			</TouchableOpacity>
		),
		headerRight: <View />
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
export function getBrowserViewNavbarOptions(navigation) {
	const url = navigation.getParam('url', '');
	let hostname = null;
	let isHttps = false;

	const isHomepage = url => getHost(url) === getHost(HOMEPAGE_URL);

	if (url && !isHomepage(url)) {
		isHttps = url && url.toLowerCase().substr(0, 6) === 'https:';
		const urlObj = new URL(url);
		hostname = urlObj.hostname.toLowerCase().replace('www.', '');
		if (isGatewayUrl(urlObj) && url.search(`${AppConstants.IPFS_OVERRIDE_PARAM}=false`) === -1) {
			const ensUrl = navigation.getParam('currentEnsName', '');
			if (ensUrl) {
				hostname = ensUrl.toLowerCase().replace('www.', '');
			}
		}
	} else {
		hostname = strings('browser.title');
	}

	function onPress() {
		Keyboard.dismiss();
		navigation.openDrawer();
		trackEvent(ANALYTICS_EVENT_OPTS.COMMON_TAPS_HAMBURGER_MENU);
	}

	return {
		headerLeft: (
			<TouchableOpacity onPress={onPress} style={styles.backButton} testID={'hamburger-menu-button-browser'}>
				<IonicIcon
					name={Platform.OS === 'android' ? 'md-menu' : 'ios-menu'}
					size={Platform.OS === 'android' ? 24 : 28}
					style={styles.backIcon}
				/>
			</TouchableOpacity>
		),
		headerTitle: <NavbarBrowserTitle navigation={navigation} url={url} hostname={hostname} https={isHttps} />,
		headerRight: (
			<View style={styles.browserRightButton}>
				<AccountRightButton />
			</View>
		)
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
		headerTitle: <ModalNavbarTitle title={title} />
	};
}

/**
 * Function that returns the navigation options
 * for our onboarding screens,
 * which is just the metamask log and the Back button
 *
 * @returns {Object} - Corresponding navbar options containing headerTitle, headerTitle and headerTitle
 */
export function getOnboardingNavbarOptions() {
	return {
		headerStyle: {
			shadowColor: colors.transparent,
			elevation: 0,
			backgroundColor: colors.white,
			borderBottomWidth: 0
		},
		headerTitle: (
			<View style={styles.metamaskNameWrapper}>
				<Image source={metamask_name} style={styles.metamaskName} resizeMethod={'auto'} />
			</View>
		),
		headerBackTitle: strings('navigation.back')
	};
}

/**
 * Function that returns a transparent navigation options for our onboarding screens.
 *
 * @returns {Object} - Corresponding navbar options containing headerTitle
 */
export function getTransparentOnboardingNavbarOptions() {
	return {
		headerTransparent: true,
		headerTitle: (
			<View style={styles.metamaskNameTransparentWrapper}>
				<Image source={metamask_name} style={styles.metamaskName} resizeMethod={'auto'} />
			</View>
		),
		headerLeft: <View />,
		headerRight: <View />
	};
}

/**
 * Function that returns a transparent navigation options for our onboarding screens.
 *
 * @returns {Object} - Corresponding navbar options containing headerTitle and a back button
 */
export function getTransparentBackOnboardingNavbarOptions() {
	return {
		headerTransparent: true,
		headerTitle: (
			<View style={styles.metamaskNameTransparentWrapper}>
				<Image source={metamask_name} style={styles.metamaskName} resizeMethod={'auto'} />
			</View>
		),
		headerBackTitle: strings('navigation.back'),
		headerRight: <View />
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
			height: 100
		},
		headerLeft: (
			<View style={styles.optinHeaderLeft}>
				<View style={styles.metamaskNameWrapper}>
					<Image source={metamask_fox} style={styles.metamaskFox} resizeMethod={'auto'} />
				</View>
				<View style={styles.metamaskNameWrapper}>
					<Image source={metamask_name} style={styles.metamaskName} resizeMethod={'auto'} />
				</View>
			</View>
		)
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
			...fontStyles.normal
		},
		headerLeft:
			Platform.OS === 'ios' ? (
				<TouchableOpacity onPress={navigationPop} style={styles.closeButton}>
					<Text style={styles.closeButtonText}>{backButtonText}</Text>
				</TouchableOpacity>
			) : (
				<TouchableOpacity onPress={navigationPop} style={styles.backButton}>
					<IonicIcon name={'md-arrow-back'} size={24} style={styles.backIcon} />
				</TouchableOpacity>
			)
	};
}

/**
 * Function that returns the navigation options
 * for our closable screens,
 *
 * @returns {Object} - Corresponding navbar options containing headerTitle, headerTitle and headerTitle
 */
export function getOfflineModalNavbar(navigation) {
	return {
		headerStyle: {
			shadowColor: colors.transparent,
			elevation: 0,
			backgroundColor: colors.white,
			borderBottomWidth: 0
		},
		headerLeft:
			Platform.OS === 'android' ? (
				// eslint-disable-next-line react/jsx-no-bind
				<TouchableOpacity onPress={() => navigation.pop()} style={styles.backButton}>
					<IonicIcon name={'md-arrow-back'} size={24} style={styles.backIcon} />
				</TouchableOpacity>
			) : null,
		headerRight:
			Platform.OS === 'ios' ? (
				// eslint-disable-next-line react/jsx-no-bind
				<TouchableOpacity onPress={() => navigation.pop()} style={styles.backButton}>
					<IonicIcon name="ios-close" size={38} style={[styles.backIcon, styles.backIconIOS]} />
				</TouchableOpacity>
			) : null
	};
}

/**
 * Function that returns the navigation options
 * for our wallet screen,
 *
 * @returns {Object} - Corresponding navbar options containing headerTitle, headerTitle and headerTitle
 */
export function getWalletNavbarOptions(title, navigation) {
	const onScanSuccess = data => {
		if (data.target_address) {
			navigation.navigate('SendView', { txMeta: data });
		} else if (data.private_key) {
			Alert.alert(
				strings('wallet.private_key_detected'),
				strings('wallet.do_you_want_to_import_this_account'),
				[
					{
						text: strings('wallet.cancel'),
						onPress: () => false,
						style: 'cancel'
					},
					{
						text: strings('wallet.yes'),
						onPress: async () => {
							try {
								await importAccountFromPrivateKey(data.private_key);
								navigation.navigate('ImportPrivateKeySuccess');
							} catch (e) {
								Alert.alert(
									strings('import_private_key.error_title'),
									strings('import_private_key.error_message')
								);
							}
						}
					}
				],
				{ cancelable: false }
			);
		} else if (data.walletConnectURI) {
			setTimeout(() => {
				DeeplinkManager.parse(data.walletConnectURI);
			}, 500);
		} else if (data.seed) {
			Alert.alert(strings('wallet.error'), strings('wallet.logout_to_import_seed'));
		} else if (data && data.indexOf(AppConstants.MM_UNIVERSAL_LINK_HOST) !== -1) {
			setTimeout(() => {
				DeeplinkManager.parse(data);
			}, 500);
		} else if ((data && data.indexOf('https://') !== -1) || data.indexOf('http://')) {
			setTimeout(() => {
				DeeplinkManager.parse(data);
			}, 500);
		}
	};

	function openDrawer() {
		navigation.openDrawer();
		trackEvent(ANALYTICS_EVENT_OPTS.COMMON_TAPS_HAMBURGER_MENU);
	}

	function openQRScanner() {
		navigation.navigate('QRScanner', {
			onScanSuccess
		});
		trackEvent(ANALYTICS_EVENT_OPTS.WALLET_QR_SCANNER);
	}

	return {
		headerTitle: <NavbarTitle title={title} />,
		headerLeft: (
			<TouchableOpacity onPress={openDrawer} style={styles.backButton} testID={'hamburger-menu-button-wallet'}>
				<IonicIcon
					name={Platform.OS === 'android' ? 'md-menu' : 'ios-menu'}
					size={Platform.OS === 'android' ? 24 : 28}
					style={styles.backIcon}
				/>
			</TouchableOpacity>
		),
		headerRight: (
			<TouchableOpacity
				style={styles.infoButton}
				// eslint-disable-next-line
				onPress={openQRScanner}
			>
				<AntIcon name="scan1" size={28} style={styles.infoIcon} />
			</TouchableOpacity>
		)
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
		headerTitle: <NavbarTitle title={title} translate={translate} />,
		headerLeft: (
			// eslint-disable-next-line react/jsx-no-bind
			<TouchableOpacity onPress={() => navigation.pop()} style={styles.backButton}>
				<IonicIcon
					name={Platform.OS === 'android' ? 'md-arrow-back' : 'ios-arrow-back'}
					size={Platform.OS === 'android' ? 24 : 28}
					style={styles.backIcon}
				/>
			</TouchableOpacity>
		),
		headerRight: <View />
	};
}

/**
 * Function that returns the navigation options containing title and network indicator
 *
 * @returns {Object} - Corresponding navbar options containing headerTitle and headerTitle
 */
export function getWebviewNavbar(navigation) {
	const title = navigation.getParam('title', '');
	const share = navigation.getParam('dispatch', () => {
		'';
	});
	return {
		title,
		headerTitleStyle: {
			fontSize: 20,
			color: colors.fontPrimary,
			...fontStyles.normal
		},
		headerLeft:
			Platform.OS === 'android' ? (
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
		headerRight:
			Platform.OS === 'android' ? (
				// eslint-disable-next-line react/jsx-no-bind
				<TouchableOpacity onPress={() => share()} style={styles.backButton}>
					<MaterialCommunityIcon name="share-variant" size={24} style={styles.backIcon} />
				</TouchableOpacity>
			) : (
				// eslint-disable-next-line react/jsx-no-bind
				<TouchableOpacity onPress={() => share()} style={styles.backButton}>
					<EvilIcons name="share-apple" size={32} style={[styles.backIcon, styles.shareIconIOS]} />
				</TouchableOpacity>
			)
	};
}
