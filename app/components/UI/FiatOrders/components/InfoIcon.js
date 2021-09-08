import React from 'react';
import { StyleSheet } from 'react-native';
import IonicIcon from 'react-native-vector-icons/Ionicons';
import Device from '../../../../util/device';
import { colors } from '../../../../styles/common';

const styles = StyleSheet.create({
	icon: {
		color: colors.grey200,
	},
});

const InfoIcon = (props) => (
	<IonicIcon
		name={Device.isAndroid() ? 'md-information-circle' : 'ios-information-circle'}
		style={styles.icon}
		size={Device.isAndroid() ? 14 : 16}
		{...props}
	/>
);

export default InfoIcon;
