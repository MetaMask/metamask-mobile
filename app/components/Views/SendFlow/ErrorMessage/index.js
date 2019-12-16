import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { colors, fontStyles } from '../../../../styles/common';
import PropTypes from 'prop-types';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.red000,
		borderWidth: 1,
		borderColor: colors.red,
		borderRadius: 4,
		padding: 15
	},
	errorMessage: {
		...fontStyles.normal,
		fontSize: 12,
		color: colors.red,
		flexDirection: 'row',
		alignItems: 'center'
	}
});

export default function ErrorMessage(props) {
	const { errorMessage } = props;
	return (
		<View style={styles.wrapper}>
			<Text style={styles.errorMessage}>{errorMessage}</Text>
		</View>
	);
}

ErrorMessage.propTypes = {
	/**
	 * Error message to display
	 */
	errorMessage: PropTypes.string
};
