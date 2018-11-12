import React from 'react';
import NavbarTitle from '../NavbarTitle';
import ModalNavbarTitle from '../ModalNavbarTitle';
import NavbarLeftButton from '../NavbarLeftButton';
import NavbarBrowserTitle from '../NavbarBrowserTitle';
import { Platform, TouchableOpacity, View, StyleSheet, Image } from 'react-native';

import IonicIcon from 'react-native-vector-icons/Ionicons';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { strings } from '../../../locales/i18n';
import URL from 'url-parse';

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
		marginRight: 20,
		marginTop: 5
	},
	moreIcon: {
		marginRight: 15,
		marginTop: 5
	},
	flex: {
		flex: 1
	}
});

const metamask_name = require('../../images/metamask-name.png'); // eslint-disable-line
/**
 * Function that returns the navigation options
 * This is used by views that will show our custom navbar
 * which contains accounts icon, Title or Metamask Logo and current network, and settings icon
 */
export default function getNavbarOptions(title, navigation) {
	return {
		headerTitle: <NavbarTitle title={title} />,
		headerLeft: <NavbarLeftButton onPress={navigation.openDrawer} />,
		headerTruncatedBackTitle: strings('navigation.back'),
		headerRight: null
	};
}

/**
 * Function that returns the navigation options
 * This is used by views that will show our custom navbar
 * which contains accounts icon, Title or Metamask Logo and current network, and settings icon
 */
export function getBrowserViewNavbarOptions(navigation) {
	const url = navigation.getParam('url', '');
	const urlObj = new URL(url);
	const hostname = urlObj.hostname.toLowerCase().replace('www.', '');
	const isHttps = url.toLowerCase().substr(0, 6) === 'https:';

	return {
		headerLeft: <NavbarLeftButton onPress={navigation.openDrawer} />,
		headerTitle: (
			<TouchableOpacity
				style={styles.flex}
				// eslint-disable-next-line
				onPress={() => {
					navigation.navigate('BrowserView', { ...navigation.state.params, showUrlModal: true });
				}}
			>
				<NavbarBrowserTitle hostname={hostname} https={isHttps} />
			</TouchableOpacity>
		),
		headerRight:
			Platform.OS === 'android' ? (
				// eslint-disable-next-line
				<TouchableOpacity
					onPress={() => {
						// eslint-disable-next-line no-mixed-spaces-and-tabs
						navigation.navigate('BrowserView', { ...navigation.state.params, showOptions: true });
					}}
				>
					<MaterialIcon name="more-vert" size={20} style={styles.moreIcon} />
				</TouchableOpacity>
			) : (
				// eslint-disable-next-line
				<TouchableOpacity onPress={() => navigation.navigate('BrowserHome')}>
					<IonicIcon name="ios-close" size={38} style={styles.closeIcon} />
				</TouchableOpacity>
			)
	};
}

/**
 * Function that returns the navigation options
 * for our modals
 */
export function getModalNavbarOptions(title) {
	return {
		headerTitle: <ModalNavbarTitle title={title} />
	};
}

/**
 * Function that returns the navigation options
 * for our the onboarding screens,
 * which is just the metamask log and the Back button
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
