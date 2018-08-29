import React from 'react';
import NavbarTitle from '../NavbarTitle';
import NavbarLeftButton from '../NavbarLeftButton';
import { TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Foundation';
import { colors } from '../../styles/common';
import { strings } from '../../../locales/i18n';

const styles = StyleSheet.create({
	rightButton: {
		marginTop: 7,
		marginRight: 12,
		marginBottom: 12
	}
});
/**
 * Function that returns the navigation options
 * This is used by views that will show our custom navbar
 * which contains accounts icon, Title and current network, and settings icon
 */
export default function getNavbarOptions(title, navigation) {
	return {
		title,
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
