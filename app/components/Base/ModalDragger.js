import React from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View } from 'react-native';
import { colors } from '../../styles/common';
import Device from '../../util/device';

const styles = StyleSheet.create({
	draggerWrapper: {
		width: '100%',
		height: 33,
		alignItems: 'center',
		justifyContent: 'center',
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderColor: colors.grey100,
	},
	borderless: {
		borderColor: colors.transparent,
	},
	dragger: {
		width: 48,
		height: 5,
		borderRadius: 4,
		backgroundColor: colors.grey400,
		opacity: Device.isAndroid() ? 0.6 : 0.5,
	},
});

function ModalDragger({ borderless }) {
	return (
		<View style={[styles.draggerWrapper, borderless && styles.borderless]}>
			<View style={styles.dragger} />
		</View>
	);
}

ModalDragger.propTypes = {
	borderless: PropTypes.bool,
};

export default ModalDragger;
