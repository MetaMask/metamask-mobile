import React from 'react';
import Button from '../Button';
import PropTypes from 'prop-types';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { baseStyles, colors } from '../../styles/common';

const styles = StyleSheet.create({
	actionContainer: {
		borderTopColor: colors.lightGray,
		borderTopWidth: 1,
		flex: 0,
		flexDirection: 'row',
		padding: 16
	},
	button: {
		borderRadius: 4,
		borderWidth: 2,
		height: 'auto',
		paddingVertical: 16,
		width: '50%'
	},
	buttonText: {
		fontSize: 15,
		fontWeight: '500',
		textTransform: 'uppercase'
	},
	cancel: {
		backgroundColor: colors.white,
		borderColor: colors.accentGray,
		marginRight: 8
	},
	cancelText: {
		color: colors.gray
	},
	confirm: {
		backgroundColor: colors.white,
		borderColor: colors.blue,
		marginLeft: 8
	},
	confirmText: {
		color: colors.blue
	},
	/* eslint-disable-next-line react-native/no-unused-styles */
	confirmFilled: {
		backgroundColor: colors.green,
		borderColor: colors.green
	},
	/* eslint-disable-next-line react-native/no-unused-styles */
	confirmFilledText: {
		color: colors.white
	}
});

/**
 * Component that renders scrollable content above action buttons
 */
export default function ActionView({ cancelText, children, confirmButtonMode, confirmText, onCancelPress, onConfirmPress}) {
	return (
		<View style={baseStyles.flexGrow}>
			<ScrollView style={baseStyles.flexGrow}>
				{children}
			</ScrollView>
			<View style={styles.actionContainer}>
				<Button style={{ ...styles.button, ...styles.cancel }} onPress={onCancelPress}>
					<Text style={{ ...styles.buttonText, ...styles.cancelText}}>{cancelText}</Text>
				</Button>
				<Button style={{ ...styles.button, ...styles.confirm, ...styles[confirmButtonMode] }} onPress={onConfirmPress}>
					<Text style={{ ...styles.buttonText, ...styles.confirmText, ...styles[`${confirmButtonMode}Text`] }}>
						{confirmText}
					</Text>
				</Button>
			</View>
		</View>
	);
}

ActionView.defaultProps = {
	cancelText: 'Cancel',
	confirmText: 'Confirm',
	confirmButtonMode: 'default'
};

ActionView.propTypes = {
	/**
	 * Text to show in the cancel button
	 */
	cancelText: PropTypes.string,
	/**
	 * Content to display above the action buttons
	 */
	children: PropTypes.node,
	/**
	 * Type of button to show as the confirm button
	 */
	confirmButtonMode: PropTypes.oneOf(['default', 'filled']),
	/**
	 * Text to show in the confirm button
	 */
	confirmText: PropTypes.string,
	/**
	 * Called when the cancel button is clicked
	 */
	onCancelPress: PropTypes.func,
	/**
	 * Called when the confirm button is clicked
	 */
	onConfirmPress: PropTypes.func
};
