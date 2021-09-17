import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { colors, fontStyles } from '../../../../styles/common';
import ActionModal from '../../ActionModal';

const styles = StyleSheet.create({
	modal: {
		margin: 0,
		width: '100%',
	},
	modalView: {
		flexDirection: 'column',
		justifyContent: 'center',
		alignItems: 'center',
		paddingVertical: 24,
		paddingHorizontal: 24,
		width: '100%',
	},
	modalText: {
		...(fontStyles.normal as any),
		fontSize: 14,
		textAlign: 'center',
		paddingVertical: 8,
		color: colors.black,
	},
	modalTitle: {
		...(fontStyles.bold as any),
		fontSize: 22,
		textAlign: 'center',
		color: colors.black,
	},
});

interface Props {
	retryIsOpen: boolean;
	onConfirmPress: () => void;
	onCancelPress: () => void;
	errorMsg: string;
}

const RetryModal = ({ retryIsOpen, onConfirmPress, onCancelPress, errorMsg }: Props) => {
	const confirmText = 'Retry?';
	const cancelText = 'Cancel';
	return (
		<ActionModal
			modalStyle={styles.modal}
			modalVisible={retryIsOpen}
			confirmText={confirmText}
			cancelText={cancelText}
			onConfirmPress={onConfirmPress}
			onCancelPress={onCancelPress}
			onRequestClose={onCancelPress}
		>
			<View style={styles.modalView}>
				<Text style={styles.modalTitle}>Speed Up Failed</Text>
				{errorMsg && <Text style={styles.modalText}>Reason: {errorMsg}</Text>}
				<Text style={styles.modalText}>would you like to try again?</Text>
			</View>
		</ActionModal>
	);
};

export default RetryModal;
