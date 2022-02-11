import React from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View } from 'react-native';
import Device from '../../util/device';
import { useAppThemeFromContext } from '../../util/theme';

const createStyles = (colors) =>
	StyleSheet.create({
		draggerWrapper: {
			width: '100%',
			height: 33,
			alignItems: 'center',
			justifyContent: 'center',
			borderBottomWidth: StyleSheet.hairlineWidth,
			borderColor: colors.border.muted,
		},
		borderless: {
			borderColor: colors.transparent,
		},
		dragger: {
			width: 48,
			height: 5,
			borderRadius: 4,
			backgroundColor: colors.border.default,
			opacity: Device.isAndroid() ? 0.6 : 0.5,
		},
	});

function ModalDragger({ borderless }) {
	const { colors } = useAppThemeFromContext();
	const styles = createStyles(colors);

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
