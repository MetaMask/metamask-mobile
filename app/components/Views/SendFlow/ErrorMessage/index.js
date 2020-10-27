import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { colors, fontStyles } from '../../../../styles/common';
import PropTypes from 'prop-types';
import { strings } from '../../../../../locales/i18n';

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
	},
	button: {
		marginTop: 27
	},
	buttonMessage: {
		...fontStyles.normal,
		fontSize: 12,
		color: colors.blue,
		textAlign: 'center'
	}
});

export default function ErrorMessage(props) {
	const { errorMessage, isContractAddress, onContinue } = props;
	return (
		<View style={styles.wrapper} testID={'error-message-warning'}>
			<Text style={styles.errorMessage}>{errorMessage}</Text>
			{isContractAddress && (
				<TouchableOpacity onPress={onContinue} style={styles.button}>
					<Text style={styles.buttonMessage}>{strings('transaction.continueError')}</Text>
				</TouchableOpacity>
			)}
		</View>
	);
}

ErrorMessage.propTypes = {
	/**
	 * Error message to display
	 */
	errorMessage: PropTypes.string,
	/**
	 * Show continue button when it is a contract address
	 */
	isContractAddress: PropTypes.bool,
	/**
	 * Function that is called when continue button is pressed
	 */
	onContinue: PropTypes.func
};
