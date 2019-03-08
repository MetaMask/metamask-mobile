import React from 'react';
import NavbarTitle from '../NavbarTitle';
import ModalNavbarTitle from '../ModalNavbarTitle';
import AccountRightButton from '../AccountRightButton';
import NavbarBrowserTitle from '../NavbarBrowserTitle';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { Text, Platform, TouchableOpacity, View, StyleSheet, Image } from 'react-native';
import { fontStyles, colors } from '../../../styles/common';
import IonicIcon from 'react-native-vector-icons/Ionicons';
import AntIcon from 'react-native-vector-icons/AntDesign';
import URL from 'url-parse';
import { strings } from '../../../../locales/i18n';

const styles = StyleSheet.create({
	rightButton: {
		marginTop: 7,
		marginRight: 12,
		marginBottom: 12
	},
	metamaskName: {
		width: 94,
		height: 12
	},
	metamaskNameWrapper: {
		marginLeft: Platform.OS === 'android' ? 20 : 0
	},
	closeIcon: {
		paddingLeft: Platform.OS === 'android' ? 22 : 18,
		color: colors.primary
	},
	backIcon: {
		color: colors.primary
	},
	backButton: {
		paddingLeft: Platform.OS === 'android' ? 22 : 18,
		paddingRight: Platform.OS === 'android' ? 22 : 18,
		marginTop: 5
	},
	infoButton: {
		paddingLeft: Platform.OS === 'android' ? 22 : 18,
		paddingRight: Platform.OS === 'android' ? 22 : 18,
		marginTop: 5
	},
	infoIcon: {
		color: colors.primary
	},
	moreIcon: {
		marginRight: 15,
		marginTop: 5
	},
	flex: {
		flex: 1
	},
	closeButton: {
		paddingHorizontal: 22
	},
	closeButtonText: {
		color: colors.primary,
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
	browserRigthButtonAndroid: {
		flex: 1,
		flexDirection: 'row'
	},
	browserRigthButton: {
		flex: 1
	},
	browserMoreIconAndroid: {
		paddingTop: 10
	}
});

const metamask_name = require('../../../images/metamask-name.png'); // eslint-disable-line
/**
 * Function that returns the navigation options
 * This is used by views that will show our custom navbar
 * which contains accounts icon, Title or Metamask Logo and current network, and settings icon
 *
 * @param {string} title - Title in string format
 * @param {Object} navigation - Navigation object required to push new views
 * @returns {Object} - Corresponding navbar options containing headerTitle, headerLeft, headerTruncatedBackTitle and headerRight
 */
export default function getNavbarOptions(title, navigation) {
	return {
		headerTitle: <NavbarTitle title={title} />,
		headerLeft: (
			<TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.backButton}>
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
 * @returns {Object} - Corresponding navbar options containing title and headerTitleStyle
 */
export function getNavigationOptionsTitle(title, navigation) {
	return {
		title,
		headerTitleStyle: {
			fontSize: 20,
			color: colors.fontPrimary,
			...fontStyles.normal
		},
		headerTintColor: colors.primary,
		headerLeft: (
			// eslint-disable-next-line react/jsx-no-bind
			<TouchableOpacity onPress={() => navigation.pop()} style={styles.backButton}>
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
 * This is used by views that confirms transactions, showing current network
 *
 * @param {string} title - Title in string format
 * @param {string} backButtonText - Back text in string format
 * @returns {Object} - Corresponding navbar options containing title and headerTitleStyle
 */
export function getTransactionOptionsTitle(title, backButtonText, navigation) {
	return {
		headerTitle: <NavbarTitle title={title} />,
		headerLeft:
			Platform.OS === 'ios' ? (
				// eslint-disable-next-line react/jsx-no-bind
				<TouchableOpacity onPress={() => navigation.pop()} style={styles.closeButton}>
					<Text style={styles.closeButtonText}>{backButtonText}</Text>
				</TouchableOpacity>
			) : (
				// eslint-disable-next-line react/jsx-no-bind
				<TouchableOpacity onPress={() => navigation.pop()} style={styles.backButton}>
					<IonicIcon name={'md-arrow-back'} size={24} style={styles.backIcon} />
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
	const urlObj = new URL(url);
	const hostname = urlObj.hostname.toLowerCase().replace('www.', '');
	const isHttps = url.toLowerCase().substr(0, 6) === 'https:';

	return {
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
		headerTitle: <NavbarBrowserTitle hostname={hostname} https={isHttps} />,
		headerRight: (
			<View style={Platform.OS === 'android' ? styles.browserRigthButtonAndroid : styles.browserRigthButton}>
				<AccountRightButton />
				{Platform.OS === 'android' ? (
					<TouchableOpacity
						// eslint-disable-next-line
						onPress={() => {
							navigation.navigate('BrowserView', { ...navigation.state.params, showOptions: true });
						}}
						style={styles.browserMoreIconAndroid}
					>
						<MaterialIcon name="more-vert" size={20} style={styles.moreIcon} />
					</TouchableOpacity>
				) : null}
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
			shadowColor: 'transparent',
			elevation: 0,
			backgroundColor: 'white',
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
 * Function that returns the navigation options
 * for our closable screens,
 *
 * @returns {Object} - Corresponding navbar options containing headerTitle, headerTitle and headerTitle
 */
export function getClosableNavigationOptions(title, backButtonText, navigation) {
	return {
		title,
		headerTitleStyle: {
			fontSize: 20,
			...fontStyles.normal
		},
		headerLeft:
			Platform.OS === 'ios' ? (
				// eslint-disable-next-line react/jsx-no-bind
				<TouchableOpacity onPress={() => navigation.pop()} style={styles.closeButton}>
					<Text style={styles.closeButtonText}>{backButtonText}</Text>
				</TouchableOpacity>
			) : (
				// eslint-disable-next-line react/jsx-no-bind
				<TouchableOpacity onPress={() => navigation.pop()} style={styles.backButton}>
					<IonicIcon name={'md-arrow-back'} size={24} style={styles.backIcon} />
				</TouchableOpacity>
			)
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
		}
	};

	return {
		headerTitle: <NavbarTitle title={title} />,
		headerLeft: (
			<TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.backButton}>
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
				onPress={() => {
					navigation.navigate('QRScanner', {
						onScanSuccess
					});
				}}
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
				<View />
			),
		headerRight:
			Platform.OS === 'ios' ? (
				// eslint-disable-next-line react/jsx-no-bind
				<TouchableOpacity onPress={() => navigation.pop()} style={styles.backButton}>
					<IonicIcon name="ios-close" size={38} style={styles.closeIcon} />
				</TouchableOpacity>
			) : (
				<View />
			)
	};
}
