import React from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, Text } from 'react-native';
import { strings } from '../../../../locales/i18n';
import { fontStyles, colors } from '../../../styles/common';
import ActionModal from '../ActionModal';

const styles = StyleSheet.create({
	warningModalView: {
		margin: 24,
	},
	warningModalTitle: {
		...fontStyles.bold,
		color: colors.red,
		textAlign: 'center',
		fontSize: 20,
		marginBottom: 16,
	},
	warningModalText: {
		...fontStyles.normal,
		color: colors.black,
		textAlign: 'center',
		fontSize: 14,
		lineHeight: 18,
	},
	warningModalTextBold: {
		...fontStyles.bold,
	},
});

const Default = () => (
	<View style={styles.warningModalView}>
		<Text style={styles.warningModalTitle}>{strings('onboarding.warning_title')}</Text>
		<Text style={styles.warningModalText}>
			{strings('onboarding.warning_text_1')}
			<Text style={styles.warningModalTextBold}>{` ${strings('onboarding.warning_text_2')} `}</Text>
			{strings('onboarding.warning_text_3')}
		</Text>
		<Text />
		<Text style={styles.warningModalText}>{strings('onboarding.warning_text_4')}</Text>
	</View>
);

/**
 * View that renders a warning for existing user in a modal
 */
export default function WarningExistingUserModal({
	warningModalVisible,
	onCancelPress,
	cancelButtonDisabled,
	onRequestClose,
	onConfirmPress,
	children,
	cancelText,
	confirmText,
}) {
	return (
		<ActionModal
			modalVisible={warningModalVisible}
			cancelText={cancelText || strings('onboarding.warning_proceed')}
			confirmText={confirmText || strings('onboarding.warning_cancel')}
			onCancelPress={onCancelPress}
			cancelButtonDisabled={cancelButtonDisabled}
			onRequestClose={onRequestClose}
			onConfirmPress={onConfirmPress}
			cancelButtonMode={'warning'}
			confirmButtonMode={'neutral'}
			verticalButtons
		>
			{(children && children) || <Default />}
		</ActionModal>
	);
}

WarningExistingUserModal.propTypes = {
	cancelText: PropTypes.string,
	cancelButtonDisabled: PropTypes.bool,
	confirmText: PropTypes.string,
	children: PropTypes.oneOfType([PropTypes.node, PropTypes.func]),
	/**
	 * Whether the modal is visible
	 */
	warningModalVisible: PropTypes.bool.isRequired,
	/**
	 * Cancel callback
	 */
	onCancelPress: PropTypes.func.isRequired,
	/**
	 * Close callback
	 */
	onRequestClose: PropTypes.func.isRequired,
	/**
	 * Confirm callback
	 */
	onConfirmPress: PropTypes.func.isRequired,
};
