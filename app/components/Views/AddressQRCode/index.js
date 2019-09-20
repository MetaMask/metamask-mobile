import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { Platform, TouchableOpacity, Dimensions, StyleSheet, View, Text, Clipboard } from 'react-native';
import { colors, fontStyles } from '../../../styles/common';
import { toChecksumAddress } from 'ethereumjs-util';
import { connect } from 'react-redux';
import QRCode from 'react-native-qrcode-svg';
import { strings } from '../../../../locales/i18n';
import IonicIcon from 'react-native-vector-icons/Ionicons';
import DeviceSize from '../../../util/DeviceSize';
import { showAlert } from '../../../actions/alert';
import GlobalAlert from '../../UI/GlobalAlert';

const styles = StyleSheet.create({
	detailsWrapper: {
		padding: 10,
		alignItems: 'center'
	},
	qrCode: {
		marginBottom: 16,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 36,
		paddingBottom: 24,
		paddingTop: 16,
		backgroundColor: colors.grey000,
		borderRadius: 8
	},
	qrCodeWrapper: {
		borderColor: colors.grey300,
		borderRadius: 8,
		borderWidth: 1,
		padding: 15
	},
	addressWrapper: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 16,
		paddingTop: 16,
		marginTop: 10,
		borderRadius: 5,
		backgroundColor: colors.grey000
	},
	titleQr: {
		flexDirection: 'row'
	},
	closeIcon: {
		position: 'absolute',
		right: DeviceSize.isSmallDevice() ? (Platform.OS === 'ios' ? -30 : -30) : Platform.OS === 'ios' ? -40 : -50,
		bottom: Platform.OS === 'ios' ? 8 : 10
	},
	addressTitle: {
		fontSize: 16,
		marginBottom: 16,
		...fontStyles.normal
	},
	address: {
		...fontStyles.normal,
		fontSize: Platform.OS === 'ios' ? 14 : 20,
		textAlign: 'center'
	}
});

/**
 * PureComponent that renders receive options
 */
class AddressQRCode extends PureComponent {
	static propTypes = {
		/**
		 * Selected address as string
		 */
		selectedAddress: PropTypes.string,
		/**
		/* Triggers global alert
		*/
		showAlert: PropTypes.func,
		closeQrModal: PropTypes.func
	};

	/**
	 * Closes QR code modal
	 */
	closeQrModal = () => {
		const { closeQrModal } = this.props;
		closeQrModal && closeQrModal();
	};

	copyAccountToClipboard = async () => {
		const { selectedAddress } = this.props;
		await Clipboard.setString(selectedAddress);
		this.props.showAlert({
			isVisible: true,
			autodismiss: 1500,
			content: 'clipboard-alert',
			data: { msg: strings('account_details.account_copied_to_clipboard') }
		});
	};

	render() {
		return (
			<View style={styles.detailsWrapper}>
				<View style={styles.qrCode}>
					<View style={styles.titleQr}>
						<Text style={styles.addressTitle}>{strings('receive_request.public_address_qr_code')}</Text>
						<TouchableOpacity style={styles.closeIcon} onPress={this.closeQrModal}>
							<IonicIcon name={'ios-close'} size={28} color={colors.black} />
						</TouchableOpacity>
					</View>
					<View style={styles.qrCodeWrapper}>
						<QRCode
							value={`ethereum:${this.props.selectedAddress}`}
							size={Dimensions.get('window').width - 160}
						/>
					</View>
					<TouchableOpacity style={styles.addressWrapper} onPress={this.copyAccountToClipboard}>
						<Text style={styles.address}>{this.props.selectedAddress}</Text>
					</TouchableOpacity>
				</View>
				<GlobalAlert />
			</View>
		);
	}
}

const mapStateToProps = state => ({
	selectedAddress: toChecksumAddress(state.engine.backgroundState.PreferencesController.selectedAddress)
});

const mapDispatchToProps = dispatch => ({
	showAlert: config => dispatch(showAlert(config))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(AddressQRCode);
