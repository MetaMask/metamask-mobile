import React from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
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
	confirm: {
		marginLeft: 8
	}
});

/**
 * View that renders an action modal
 */
export default function ChooseInstaPayUserModal({ children, onConfirmPress, modalVisible, confirmText, loading }) {
	return (
		<Modal isVisible={modalVisible} style={styles.modal}>
			<View style={styles.modalView}>
				<View style={styles.modalText}>
					<View style={baseStyles.flexGrow}>{children}</View>
					<View style={styles.actionContainer}>
						<StyledButton
							type={'confirm'}
							onPress={onConfirmPress}
							containerStyle={[styles.button, styles.confirm]}
						>
							{loading ? <ActivityIndicator size="small" color="white" /> : confirmText.toUpperCase()}
						</StyledButton>
					</View>
				</View>
			</View>
		</Modal>
	);
}

ChooseInstaPayUserModal.defaultProps = {
	confirmText: 'CONFIRM'
};

ChooseInstaPayUserModal.propTypes = {
	/**
	 * Content to display above the action buttons
	 */
	children: PropTypes.node,
	/**
	 * Text to show in the confirm button
	 */
	confirmText: PropTypes.string,
	/**
	 * Called when the confirm button is clicked
	 */
	onConfirmPress: PropTypes.func,

	/**
	 * Whether modal is shown
	 */
	modalVisible: PropTypes.bool,
	/**
	 * Action triggered state
	 */
	loading: PropTypes.bool
};
