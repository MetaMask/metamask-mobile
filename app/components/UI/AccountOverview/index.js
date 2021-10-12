import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { ScrollView, TextInput, StyleSheet, Text, View, TouchableOpacity, InteractionManager } from 'react-native';
import { swapsUtils } from '@metamask/swaps-controller';
import { connect } from 'react-redux';
import Engine from '../../../core/Engine';
import Analytics from '../../../core/Analytics';
import AnalyticsV2 from '../../../util/analyticsV2';
import AppConstants from '../../../core/AppConstants';
import { strings } from '../../../../locales/i18n';

import { swapsLivenessSelector } from '../../../reducers/swaps';
import { showAlert } from '../../../actions/alert';
import { protectWalletModalVisible } from '../../../actions/user';
import { toggleAccountsModal, toggleReceiveModal } from '../../../actions/modals';
import { newAssetTransaction } from '../../../actions/transaction';

import Device from '../../../util/device';
import { ANALYTICS_EVENT_OPTS } from '../../../util/analytics';
import { renderFiat } from '../../../util/number';
import { renderAccountName } from '../../../util/address';
import { getEther } from '../../../util/transactions';
import { doENSReverseLookup, isDefaultAccountName } from '../../../util/ENSUtils';
import { isSwapsAllowed } from '../Swaps/utils';

import Identicon from '../Identicon';
import AssetActionButton from '../AssetActionButton';
import EthereumAddress from '../EthereumAddress';
import { colors, fontStyles, baseStyles } from '../../../styles/common';
import { allowedToBuy } from '../FiatOrders';
import AssetSwapButton from '../Swaps/components/AssetSwapButton';
import ClipboardManager from '../../../core/ClipboardManager';

const styles = StyleSheet.create({
	scrollView: {
		backgroundColor: colors.white,
	},
	wrapper: {
		paddingTop: 20,
		paddingHorizontal: 20,
		paddingBottom: 0,
		alignItems: 'center',
	},
	info: {
		justifyContent: 'center',
		alignItems: 'center',
		textAlign: 'center',
	},
	data: {
		textAlign: 'center',
		paddingTop: 7,
	},
	label: {
		fontSize: 24,
		textAlign: 'center',
		...fontStyles.normal,
	},
	labelInput: {
		marginBottom: Device.isAndroid() ? -10 : 0,
	},
	addressWrapper: {
		backgroundColor: colors.blue000,
		borderRadius: 40,
		marginTop: 20,
		marginBottom: 20,
		paddingVertical: 7,
		paddingHorizontal: 15,
	},
	address: {
		fontSize: 12,
		color: colors.grey400,
		...fontStyles.normal,
		letterSpacing: 0.8,
	},
	amountFiat: {
		fontSize: 12,
		paddingTop: 5,
		color: colors.fontSecondary,
		...fontStyles.normal,
	},
	identiconBorder: {
		borderRadius: 80,
		borderWidth: 2,
		padding: 2,
		borderColor: colors.blue,
	},
	onboardingWizardLabel: {
		borderWidth: 2,
		borderRadius: 4,
		paddingVertical: Device.isIos() ? 2 : -4,
		paddingHorizontal: Device.isIos() ? 5 : 5,
		top: Device.isIos() ? 0 : -2,
	},
	actions: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'flex-start',
		flexDirection: 'row',
	},
});

/**
 * View that's part of the <Wallet /> component
 * which shows information about the selected account
 */
class AccountOverview extends PureComponent {
	static propTypes = {
		/**
		 * String that represents the selected address
		 */
		selectedAddress: PropTypes.string,
		/**
		/* Identities object required to get account name
		*/
		identities: PropTypes.object,
		/**
		 * Object that represents the selected account
		 */
		account: PropTypes.object,
		/**
		/* Selected currency
		*/
		currentCurrency: PropTypes.string,
		/**
		/* Triggers global alert
		*/
		showAlert: PropTypes.func,
		/**
		 * Action that toggles the accounts modal
		 */
		toggleAccountsModal: PropTypes.func,
		/**
		 * whether component is being rendered from onboarding wizard
		 */
		onboardingWizard: PropTypes.bool,
		/**
		 * Used to get child ref
		 */
		onRef: PropTypes.func,
		/**
		 * Prompts protect wallet modal
		 */
		protectWalletModalVisible: PropTypes.func,
		/**
		 * Start transaction with asset
		 */
		newAssetTransaction: PropTypes.func,
		/**
		/* navigation object required to access the props
		/* passed by the parent component
		*/
		navigation: PropTypes.object,
		/**
		 * Action that toggles the receive modal
		 */
		toggleReceiveModal: PropTypes.func,
		/**
		 * Chain id
		 */
		chainId: PropTypes.string,
		/**
		 * Wether Swaps feature is live or not
		 */
		swapsIsLive: PropTypes.bool,
		/**
		 * ID of the current network
		 */
		network: PropTypes.string,
		/**
		 * Current provider ticker
		 */
		ticker: PropTypes.string,
	};

