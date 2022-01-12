import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { InteractionManager, TouchableOpacity, SafeAreaView, Dimensions, StyleSheet, View, Alert } from 'react-native';
import Modal from 'react-native-modal';
import Share from 'react-native-share';
import QRCode from 'react-native-qrcode-svg';
import EvilIcons from 'react-native-vector-icons/EvilIcons';
import { connect } from 'react-redux';

import Analytics from '../../../core/Analytics';
import AnalyticsV2 from '../../../util/analyticsV2';
import Logger from '../../../util/Logger';
import Device from '../../../util/device';
import { strings } from '../../../../locales/i18n';
import { ANALYTICS_EVENT_OPTS } from '../../../util/analytics';
import { generateUniversalLinkAddress } from '../../../util/payment-link-generator';
import { allowedToBuy } from '../FiatOrders';
import { showAlert } from '../../../actions/alert';
import { toggleReceiveModal } from '../../../actions/modals';
import { protectWalletModalVisible } from '../../../actions/user';

import { colors, fontStyles } from '../../../styles/common';
import Text from '../../Base/Text';
import ModalHandler from '../../Base/ModalHandler';
import ModalDragger from '../../Base/ModalDragger';
import AddressQRCode from '../../Views/AddressQRCode';
import EthereumAddress from '../EthereumAddress';
import GlobalAlert from '../GlobalAlert';
import StyledButton from '../StyledButton';
import ClipboardManager from '../../../core/ClipboardManager';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		borderTopLeftRadius: 10,
		borderTopRightRadius: 10,
	},
	body: {
		alignItems: 'center',
		paddingHorizontal: 15,
	},
	qrWrapper: {
		margin: 15,
	},
	addressWrapper: {
		flexDirection: 'row',
		alignItems: 'center',
		margin: 15,
		padding: 9,
		paddingHorizontal: 15,
		backgroundColor: colors.grey000,
		borderRadius: 30,
	},
	copyButton: {
		backgroundColor: colors.grey050,
		color: colors.fontPrimary,
		borderRadius: 12,
		overflow: 'hidden',
		paddingVertical: 3,
		paddingHorizontal: 6,
		marginHorizontal: 6,
	},
	actionRow: {
		flexDirection: 'row',
		marginBottom: 15,
	},
	actionButton: {
		flex: 1,
		marginHorizontal: 8,
	},
	title: {
		...fontStyles.normal,
		color: colors.fontPrimary,
		fontSize: 18,
		flexDirection: 'row',
		alignSelf: 'center',
	},
	titleWrapper: {
		marginTop: 10,
	},
});

/**
 * PureComponent that renders receive options
 */
class ReceiveRequest extends PureComponent {
	static propTypes = {
		/**
		 * The navigator object
		 */
		navigation: PropTypes.object,
		/**
		 * Selected address as string
		 */
		selectedAddress: PropTypes.string,
		/**
		 * Asset to receive, could be not defined
		 */
		receiveAsset: PropTypes.object,
		/**
		 * Action that toggles the receive modal
		 */
		toggleReceiveModal: PropTypes.func,
		/**
		/* Triggers global alert
		*/
		showAlert: PropTypes.func,
		/**
		 * Network id
		 */
		network: PropTypes.string,
		/**
		 * Prompts protect wallet modal
		 */
		protectWalletModalVisible: PropTypes.func,
		/**
		 * Hides the modal that contains the component
		 */
		hideModal: PropTypes.func,
		/**
		 * redux flag that indicates if the user
		 * completed the seed phrase backup flow
		 */
		seedphraseBackedUp: PropTypes.bool,
	};

	state = {
		qrModalVisible: false,
		buyModalVisible: false,
	};

	/**
	 * Share current account public address
	 */
	onShare = () => {
		const { selectedAddress } = this.props;
		Share.open({
			message: generateUniversalLinkAddress(selectedAddress),
		})
			.then(() => {
				this.props.hideModal();
				setTimeout(() => this.props.protectWalletModalVisible(), 1000);
			})
			.catch((err) => {
				Logger.log('Error while trying to share address', err);
			});
		InteractionManager.runAfterInteractions(() => {
			Analytics.trackEvent(ANALYTICS_EVENT_OPTS.RECEIVE_OPTIONS_SHARE_ADDRESS);
		});
	};

	/**
	 * Shows an alert message with a coming soon message
	 */
	onBuy = async () => {
		const { navigation, toggleReceiveModal, network } = this.props;
		if (!allowedToBuy(network)) {
			Alert.alert(strings('fiat_on_ramp.network_not_supported'), strings('fiat_on_ramp.switch_network'));
		} else {
			toggleReceiveModal();
			navigation.navigate('FiatOnRamp');
			InteractionManager.runAfterInteractions(() => {
				Analytics.trackEvent(ANALYTICS_EVENT_OPTS.WALLET_BUY_ETH);
				AnalyticsV2.trackEvent(AnalyticsV2.ANALYTICS_EVENTS.ONRAMP_OPENED, {
					button_location: 'Receive Modal',
					button_copy: 'Buy ETH',
				});
			});
		}
	};

