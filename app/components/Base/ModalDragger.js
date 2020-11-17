import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../../styles/common';
import Device from '../../util/Device';

const styles = StyleSheet.create({
	draggerWrapper: {
		width: '100%',
		height: 33,
		alignItems: 'center',
		justifyContent: 'center',
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderColor: colors.grey100
	},
	dragger: {
		width: 48,
		height: 5,
		borderRadius: 4,
		backgroundColor: colors.grey400,
		opacity: Device.isAndroid() ? 0.6 : 0.5
	}
});

function ModalDragger() {
	return (
		<View style={styles.draggerWrapper}>
			<View style={styles.dragger} />
		</View>
	);
}

export default ModalDragger;
