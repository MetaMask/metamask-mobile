import React from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View } from 'react-native';
import Modal from 'react-native-modal';
import { colors } from '../../../styles/common';
import StyledButton from '../StyledButton';
import { strings } from '../../../../locales/i18n';

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
	modalContainer: {
		width: '90%',
		backgroundColor: colors.white,
		borderRadius: 10
	},
	actionContainer: {
		borderTopColor: colors.grey200,
		borderTopWidth: 1,
		flexDirection: 'row',
		padding: 16
	},
	childrenContainer: {
		minHeight: 250,
		flexDirection: 'row',
		alignItems: 'center'
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
	confirmDisabled,
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
				<View style={styles.modalContainer}>
					<View style={styles.childrenContainer}>{children}</View>
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
							disabled={confirmDisabled}
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
	cancelText: strings('action_view.cancel'),
	confirmText: strings('action_view.confirm'),
	confirmDisabled: false
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
	 * Whether confirm button is disabled
	 */
	confirmDisabled: PropTypes.bool,
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