	copyAccountToClipboard = async () => {
		const { selectedAddress } = this.props;
		ClipboardManager.setString(selectedAddress);
		this.props.showAlert({
			isVisible: true,
			autodismiss: 1500,
			content: 'clipboard-alert',
			data: { msg: strings('account_details.account_copied_to_clipboard') },
		});
		if (!this.props.seedphraseBackedUp) {
			setTimeout(() => this.props.hideModal(), 1000);
			setTimeout(() => this.props.protectWalletModalVisible(), 1500);
		}
	};

	/**
	 * Closes QR code modal
	 */
	closeQrModal = (toggleModal) => {
		this.props.hideModal();
		toggleModal();
	};

	/**
	 * Opens QR code modal
	 */
	openQrModal = () => {
		this.setState({ qrModalVisible: true });
		InteractionManager.runAfterInteractions(() => {
			Analytics.trackEvent(ANALYTICS_EVENT_OPTS.RECEIVE_OPTIONS_QR_CODE);
		});
	};

	onReceive = () => {
		this.props.toggleReceiveModal();
		this.props.navigation.navigate('PaymentRequestView', {
			screen: 'PaymentRequest',
			params: { receiveAsset: this.props.receiveAsset },
		});
		InteractionManager.runAfterInteractions(() => {
			Analytics.trackEvent(ANALYTICS_EVENT_OPTS.RECEIVE_OPTIONS_PAYMENT_REQUEST);
		});
	};

	render() {
		return (
			<SafeAreaView style={styles.wrapper}>
				<ModalDragger />
				<View style={styles.titleWrapper}>
					<Text style={styles.title} testID={'receive-request-screen'}>
						{strings('receive_request.title')}
					</Text>
				</View>
				<View style={styles.body}>
					<ModalHandler>
						{({ isVisible, toggleModal }) => (
							<>
								<TouchableOpacity
									style={styles.qrWrapper}
									// eslint-disable-next-line react/jsx-no-bind
									onPress={() => {
										toggleModal();
										InteractionManager.runAfterInteractions(() => {
											Analytics.trackEvent(ANALYTICS_EVENT_OPTS.RECEIVE_OPTIONS_QR_CODE);
										});
									}}
								>
									<QRCode
										value={`ethereum:${this.props.selectedAddress}`}
										size={Dimensions.get('window').width / 2}
									/>
								</TouchableOpacity>
								<Modal
									isVisible={isVisible}
									onBackdropPress={toggleModal}
									onBackButtonPress={toggleModal}
									onSwipeComplete={toggleModal}
									swipeDirection={'down'}
									propagateSwipe
									testID={'qr-modal'}
								>
									<AddressQRCode closeQrModal={() => this.closeQrModal(toggleModal)} />
								</Modal>
							</>
						)}
					</ModalHandler>

					<Text>{strings('receive_request.scan_address')}</Text>

					<TouchableOpacity
						style={styles.addressWrapper}
						onPress={this.copyAccountToClipboard}
						testID={'account-address'}
					>
						<Text>
							<EthereumAddress address={this.props.selectedAddress} type={'short'} />
						</Text>
						<Text style={styles.copyButton} small>
							{strings('receive_request.copy')}
						</Text>
						<TouchableOpacity onPress={this.onShare}>
							<EvilIcons
								name={Device.isIos() ? 'share-apple' : 'share-google'}
								size={25}
								color={colors.grey600}
							/>
						</TouchableOpacity>
					</TouchableOpacity>
					<View style={styles.actionRow}>
						{allowedToBuy(this.props.network) && (
							<StyledButton type={'blue'} containerStyle={styles.actionButton} onPress={this.onBuy}>
								{strings('fiat_on_ramp.buy_eth')}
							</StyledButton>
						)}
						<StyledButton
							type={'normal'}
							onPress={this.onReceive}
							containerStyle={styles.actionButton}
							testID={'request-payment-button'}
						>
							{strings('receive_request.request_payment')}
						</StyledButton>
					</View>
				</View>

				<GlobalAlert />
			</SafeAreaView>
		);
	}
}

const mapStateToProps = (state) => ({
	network: state.engine.backgroundState.NetworkController.network,
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	receiveAsset: state.modals.receiveAsset,
	seedphraseBackedUp: state.user.seedphraseBackedUp,
});

const mapDispatchToProps = (dispatch) => ({
	toggleReceiveModal: () => dispatch(toggleReceiveModal()),
	showAlert: (config) => dispatch(showAlert(config)),
	protectWalletModalVisible: () => dispatch(protectWalletModalVisible()),
});

export default connect(mapStateToProps, mapDispatchToProps)(ReceiveRequest);
