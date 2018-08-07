import React from 'react';
import Identicon from '../Identicon';
import NavbarTitle from '../NavbarTitle';
import { TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Foundation';
import { colors } from '../../styles/common';

const address = '0xe7E125654064EEa56229f273dA586F10DF96B0a1';

const styles = StyleSheet.create({
	leftButton: {
		marginTop: 12,
		marginLeft: 12,
		marginBottom: 12
	},
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
		headerLeft: (
			<TouchableOpacity style={styles.leftButton} onPress={navigation.openDrawer}>
				<Identicon diameter={30} address={address} />
			</TouchableOpacity>
		),
		headerRight: (
			<TouchableOpacity
				style={styles.rightButton}
				onPress={() => navigation.navigate('Settings')} // eslint-disable-line react/jsx-no-bind
			>
				<Icon name="widget" size={28} color={colors.fontTertiary} />
			</TouchableOpacity>
		)
	};
}
