import React, { useRef } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import ReusableModal, { ReusableModalRef } from '../../UI/ReusableModal';
import { colors, fontStyles } from '../../../styles/common';
import StyledButton from '../../UI/StyledButton';
import { strings } from '../../../../locales/i18n';

const styles = StyleSheet.create({
	fill: {
		flex: 1,
	},
	screen: { alignItems: 'center', justifyContent: 'center' },
	modal: {
		backgroundColor: colors.white,
		borderRadius: 10,
		marginHorizontal: 16,
	},
	bodyContainer: {
		paddingHorizontal: 24,
		paddingVertical: 32,
	},
	headerLabel: {
		textAlign: 'center',
		...(fontStyles.bold as any),
		fontSize: 24,
		marginBottom: 16,
		color: colors.black,
	},
	description: { textAlign: 'center', fontSize: 16, ...(fontStyles.normal as any), color: colors.black },
	divider: {
		height: 1,
		backgroundColor: colors.grey100,
	},
	buttonsContainer: {
		flexDirection: 'row',
		padding: 16,
	},
	buttonDivider: {
		width: 8,
	},
});

interface Props {
	route: {
		params: {
			onConfirm: () => void;
		};
	};
}

const AssetIgnoreConfirmation = ({ route }: Props) => {
	const { onConfirm } = route.params;
	const modalRef = useRef<ReusableModalRef>(null);

	const triggerCancel = () => modalRef.current?.dismissModal();

	const triggerConfirm = () => {
		modalRef.current?.dismissModal(onConfirm);
	};

	const renderHeader = () => (
		<Text style={styles.headerLabel}>{strings('wallet.confirm_detected_tokens_title')}</Text>
	);

	const renderDescription = () => (
		<Text style={styles.description}>{strings('wallet.confirm_detected_tokens_desc')}</Text>
	);

	const renderButtons = () => (
		<View style={styles.buttonsContainer}>
			<StyledButton onPress={triggerCancel} containerStyle={styles.fill} type={'normal'}>
				{strings('wallet.confirm_detected_tokens_cancel')}
			</StyledButton>
			<View style={styles.buttonDivider} />
			<StyledButton onPress={triggerConfirm} containerStyle={styles.fill} type={'confirm'}>
				{strings('wallet.confirm_detected_tokens_confirm')}
			</StyledButton>
		</View>
	);

	return (
		<ReusableModal ref={modalRef} style={styles.screen}>
			<View style={styles.modal}>
				<View style={styles.bodyContainer}>
					{renderHeader()}
					{renderDescription()}
				</View>
				<View style={styles.divider} />
				{renderButtons()}
			</View>
		</ReusableModal>
	);
};

export default AssetIgnoreConfirmation;
