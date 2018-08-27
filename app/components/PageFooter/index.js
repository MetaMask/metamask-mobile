import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { View, StyleSheet } from 'react-native';
import { colors, fontStyles } from '../../styles/common';
import Button from 'react-native-button';

const styles = StyleSheet.create({
	textAddToken: {
		color: colors.primary
	},
	textCancel: {
		color: colors.asphalt
	},
	button: {
		alignItems: 'center',
		padding: 16,
		borderWidth: 2,
		borderRadius: 4,
		width: '45%',
		marginTop: 10,
		marginBottom: 10
	},
	buttonCancel: {
		borderColor: colors.asphalt
	},
	buttonAddToken: {
		backgroundColor: colors.white,
		borderColor: colors.primary
	},
	footer: {
		flexDirection: 'row',
		justifyContent: 'space-evenly',
		left: 0,
		right: 0,
		bottom: 0,
		borderTopWidth: 1,
		borderColor: colors.borderColor,
		backgroundColor: colors.white
	}
});

/**
 * UI Component that renders
 * showing the options whether or not add token
 */
export default class PageFooter extends Component {
	static propTypes = {
		/**
		 * Method to trigger when cancel
		 */
		onCancel: PropTypes.object.function,
		/**
		 * Method to trigger when submit
		 */
		onSubmit: PropTypes.object.function,
		/**
		 * Text to display on cancel button
		 */
		cancelText: PropTypes.string.isRequired,
		/**
		 * Text to display on submit button
		 */
		submitText: PropTypes.string.isRequired
	};

	render() {
		const { onCancel, onSubmit, cancelText, submitText } = this.props;
		return (
			<View style={styles.footer}>
				<Button
					containerStyle={[styles.button, styles.buttonCancel]}
					style={[styles.textCancel, fontStyles.thin]}
					onPress={onCancel}
				>
					{cancelText}
				</Button>
				<Button
					containerStyle={[styles.button, styles.buttonAddToken]}
					style={[styles.textAddToken, fontStyles.thin]}
					onPress={onSubmit}
				>
					{submitText}
				</Button>
			</View>
		);
	}
}
