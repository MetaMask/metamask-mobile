import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { colors, fontStyles } from '../../../../styles/common';
import PropTypes from 'prop-types';
import { strings } from '../../../../../locales/i18n';

const styles = StyleSheet.create({
	wrapperError: {
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
	},
	wrapperWarning: {
		backgroundColor: colors.blue000,
		borderWidth: 1,
		borderColor: colors.blue,
		borderRadius: 4,
		padding: 15
	},
	warningMessage: {
		...fontStyles.normal,
		fontSize: 12,
		color: colors.blue,
		flexDirection: 'row',
		alignItems: 'center'
	}
});

export default function ErrorMessage(props) {
	const { errorMessage, errorContinue, onContinue, isOnlyWarning } = props;
	return (
		<View style={isOnlyWarning ? styles.wrapperWarning : styles.wrapperError} testID={'error-message-warning'}>
			<Text style={isOnlyWarning ? styles.warningMessage : styles.errorMessage}>{errorMessage}</Text>
			{errorContinue && (
				<TouchableOpacity onPress={onContinue} style={styles.button}>
					<Text style={styles.buttonMessage}>{strings('transaction.continueError')}</Text>
				</TouchableOpacity>
			)}
		</View>
	);
}

ErrorMessage.propTypes = {
	/**
	 * Error message to display, can be a string or a Text component
	 */
	errorMessage: PropTypes.oneOfType([PropTypes.object, PropTypes.array, PropTypes.string]),
	/**
	 * Show continue button when it is a contract address
	 */
	errorContinue: PropTypes.bool,
	/**
	 * Function that is called when continue button is pressed
	 */
	onContinue: PropTypes.func,
	/**
	 * Show a warning info instead of an error
	 */
	isOnlyWarning: PropTypes.bool
};
