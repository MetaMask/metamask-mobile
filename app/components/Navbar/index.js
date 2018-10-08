import React from 'react';
import NavbarTitle from '../NavbarTitle';
import ModalNavbarTitle from '../ModalNavbarTitle';
import NavbarLeftButton from '../NavbarLeftButton';
import { TouchableOpacity, StyleSheet, Image } from 'react-native';
import Icon from 'react-native-vector-icons/Foundation';
import { colors } from '../../styles/common';
import { strings } from '../../../locales/i18n';

const styles = StyleSheet.create({
	rightButton: {
		marginTop: 7,
		marginRight: 12,
		marginBottom: 12
	},
	metamaskName: {
		width: 94,
		height: 12
	}
});

const metamask_name = require('../../images/metamask-name.png');
/**
 * Function that returns the navigation options
 * This is used by views that will show our custom navbar
 * which contains accounts icon, Title and current network, and settings icon
 */
export default function getNavbarOptions(title, navigation) {
	return {
		headerTitle: <NavbarTitle title={title} />,
		headerLeft: <NavbarLeftButton onPress={navigation.openDrawer} />,
		headerTruncatedBackTitle: strings('navigation.back'),
		headerRight: (
			<TouchableOpacity
				testID={'navbar-settings-button'}
				style={styles.rightButton}
				onPress={() => navigation.navigate('Settings')} // eslint-disable-line react/jsx-no-bind
			>
				<Icon name="widget" size={28} color={colors.fontTertiary} />
			</TouchableOpacity>
		)
	};
}

export function getModalNavbarOptions(title) {
	return {
		headerTitle: <ModalNavbarTitle title={title} />
	};
}

export function getOnboardingNavbarOptions() {
	return {
		headerStyle: {
			shadowColor: 'red',
			elevation: 0,
			backgroundColor: 'white',
			borderBottomWidth: 0
		},
		headerTitle: <Image source={metamask_name} style={styles.metamaskName} resizeMethod={'auto'} />,
		headerBackTitle: strings('navigation.back')
	};
}
