import React from 'react';
import Modal from 'react-native-modal';
import { IQRState } from '../types';
import { StyleSheet, View } from 'react-native';
import QRSigningDetails from '../QRSigningDetails';
import { colors } from '../../../../styles/common';

interface IQRSigningModalProps {
	isVisible: boolean;
	QRState: IQRState;
	onSuccess?: () => void;
	onCancel?: () => void;
	onFailure?: (error: string) => void;
}

const styles = StyleSheet.create({
	modal: {
		margin: 0,
		justifyContent: 'flex-end',
	},
	contentWrapper: { justifyContent: 'flex-end', height: 750, backgroundColor: colors.white, paddingTop: 24 },
});

const QRSigningModal = ({ isVisible, QRState, onSuccess, onCancel, onFailure }: IQRSigningModalProps) => (
	<Modal
		isVisible={isVisible}
		style={styles.modal}
		animationIn="slideInUp"
		animationOut="slideOutDown"
		backdropOpacity={0.7}
		animationInTiming={600}
		animationOutTiming={600}
		propagateSwipe
	>
		<View style={styles.contentWrapper}>
			<QRSigningDetails
				QRState={QRState}
				showCancelButton
				showHint
				successCallback={onSuccess}
				cancelCallback={onCancel}
				failureCallback={onFailure}
			/>
		</View>
	</Modal>
);

export default QRSigningModal;