	state = {
		accountLabelEditable: false,
		accountLabel: '',
		originalAccountLabel: '',
		ens: undefined,
	};

	editableLabelRef = React.createRef();
	scrollViewContainer = React.createRef();
	mainView = React.createRef();

	animatingAccountsModal = false;

	toggleAccountsModal = () => {
		const { onboardingWizard } = this.props;
		if (!onboardingWizard && !this.animatingAccountsModal) {
			this.animatingAccountsModal = true;
			this.props.toggleAccountsModal();
			setTimeout(() => {
				this.animatingAccountsModal = false;
			}, 500);
		}
	};

	input = React.createRef();

	componentDidMount = () => {
		const { identities, selectedAddress, onRef } = this.props;
		const accountLabel = renderAccountName(selectedAddress, identities);
		this.setState({ accountLabel });
		onRef && onRef(this);
		InteractionManager.runAfterInteractions(() => {
			this.doENSLookup();
		});
	};

	componentDidUpdate(prevProps) {
		if (prevProps.account.address !== this.props.account.address || prevProps.network !== this.props.network) {
			requestAnimationFrame(() => {
				this.doENSLookup();
			});
		}
	}

	setAccountLabel = () => {
		const { PreferencesController } = Engine.context;
		const { selectedAddress } = this.props;
		const { accountLabel } = this.state;
		PreferencesController.setAccountLabel(selectedAddress, accountLabel);
		this.setState({ accountLabelEditable: false });
	};

	onAccountLabelChange = (accountLabel) => {
		this.setState({ accountLabel });
	};

	setAccountLabelEditable = () => {
		const { identities, selectedAddress } = this.props;
		const accountLabel = renderAccountName(selectedAddress, identities);
		this.setState({ accountLabelEditable: true, accountLabel });
		setTimeout(() => {
			this.input && this.input.current && this.input.current.focus();
		}, 100);
	};

	cancelAccountLabelEdition = () => {
		const { identities, selectedAddress } = this.props;
		const accountLabel = renderAccountName(selectedAddress, identities);
		this.setState({ accountLabelEditable: false, accountLabel });
	};

	copyAccountToClipboard = async () => {
		const { selectedAddress } = this.props;
		await ClipboardManager.setString(selectedAddress);
		this.props.showAlert({
			isVisible: true,
			autodismiss: 1500,
			content: 'clipboard-alert',
			data: { msg: strings('account_details.account_copied_to_clipboard') },
		});
		setTimeout(() => this.props.protectWalletModalVisible(), 2000);
		InteractionManager.runAfterInteractions(() => {
			Analytics.trackEvent(ANALYTICS_EVENT_OPTS.WALLET_COPIED_ADDRESS);
		});
	};

	onReceive = () => this.props.toggleReceiveModal();

	onSend = () => {
		const { newAssetTransaction, navigation, ticker } = this.props;
		newAssetTransaction(getEther(ticker));
		navigation.navigate('SendFlowView');
	};

	onBuy = () => {
		this.props.navigation.navigate('FiatOnRamp');
		InteractionManager.runAfterInteractions(() => {
			Analytics.trackEvent(ANALYTICS_EVENT_OPTS.WALLET_BUY_ETH);
			AnalyticsV2.trackEvent(AnalyticsV2.ANALYTICS_EVENTS.ONRAMP_OPENED, {
				button_location: 'Home Screen',
				button_copy: 'Buy',
			});
		});
	};

	goToSwaps = () =>
		this.props.navigation.navigate('Swaps', {
			screen: 'SwapsAmountView',
			params: {
				sourceToken: swapsUtils.NATIVE_SWAPS_TOKEN_ADDRESS,
			},
		});

	doENSLookup = async () => {
		const { network, account } = this.props;
		try {
			const ens = await doENSReverseLookup(account.address, network);
			this.setState({ ens });
			// eslint-disable-next-line no-empty
		} catch {}
	};

