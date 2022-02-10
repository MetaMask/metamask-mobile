import React, { useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import IonicIcon from 'react-native-vector-icons/Ionicons';
import { connect } from 'react-redux';

import { strings } from '../../../../locales/i18n';
import { showAlert } from '../../../actions/alert';
import { protectWalletModalVisible } from '../../../actions/user';
import ClipboardManager from '../../../core/ClipboardManager';
import { colors } from '../../../styles/common';
import Text from '../../Base/Text';
import GlobalAlert from '../../UI/GlobalAlert';

const styles = StyleSheet.create({
	wrapper: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
	},
	qrCode: {
		padding: 36,
		backgroundColor: colors.grey000,
		borderRadius: 8,
		marginVertical: 16,
	},
	addressWrapper: {
		borderRadius: 8,
		backgroundColor: colors.grey000,
		padding: 12,
	},
	closeIcon: {
		alignItems: 'flex-end',
	},
});

/**
 * Component that renders a public address view
 */
const AddressQRCode = ({ closeQrModal, seedphraseBackedUp, protectWalletModalVisible, selectedAddress, showAlert }) => {
	const { width: windowWidth, height: windowHeight } = useWindowDimensions();
	const contentStyle = useMemo(() => {
		const isPortrait = windowHeight > windowWidth;
		if (isPortrait) {
			return {
				size: Math.min(windowWidth - 160, 420),
			};
		}
		return {
			size: 420,
		};
	}, [windowWidth, windowHeight]);
	/**
	 * Closes QR code modal
	 */
	const closeModal = useCallback(() => {
		closeQrModal();
		!seedphraseBackedUp && setTimeout(() => protectWalletModalVisible(), 1000);
	}, [closeQrModal, protectWalletModalVisible, seedphraseBackedUp]);

	const copyAccountToClipboard = useCallback(async () => {
		await ClipboardManager.setString(selectedAddress);
		showAlert({
			isVisible: true,
			autodismiss: 1500,
			content: 'clipboard-alert',
			data: { msg: strings('account_details.account_copied_to_clipboard') },
		});
	}, [selectedAddress, showAlert]);

	const address = useMemo(
		() =>
			`${selectedAddress.slice(0, 2)} ${selectedAddress
				.slice(2)
				.match(/.{1,4}/g)
				.join(' ')}`,
		[selectedAddress]
	);

	return (
		<View style={[styles.wrapper]}>
			<TouchableOpacity
				style={[styles.closeIcon, { width: contentStyle.size + 36 * 2 }]}
				onPress={closeModal}
				testID={'close-qr-modal'}
			>
				<IonicIcon name={'ios-close'} size={38} color={colors.white} />
			</TouchableOpacity>
			<View style={styles.qrCode}>
				<QRCode value={`ethereum:${selectedAddress}`} size={contentStyle.size} />
			</View>
			<View style={[styles.addressWrapper, { width: contentStyle.size + 36 * 2 }]}>
				<Text big black centered>
					{strings('receive_request.public_address_qr_code')}
				</Text>
				<TouchableOpacity onPress={copyAccountToClipboard}>
					<Text big black centered testID={'public-address-input'}>
						{address}
					</Text>
				</TouchableOpacity>
			</View>
			<GlobalAlert />
		</View>
	);
};

AddressQRCode.propTypes = {
	/**
	 * Selected address as string
	 */
	selectedAddress: PropTypes.string,
	/**
		/* Triggers global alert
		*/
	showAlert: PropTypes.func,
	/**
		/* Callback to close the modal
		*/
	closeQrModal: PropTypes.func,
	/**
	 * Prompts protect wallet modal
	 */
	protectWalletModalVisible: PropTypes.func,
	/**
	 * redux flag that indicates if the user
	 * completed the seed phrase backup flow
	 */
	seedphraseBackedUp: PropTypes.bool,
};

const mapStateToProps = (state) => ({
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	seedphraseBackedUp: state.user.seedphraseBackedUp,
});

const mapDispatchToProps = (dispatch) => ({
	showAlert: (config) => dispatch(showAlert(config)),
	protectWalletModalVisible: () => dispatch(protectWalletModalVisible()),
});

export default connect(mapStateToProps, mapDispatchToProps)(AddressQRCode);
