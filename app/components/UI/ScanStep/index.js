import React from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fontStyles } from '../../../styles/common';
import scaling from '../../../util/scaling';

const styles = StyleSheet.create({
	step: {
		...fontStyles.normal,
		fontSize: scaling.scale(14),
		color: colors.fontPrimary,
		lineHeight: 28
	},
	row: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		flexWrap: 'wrap',
		marginBottom: 6
	},
	val: { width: '8%' },
	stepTitle: { width: '92%' }
});

const ScanStep = ({ step, children }) => (
	<View style={styles.row}>
		<View style={styles.val}>
			<Text style={styles.step}>{step}.</Text>
		</View>
		<View style={styles.stepTitle}>
			<Text style={styles.step}>{children}</Text>
		</View>
	</View>
);

ScanStep.propTypes = {
	children: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.node), PropTypes.node]),
	step: PropTypes.number
};

export default ScanStep;