	render() {
		const {
			account: { address, name },
			currentCurrency,
			onboardingWizard,
			chainId,
			swapsIsLive,
		} = this.props;

		const fiatBalance = `${renderFiat(Engine.getTotalFiatAccountBalance(), currentCurrency)}`;

		if (!address) return null;
		const { accountLabelEditable, accountLabel, ens } = this.state;

		return (
			<View style={baseStyles.flexGrow} ref={this.scrollViewContainer} collapsable={false}>
				<ScrollView
					bounces={false}
					keyboardShouldPersistTaps={'never'}
					style={styles.scrollView}
					contentContainerStyle={styles.wrapper}
					testID={'account-overview'}
				>
					<View style={styles.info} ref={this.mainView}>
						<TouchableOpacity
							style={styles.identiconBorder}
							disabled={onboardingWizard}
							onPress={this.toggleAccountsModal}
							testID={'wallet-account-identicon'}
						>
							<Identicon address={address} diameter={38} noFadeIn={onboardingWizard} />
						</TouchableOpacity>
						<View ref={this.editableLabelRef} style={styles.data} collapsable={false}>
							{accountLabelEditable ? (
								<TextInput
									style={[
										styles.label,
										styles.labelInput,
										styles.onboardingWizardLabel,
										onboardingWizard ? { borderColor: colors.blue } : { borderColor: colors.white },
									]}
									editable={accountLabelEditable}
									onChangeText={this.onAccountLabelChange}
									onSubmitEditing={this.setAccountLabel}
									onBlur={this.setAccountLabel}
									testID={'account-label-text-input'}
									value={accountLabel}
									selectTextOnFocus
									ref={this.input}
									returnKeyType={'done'}
									autoCapitalize={'none'}
									autoCorrect={false}
									numberOfLines={1}
								/>
							) : (
								<TouchableOpacity onLongPress={this.setAccountLabelEditable}>
									<Text
										style={[
											styles.label,
											styles.onboardingWizardLabel,
											onboardingWizard
												? { borderColor: colors.blue }
												: { borderColor: colors.white },
										]}
										numberOfLines={1}
										testID={'edit-account-label'}
									>
										{isDefaultAccountName(name) && ens ? ens : name}
									</Text>
								</TouchableOpacity>
							)}
						</View>
						<Text style={styles.amountFiat}>{fiatBalance}</Text>
						<TouchableOpacity style={styles.addressWrapper} onPress={this.copyAccountToClipboard}>
							<EthereumAddress address={address} style={styles.address} type={'short'} />
						</TouchableOpacity>

						<View style={styles.actions}>
							<AssetActionButton
								icon="receive"
								onPress={this.onReceive}
								label={strings('asset_overview.receive_button')}
							/>
							{allowedToBuy(chainId) && (
								<AssetActionButton
									icon="buy"
									onPress={this.onBuy}
									label={strings('asset_overview.buy_button')}
								/>
							)}
							<AssetActionButton
								testID={'token-send-button'}
								icon="send"
								onPress={this.onSend}
								label={strings('asset_overview.send_button')}
							/>
							{AppConstants.SWAPS.ACTIVE && (
								<AssetSwapButton
									isFeatureLive={swapsIsLive}
									isNetworkAllowed={isSwapsAllowed(chainId)}
									onPress={this.goToSwaps}
									isAssetAllowed
								/>
							)}
						</View>
					</View>
				</ScrollView>
			</View>
		);
	}
}

const mapStateToProps = (state) => ({
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	identities: state.engine.backgroundState.PreferencesController.identities,
	currentCurrency: state.engine.backgroundState.CurrencyRateController.currentCurrency,
	chainId: state.engine.backgroundState.NetworkController.provider.chainId,
	ticker: state.engine.backgroundState.NetworkController.provider.ticker,
	network: state.engine.backgroundState.NetworkController.network,
	swapsIsLive: swapsLivenessSelector(state),
});

const mapDispatchToProps = (dispatch) => ({
	showAlert: (config) => dispatch(showAlert(config)),
	toggleAccountsModal: () => dispatch(toggleAccountsModal()),
	protectWalletModalVisible: () => dispatch(protectWalletModalVisible()),
	newAssetTransaction: (selectedAsset) => dispatch(newAssetTransaction(selectedAsset)),
	toggleReceiveModal: (asset) => dispatch(toggleReceiveModal(asset)),
});

export default connect(mapStateToProps, mapDispatchToProps)(AccountOverview);
