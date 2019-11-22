import React from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View } from 'react-native';
import Modal from 'react-native-modal';
import { colors, baseStyles } from '../../../styles/common';
import StyledButton from '../StyledButton';

const styles = StyleSheet.create({
	modal: {
		margin: 0,
		width: '100%'
	},
	modalView: {
		flexDirection: 'column',
		justifyContent: 'center',
		alignItems: 'center'
	},
	modalText: {
		alignSelf: 'center',
		width: '90%',
		height: 300,
		backgroundColor: colors.white,
		borderRadius: 10
	},
	actionContainer: {
		borderTopColor: colors.grey200,
		borderTopWidth: 1,
		flex: 0,
		flexDirection: 'row',
		padding: 16
	},
	button: {
		flex: 1
	},
	cancel: {
		marginRight: 8
	},
	confirm: {
		marginLeft: 8
	}
});

/**
 * View that renders an action modal
 */
export default function ActionModal({
	cancelTestID,
	confirmTestID,
	cancelText,
	children,
	confirmText,
	cancelButtonMode,
	confirmButtonMode,
	onCancelPress,
	onConfirmPress,
	onRequestClose,
	modalVisible
}) {
	return (
		<Modal
			isVisible={modalVisible}
			style={styles.modal}
			onBackdropPress={onRequestClose}
			onBackButtonPress={onRequestClose}
			onSwipeComplete={onRequestClose}
			swipeDirection={'down'}
		>
			<View style={styles.modalView}>
				<View style={styles.modalText}>
					<View style={baseStyles.flexGrow}>{children}</View>
					<View style={styles.actionContainer}>
						<StyledButton
							testID={cancelTestID}
							type={cancelButtonMode}
							onPress={onCancelPress}
							containerStyle={[styles.button, styles.cancel]}
						>
							{cancelText}
						</StyledButton>
						<StyledButton
							testID={confirmTestID}
							type={confirmButtonMode}
							onPress={onConfirmPress}
							containerStyle={[styles.button, styles.confirm]}
						>
							{confirmText}
						</StyledButton>
					</View>
				</View>
			</View>
		</Modal>
	);
}

ActionModal.defaultProps = {
	cancelButtonMode: 'neutral',
	confirmButtonMode: 'warning',
	confirmTestID: '',
	cancelTestID: '',
	cancelText: 'CANCEL',
	confirmText: 'CONFIRM'
};

ActionModal.propTypes = {
	/**
	 * TestID for the cancel button
	 */
	cancelTestID: PropTypes.string,
	/**
	 * TestID for the confirm button
	 */
	confirmTestID: PropTypes.string,
	/**
	 * Text to show in the cancel button
	 */
	cancelText: PropTypes.string,
	/**
	 * Content to display above the action buttons
	 */
	children: PropTypes.node,
	/**
	 * Type of button to show as the cancel button
	 */
	cancelButtonMode: PropTypes.oneOf(['cancel', 'neutral', 'confirm', 'normal']),
	/**
	 * Type of button to show as the confirm button
	 */
	confirmButtonMode: PropTypes.oneOf(['normal', 'confirm', 'warning']),
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
	onConfirmPress: PropTypes.func,
	/**
	 * Called when hardware back button on Android is clicked
	 */
	onRequestClose: PropTypes.func,
	/**
	 * Whether modal is shown
	 */
	modalVisible: PropTypes.bool
};
