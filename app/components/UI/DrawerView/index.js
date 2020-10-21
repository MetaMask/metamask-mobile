import React, { PureComponent } from 'react';
import { Alert, TouchableOpacity, View, Image, StyleSheet, Text, ScrollView, InteractionManager } from 'react-native';
import Clipboard from '@react-native-community/clipboard';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import Share from 'react-native-share';
import Icon from 'react-native-vector-icons/FontAwesome';
import FeatherIcon from 'react-native-vector-icons/Feather';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, fontStyles } from '../../../styles/common';
import { hasBlockExplorer, findBlockExplorerForRpc, getBlockExplorerName } from '../../../util/networks';
import Identicon from '../Identicon';
import StyledButton from '../StyledButton';
import AccountList from '../AccountList';
import NetworkList from '../NetworkList';
import { renderFromWei, renderFiat } from '../../../util/number';
import { strings } from '../../../../locales/i18n';
import { DrawerActions } from 'react-navigation-drawer';
import Modal from 'react-native-modal';
import SecureKeychain from '../../../core/SecureKeychain';
import { toggleNetworkModal, toggleAccountsModal, toggleReceiveModal } from '../../../actions/modals';
import { showAlert } from '../../../actions/alert';
import { getEtherscanAddressUrl, getEtherscanBaseUrl } from '../../../util/etherscan';
import Engine from '../../../core/Engine';
import Logger from '../../../util/Logger';
import Device from '../../../util/Device';
import OnboardingWizard from '../OnboardingWizard';
import ReceiveRequest from '../ReceiveRequest';
import Analytics from '../../../core/Analytics';
import AppConstants from '../../../core/AppConstants';
import { ANALYTICS_EVENT_OPTS } from '../../../util/analytics';
import URL from 'url-parse';
import EthereumAddress from '../EthereumAddress';
import { NavigationActions } from 'react-navigation';
import { getEther } from '../../../util/transactions';
import { newAssetTransaction } from '../../../actions/transaction';
import { protectWalletModalVisible } from '../../../actions/user';
import SettingsWarning from '../SettingsWarning';

const styles = StyleSheet.create({
	wrapper: {
		flex: 1,
		backgroundColor: colors.white
	},
	header: {
		paddingTop: Device.isIphoneX() ? 60 : 24,
		backgroundColor: colors.grey000,
		height: Device.isIphoneX() ? 110 : 74,
		flexDirection: 'column',
		paddingBottom: 0
	},
	metamaskLogo: {
		flexDirection: 'row',
		flex: 1,
		marginTop: Device.isAndroid() ? 0 : 12,
		marginLeft: 15,
		paddingTop: Device.isAndroid() ? 10 : 0
	},
	metamaskFox: {
		height: 27,
		width: 27,
		marginRight: 15
	},
	metamaskName: {
		marginTop: 4,
		width: 90,
		height: 18
	},
	account: {
		flex: 1,
		backgroundColor: colors.grey000
	},
	accountBgOverlay: {
		borderBottomColor: colors.grey100,
		borderBottomWidth: 1,
		padding: 17
	},
	identiconWrapper: {
		marginBottom: 12,
		width: 56,
		height: 56
	},
	identiconBorder: {
		borderRadius: 96,
		borderWidth: 2,
		padding: 2,
		borderColor: colors.blue
	},
	accountNameWrapper: {
		flexDirection: 'row',
		paddingRight: 17
	},
	accountName: {
		fontSize: 20,
		lineHeight: 24,
		marginBottom: 5,
		color: colors.fontPrimary,
		...fontStyles.normal
	},
	caretDown: {
		textAlign: 'right',
		marginLeft: 7,
		marginTop: 3,
		fontSize: 18,
		color: colors.fontPrimary
	},
	accountBalance: {
		fontSize: 14,
		lineHeight: 17,
		marginBottom: 5,
		color: colors.fontPrimary,
		...fontStyles.normal
	},
	accountAddress: {
		fontSize: 12,
		lineHeight: 17,
		color: colors.fontSecondary,
		...fontStyles.normal
	},
	buttons: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		borderBottomColor: colors.grey100,
		borderBottomWidth: 1,
		padding: 15
	},
	button: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: 30,
		borderWidth: 1.5
	},
	leftButton: {
		marginRight: 5
	},
	rightButton: {
		marginLeft: 5
	},
	buttonText: {
		paddingLeft: 8,
		fontSize: 15,
		color: colors.blue,
		...fontStyles.normal
	},
	buttonContent: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center'
	},
	buttonIcon: {
		marginTop: 0
	},
	buttonReceive: {
		transform: [{ rotate: '90deg' }]
	},
	menu: {},
	noTopBorder: {
		borderTopWidth: 0
	},
	menuSection: {
		borderTopWidth: 1,
		borderColor: colors.grey100,
		paddingVertical: 10
	},
	menuItem: {
		flex: 1,
		flexDirection: 'row',
		paddingVertical: 9,
		paddingLeft: 17
	},
	selectedRoute: {
		backgroundColor: colors.blue000,
		marginRight: 10,
		borderTopRightRadius: 20,
		borderBottomRightRadius: 20
	},
	selectedName: {
		color: colors.blue
	},
	menuItemName: {
		flex: 1,
		paddingHorizontal: 15,
		paddingTop: 2,
		fontSize: 16,
		color: colors.grey400,
		...fontStyles.normal
	},
	menuItemWarningText: {
		color: colors.red,
		fontSize: 12
	},
	noIcon: {
		paddingLeft: 0
	},
	menuItemIconImage: {
		width: 22,
		height: 22
	},
	bottomModal: {
		justifyContent: 'flex-end',
		margin: 0
	},
	importedWrapper: {
		marginTop: 10,
		width: 73,
		paddingHorizontal: 10,
		paddingVertical: 3,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: colors.grey400
	},
	importedText: {
		color: colors.grey400,
		fontSize: 10,
		...fontStyles.bold
	},
	instapayLogo: {
		width: 24,
		height: 24
	},
	protectWalletContainer: {
		backgroundColor: colors.white,
		paddingTop: 24,
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		paddingVertical: 16,
		paddingBottom: Device.isIphoneX() ? 20 : 0,
		paddingHorizontal: 40
	},
	protectWalletIconContainer: {
		alignSelf: 'center',
		width: 56,
		height: 56,
		borderRadius: 28,
		backgroundColor: colors.red000,
		borderColor: colors.red,
		borderWidth: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center'
	},
	protectWalletIcon: { alignSelf: 'center', color: colors.red },
	protectWalletTitle: { textAlign: 'center', fontSize: 18, marginVertical: 8, ...fontStyles.bold },
	protectWalletContent: {
		textAlign: 'center',
		fontSize: 14,
		marginVertical: 8,
		justifyContent: 'center',
		...fontStyles.normal
	},
	protectWalletButtonWrapper: { marginVertical: 8 }
});

const metamask_name = require('../../../images/metamask-name.png'); // eslint-disable-line
const metamask_fox = require('../../../images/fox.png'); // eslint-disable-line
const ICON_IMAGES = {
	wallet: require('../../../images/wallet-icon.png'),
	'selected-wallet': require('../../../images/selected-wallet-icon.png')
};
const instapay_logo_selected = require('../../../images/mm-instapay-selected.png'); // eslint-disable-line
const instapay_logo = require('../../../images/mm-instapay.png'); // eslint-disable-line

/**
 * View component that displays the MetaMask fox
 * in the middle of the screen
 */
class DrawerView extends PureComponent {
	static propTypes = {
		/**
		/* navigation object required to push new views
		*/
		navigation: PropTypes.object,
		/**
		 * Object representing the selected the selected network
		 */
		network: PropTypes.object.isRequired,
		/**
		 * Selected address as string
		 */
		selectedAddress: PropTypes.string,
		/**
		 * List of accounts from the AccountTrackerController
		 */
		accounts: PropTypes.object,
		/**
		 * List of accounts from the PreferencesController
		 */
		identities: PropTypes.object,
		/**
		/* Selected currency
		*/
		currentCurrency: PropTypes.string,
		/**
		 * List of keyrings
		 */
		keyrings: PropTypes.array,
		/**
		 * Action that toggles the network modal
		 */
		toggleNetworkModal: PropTypes.func,
		/**
		 * Action that toggles the accounts modal
		 */
		toggleAccountsModal: PropTypes.func,
		/**
		 * Action that toggles the receive modal
		 */
		toggleReceiveModal: PropTypes.func,
		/**
		 * Action that shows the global alert
		 */
		showAlert: PropTypes.func.isRequired,
		/**
		 * Boolean that determines the status of the networks modal
		 */
		networkModalVisible: PropTypes.bool.isRequired,
		/**
		 * Boolean that determines the status of the receive modal
		 */
		receiveModalVisible: PropTypes.bool.isRequired,
		/**
		 * Start transaction with asset
		 */
		newAssetTransaction: PropTypes.func.isRequired,
		/**
		 * Boolean that determines the status of the networks modal
		 */
		accountsModalVisible: PropTypes.bool.isRequired,
		/**
		 * Boolean that determines if the user has set a password before
		 */
		passwordSet: PropTypes.bool,
		/**
		 * Wizard onboarding state
		 */
		wizard: PropTypes.object,
		/**
		 * Current provider ticker
		 */
		ticker: PropTypes.string,
		/**
		 * Frequent RPC list from PreferencesController
		 */
		frequentRpcList: PropTypes.array,
		/**
		/* flag that determines the state of payment channels
		*/
		paymentChannelsEnabled: PropTypes.bool,
		/**
		 * Current provider type
		 */
		providerType: PropTypes.string,
		/**
		 * Array of ERC20 assets
		 */
		tokens: PropTypes.array,
		/**
		 * Array of ERC721 assets
		 */
		collectibles: PropTypes.array,
		/**
		 * redux flag that indicates if the user
		 * completed the seed phrase backup flow
		 */
		seedphraseBackedUp: PropTypes.bool,
		/**
		 * An object containing token balances for current account and network in the format address => balance
		 */
		tokenBalances: PropTypes.object,
		/**
		 * Prompts protect wallet modal
		 */
		protectWalletModalVisible: PropTypes.func
	};

	state = {
		showProtectWalletModal: false
	};

	browserSectionRef = React.createRef();

	currentBalance = null;
	previousBalance = null;
	processedNewBalance = false;
	animatingNetworksModal = false;
	animatingAccountsModal = false;

	isCurrentAccountImported() {
		let ret = false;
		const { keyrings, selectedAddress } = this.props;
		const allKeyrings = keyrings && keyrings.length ? keyrings : Engine.context.KeyringController.state.keyrings;
		for (const keyring of allKeyrings) {
			if (keyring.accounts.includes(selectedAddress)) {
				ret = keyring.type !== 'HD Key Tree';
				break;
			}
		}

		return ret;
	}

	componentDidUpdate() {
		if (!this.props.passwordSet || !this.props.seedphraseBackedUp) {
			const route = this.findBottomTabRouteNameFromNavigatorState(this.props.navigation.state);
			if (['SetPasswordFlow', 'Webview'].includes(route)) {
				// eslint-disable-next-line react/no-did-update-set-state
				this.state.showProtectWalletModal && this.setState({ showProtectWalletModal: false });
				return;
			}
			let tokenFound = false;

			this.props.tokens.forEach(token => {
				if (this.props.tokenBalances[token.address] && !this.props.tokenBalances[token.address].isZero()) {
					tokenFound = true;
				}
			});
			if (!this.props.passwordSet || this.currentBalance > 0 || tokenFound || this.props.collectibles.length > 0)
				// eslint-disable-next-line react/no-did-update-set-state
				this.setState({ showProtectWalletModal: true });
		}
	}

	toggleAccountsModal = () => {
		if (!this.animatingAccountsModal) {
			this.animatingAccountsModal = true;
			this.props.toggleAccountsModal();
			setTimeout(() => {
				this.animatingAccountsModal = false;
			}, 500);
		}
		!this.props.accountsModalVisible && this.trackEvent(ANALYTICS_EVENT_OPTS.NAVIGATION_TAPS_ACCOUNT_NAME);
	};

	toggleReceiveModal = () => {
		this.props.toggleReceiveModal();
	};

	onNetworksModalClose = async manualClose => {
		this.toggleNetworksModal();
		if (!manualClose) {
			await this.hideDrawer();
		}
	};

	toggleNetworksModal = () => {
		if (!this.animatingNetworksModal) {
			this.animatingNetworksModal = true;
			this.props.toggleNetworkModal();
			setTimeout(() => {
				this.animatingNetworksModal = false;
			}, 500);
		}
	};

	showReceiveModal = () => {
		this.toggleReceiveModal();
	};

	trackEvent = event => {
		InteractionManager.runAfterInteractions(() => {
			Analytics.trackEvent(event);
		});
	};

	onReceive = () => {
		this.toggleReceiveModal();
		this.trackEvent(ANALYTICS_EVENT_OPTS.NAVIGATION_TAPS_RECEIVE);
	};

	onSend = async () => {
		this.props.newAssetTransaction(getEther());
		this.props.navigation.navigate('SendFlowView');
		this.hideDrawer();
		this.trackEvent(ANALYTICS_EVENT_OPTS.NAVIGATION_TAPS_SEND);
	};

	goToBrowser = () => {
		this.props.navigation.navigate('BrowserTabHome');
		this.hideDrawer();
		this.trackEvent(ANALYTICS_EVENT_OPTS.NAVIGATION_TAPS_BROWSER);
	};

	goToPaymentChannel = () => {
		const { providerType } = this.props;
		if (AppConstants.CONNEXT.SUPPORTED_NETWORKS.indexOf(providerType) !== -1) {
			this.props.navigation.navigate('PaymentChannelHome');
			this.trackEvent(ANALYTICS_EVENT_OPTS.NAVIGATION_TAPS_INSTAPAY);
		} else {
			Alert.alert(
				strings('experimental_settings.network_not_supported'),
				strings('experimental_settings.switch_network')
			);
		}
		this.hideDrawer();
	};

	showWallet = () => {
		this.props.navigation.navigate('WalletTabHome');
		this.hideDrawer();
		this.trackEvent(ANALYTICS_EVENT_OPTS.NAVIGATION_TAPS_WALLET);
	};

	goToTransactionHistory = () => {
		this.props.navigation.navigate('TransactionsHome');
		this.hideDrawer();
		this.trackEvent(ANALYTICS_EVENT_OPTS.NAVIGATION_TAPS_TRANSACTION_HISTORY);
	};

	showSettings = async () => {
		this.props.navigation.navigate('SettingsView');
		this.hideDrawer();
		this.trackEvent(ANALYTICS_EVENT_OPTS.NAVIGATION_TAPS_SETTINGS);
	};

	onPress = async () => {
		const { passwordSet } = this.props;
		const { KeyringController } = Engine.context;
		await SecureKeychain.resetGenericPassword();
		await KeyringController.setLocked();
		if (!passwordSet) {
			this.props.navigation.navigate(
				'OnboardingRootNav',
				{},
				NavigationActions.navigate({ routeName: 'Onboarding' })
			);
		} else {
			this.props.navigation.navigate('Login');
		}
	};

	logout = () => {
		Alert.alert(
			strings('drawer.logout_title'),
			'',
			[
				{
					text: strings('drawer.logout_cancel'),
					onPress: () => null,
					style: 'cancel'
				},
				{
					text: strings('drawer.logout_ok'),
					onPress: this.onPress
				}
			],
			{ cancelable: false }
		);
		this.trackEvent(ANALYTICS_EVENT_OPTS.NAVIGATION_TAPS_LOGOUT);
	};

	viewInEtherscan = () => {
		const {
			selectedAddress,
			network,
			network: {
				provider: { rpcTarget }
			},
			frequentRpcList
		} = this.props;
		if (network.provider.type === 'rpc') {
			const blockExplorer = findBlockExplorerForRpc(rpcTarget, frequentRpcList);
			const url = `${blockExplorer}/address/${selectedAddress}`;
			const title = new URL(blockExplorer).hostname;
			this.goToBrowserUrl(url, title);
		} else {
			const url = getEtherscanAddressUrl(network.provider.type, selectedAddress);
			const etherscan_url = getEtherscanBaseUrl(network.provider.type).replace('https://', '');
			this.goToBrowserUrl(url, etherscan_url);
		}
		this.trackEvent(ANALYTICS_EVENT_OPTS.NAVIGATION_TAPS_VIEW_ETHERSCAN);
	};

	submitFeedback = () => {
		this.trackEvent(ANALYTICS_EVENT_OPTS.NAVIGATION_TAPS_SEND_FEEDBACK);
		this.goToBrowserUrl('https://metamask.zendesk.com/hc/en-us/requests/new', strings('drawer.metamask_support'));
	};

	showHelp = () => {
		this.goToBrowserUrl('https://support.metamask.io', strings('drawer.metamask_support'));
		this.trackEvent(ANALYTICS_EVENT_OPTS.NAVIGATION_TAPS_GET_HELP);
	};

	goToBrowserUrl(url, title) {
		this.props.navigation.navigate('Webview', {
			url,
			title
		});
		this.hideDrawer();
	}

	hideDrawer() {
		return new Promise(resolve => {
			this.props.navigation.dispatch(DrawerActions.closeDrawer());
			setTimeout(() => {
				resolve();
			}, 300);
		});
	}

	onAccountChange = () => {
		setTimeout(() => {
			this.toggleAccountsModal();
			this.hideDrawer();
		}, 300);
	};

	onImportAccount = () => {
		this.toggleAccountsModal();
		this.props.navigation.navigate('ImportPrivateKey');
		this.hideDrawer();
	};

	hasBlockExplorer = providerType => {
		const { frequentRpcList } = this.props;
		if (providerType === 'rpc') {
			const {
				network: {
					provider: { rpcTarget }
				}
			} = this.props;
			const blockExplorer = findBlockExplorerForRpc(rpcTarget, frequentRpcList);
			if (blockExplorer) {
				return true;
			}
		}
		return hasBlockExplorer(providerType);
	};

	getIcon(name, size) {
		return <Icon name={name} size={size || 24} color={colors.grey400} />;
	}

	getFeatherIcon(name, size) {
		return <FeatherIcon name={name} size={size || 24} color={colors.grey400} />;
	}

	getMaterialIcon(name, size) {
		return <MaterialIcon name={name} size={size || 24} color={colors.grey400} />;
	}

	getImageIcon(name) {
		return <Image source={ICON_IMAGES[name]} style={styles.menuItemIconImage} />;
	}

	getSelectedIcon(name, size) {
		return <Icon name={name} size={size || 24} color={colors.blue} />;
	}

	getSelectedFeatherIcon(name, size) {
		return <FeatherIcon name={name} size={size || 24} color={colors.blue} />;
	}

	getSelectedMaterialIcon(name, size) {
		return <MaterialIcon name={name} size={size || 24} color={colors.blue} />;
	}

	getSelectedImageIcon(name) {
		return <Image source={ICON_IMAGES[`selected-${name}`]} style={styles.menuItemIconImage} />;
	}

	getSections = () => {
		const {
			network: {
				provider: { type, rpcTarget }
			},
			frequentRpcList,
			paymentChannelsEnabled
		} = this.props;
		let blockExplorer, blockExplorerName;
		if (type === 'rpc') {
			blockExplorer = findBlockExplorerForRpc(rpcTarget, frequentRpcList);
			blockExplorerName = getBlockExplorerName(blockExplorer);
		}
		return [
			[
				{
					name: strings('drawer.browser'),
					icon: this.getIcon('globe'),
					selectedIcon: this.getSelectedIcon('globe'),
					action: this.goToBrowser,
					routeNames: ['BrowserView', 'AddBookmark']
				},
				{
					name: strings('drawer.wallet'),
					icon: this.getImageIcon('wallet'),
					selectedIcon: this.getSelectedImageIcon('wallet'),
					action: this.showWallet,
					routeNames: ['WalletView', 'Asset', 'AddAsset', 'Collectible', 'CollectibleView']
				},
				paymentChannelsEnabled && {
					name: strings('drawer.insta_pay'),
					icon: <Image source={instapay_logo} style={styles.instapayLogo} />,
					selectedIcon: <Image source={instapay_logo_selected} style={styles.instapayLogo} />,
					action: this.goToPaymentChannel
				},
				{
					name: strings('drawer.transaction_history'),
					icon: this.getFeatherIcon('list'),
					selectedIcon: this.getSelectedFeatherIcon('list'),
					action: this.goToTransactionHistory,
					routeNames: ['TransactionsView']
				}
			],
			[
				{
					name: strings('drawer.share_address'),
					icon: this.getMaterialIcon('share-variant'),
					action: this.onShare
				},
				{
					name:
						(blockExplorer && `${strings('drawer.view_in')} ${blockExplorerName}`) ||
						strings('drawer.view_in_etherscan'),
					icon: this.getIcon('eye'),
					action: this.viewInEtherscan
				}
			],
			[
				{
					name: strings('drawer.settings'),
					icon: this.getFeatherIcon('settings'),
					warning: strings('drawer.settings_warning'),
					action: this.showSettings
				},
				{
					name: strings('drawer.help'),
					icon: this.getFeatherIcon('help-circle'),
					action: this.showHelp
				},
				{
					name: strings('drawer.submit_feedback'),
					icon: this.getFeatherIcon('message-square'),
					action: this.submitFeedback
				},
				{
					name: strings('drawer.logout'),
					icon: this.getFeatherIcon('log-out'),
					action: this.logout
				}
			]
		];
	};

	copyAccountToClipboard = async () => {
		const { selectedAddress } = this.props;
		await Clipboard.setString(selectedAddress);
		this.toggleReceiveModal();
		InteractionManager.runAfterInteractions(() => {
			this.props.showAlert({
				isVisible: true,
				autodismiss: 1500,
				content: 'clipboard-alert',
				data: { msg: strings('account_details.account_copied_to_clipboard') }
			});
		});
	};

	onShare = () => {
		const { selectedAddress } = this.props;
		Share.open({
			message: selectedAddress
		})
			.then(() => {
				this.props.protectWalletModalVisible();
			})
			.catch(err => {
				Logger.log('Error while trying to share address', err);
			});
		this.trackEvent(ANALYTICS_EVENT_OPTS.NAVIGATION_TAPS_SHARE_PUBLIC_ADDRESS);
	};

	findRouteNameFromNavigatorState({ routes }) {
		let route = routes[routes.length - 1];
		while (route.index !== undefined) {
			route = route.routes[route.index];
		}
		return route.routeName;
	}

	findBottomTabRouteNameFromNavigatorState({ routes }) {
		let route = routes[routes.length - 1];
		let routeName;
		while (route.index !== undefined) {
			routeName = route.routeName;
			route = route.routes[route.index];
		}
		return routeName;
	}

	/**
	 * Return step 5 of onboarding wizard if that is the current step
	 */
	renderOnboardingWizard = () => {
		const {
			wizard: { step }
		} = this.props;
		return (
			step === 5 && <OnboardingWizard navigation={this.props.navigation} coachmarkRef={this.browserSectionRef} />
		);
	};

	onSecureWalletModalAction = () => {
		this.setState({ showProtectWalletModal: false });
		this.props.navigation.navigate(this.props.passwordSet ? 'AccountBackupStep1' : 'SetPasswordFlow');
	};

	drillIntoSecuritySettings = () => {
		this.props.navigation.navigate('SecuritySettings');
	};

	renderProtectModal = () => (
		<Modal
			isVisible={this.state.showProtectWalletModal}
			animationIn="slideInUp"
			animationOut="slideOutDown"
			style={styles.bottomModal}
			backdropOpacity={0.7}
			animationInTiming={600}
			animationOutTiming={600}
		>
			<View style={styles.protectWalletContainer}>
				<View style={styles.protectWalletIconContainer}>
					<FeatherIcon style={styles.protectWalletIcon} name="alert-triangle" size={20} />
				</View>
				<Text style={styles.protectWalletTitle}>{strings('protect_your_wallet_modal.title')}</Text>
				<Text style={styles.protectWalletContent}>
					{!this.props.passwordSet
						? strings('protect_your_wallet_modal.body_for_password')
						: strings('protect_your_wallet_modal.body_for_seedphrase')}
				</Text>
				<View style={styles.protectWalletButtonWrapper}>
					<StyledButton type={'confirm'} onPress={this.onSecureWalletModalAction}>
						{strings('protect_your_wallet_modal.button')}
					</StyledButton>
				</View>
			</View>
		</Modal>
	);

	render() {
		const { network, accounts, identities, selectedAddress, keyrings, currentCurrency, ticker } = this.props;
		const account = { address: selectedAddress, ...identities[selectedAddress], ...accounts[selectedAddress] };
		account.balance = (accounts[selectedAddress] && renderFromWei(accounts[selectedAddress].balance)) || 0;
		const fiatBalance = Engine.getTotalFiatAccountBalance();
		if (fiatBalance !== this.previousBalance) {
			this.previousBalance = this.currentBalance;
		}
		this.currentBalance = fiatBalance;
		const fiatBalanceStr = renderFiat(this.currentBalance, currentCurrency);
		const currentRoute = this.findRouteNameFromNavigatorState(this.props.navigation.state);
		return (
			<View style={styles.wrapper} testID={'drawer-screen'}>
				<ScrollView>
					<View style={styles.header}>
						<View style={styles.metamaskLogo}>
							<Image source={metamask_fox} style={styles.metamaskFox} resizeMethod={'auto'} />
							<Image source={metamask_name} style={styles.metamaskName} resizeMethod={'auto'} />
						</View>
					</View>
					<View style={styles.account}>
						<View style={styles.accountBgOverlay}>
							<TouchableOpacity
								style={styles.identiconWrapper}
								onPress={this.toggleAccountsModal}
								testID={'navbar-account-identicon'}
							>
								<View style={styles.identiconBorder}>
									<Identicon diameter={48} address={selectedAddress} />
								</View>
							</TouchableOpacity>
							<TouchableOpacity
								style={styles.accountInfo}
								onPress={this.toggleAccountsModal}
								testID={'navbar-account-button'}
							>
								<View style={styles.accountNameWrapper}>
									<Text style={styles.accountName} numberOfLines={1}>
										{account.name}
									</Text>
									<Icon name="caret-down" size={24} style={styles.caretDown} />
								</View>
								<Text style={styles.accountBalance}>{fiatBalanceStr}</Text>
								<EthereumAddress
									address={account.address}
									style={styles.accountAddress}
									type={'short'}
								/>
								{this.isCurrentAccountImported() && (
									<View style={styles.importedWrapper}>
										<Text numberOfLines={1} style={styles.importedText}>
											{strings('accounts.imported')}
										</Text>
									</View>
								)}
							</TouchableOpacity>
						</View>
					</View>
					<View style={styles.buttons}>
						<StyledButton
							type={'rounded-normal'}
							onPress={this.onSend}
							containerStyle={[styles.button, styles.leftButton]}
						>
							<View style={styles.buttonContent}>
								<MaterialIcon
									name={'arrow-top-right'}
									size={22}
									color={colors.blue}
									style={styles.buttonIcon}
								/>
								<Text style={styles.buttonText}>{strings('drawer.send_button')}</Text>
							</View>
						</StyledButton>
						<StyledButton
							type={'rounded-normal'}
							onPress={this.onReceive}
							containerStyle={[styles.button, styles.rightButton]}
							testID={'drawer-receive-button'}
						>
							<View style={styles.buttonContent}>
								<MaterialIcon
									name={'keyboard-tab'}
									size={22}
									color={colors.blue}
									style={[styles.buttonIcon, styles.buttonReceive]}
								/>
								<Text style={styles.buttonText}>{strings('drawer.receive_button')}</Text>
							</View>
						</StyledButton>
					</View>
					<View style={styles.menu}>
						{this.getSections().map((section, i) => (
							<View
								key={`section_${i}`}
								style={[styles.menuSection, i === 0 ? styles.noTopBorder : null]}
							>
								{section
									.filter(item => {
										if (!item) return undefined;
										const { name = undefined } = item;
										if (name && name.toLowerCase().indexOf('etherscan') !== -1) {
											const type = network.provider?.type;
											return (type && this.hasBlockExplorer(type)) || undefined;
										}
										return true;
									})
									.map((item, j) => (
										<TouchableOpacity
											key={`item_${i}_${j}`}
											style={[
												styles.menuItem,
												item.routeNames && item.routeNames.includes(currentRoute)
													? styles.selectedRoute
													: null
											]}
											ref={item.name === strings('drawer.browser') && this.browserSectionRef}
											onPress={() => item.action()} // eslint-disable-line
										>
											{item.icon
												? item.routeNames && item.routeNames.includes(currentRoute)
													? item.selectedIcon
													: item.icon
												: null}
											<Text
												style={[
													styles.menuItemName,
													!item.icon ? styles.noIcon : null,
													item.routeNames && item.routeNames.includes(currentRoute)
														? styles.selectedName
														: null
												]}
												numberOfLines={1}
											>
												{item.name}
											</Text>
											{item.warning ? (
												<SettingsWarning
													isNotification
													isWarning
													onPress={this.drillIntoSecuritySettings}
												>
													<Text style={styles.menuItemWarningText}>{item.warning}</Text>
												</SettingsWarning>
											) : null}
										</TouchableOpacity>
									))}
							</View>
						))}
					</View>
				</ScrollView>
				<Modal
					isVisible={this.props.networkModalVisible}
					onBackdropPress={this.toggleNetworksModal}
					onBackButtonPress={this.toggleNetworksModal}
					onSwipeComplete={this.toggleNetworksModal}
					swipeDirection={'down'}
					propagateSwipe
				>
					<NetworkList onClose={this.onNetworksModalClose} />
				</Modal>
				<Modal
					isVisible={this.props.accountsModalVisible}
					style={styles.bottomModal}
					onBackdropPress={this.toggleAccountsModal}
					onBackButtonPress={this.toggleAccountsModal}
					onSwipeComplete={this.toggleAccountsModal}
					swipeDirection={'down'}
					propagateSwipe
				>
					<AccountList
						enableAccountsAddition
						identities={identities}
						selectedAddress={selectedAddress}
						keyrings={keyrings}
						onAccountChange={this.onAccountChange}
						onImportAccount={this.onImportAccount}
						ticker={ticker}
					/>
				</Modal>
				{this.renderOnboardingWizard()}
				<Modal
					isVisible={this.props.receiveModalVisible}
					onBackdropPress={this.toggleReceiveModal}
					onBackButtonPress={this.toggleReceiveModal}
					onSwipeComplete={this.toggleReceiveModal}
					swipeDirection={'down'}
					propagateSwipe
					style={styles.bottomModal}
				>
					<ReceiveRequest
						navigation={this.props.navigation}
						hideModal={this.toggleReceiveModal}
						showReceiveModal={this.showReceiveModal}
					/>
				</Modal>
				{this.renderProtectModal()}
			</View>
		);
	}
}

const mapStateToProps = state => ({
	network: state.engine.backgroundState.NetworkController,
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	accounts: state.engine.backgroundState.AccountTrackerController.accounts,
	identities: state.engine.backgroundState.PreferencesController.identities,
	frequentRpcList: state.engine.backgroundState.PreferencesController.frequentRpcList,
	currentCurrency: state.engine.backgroundState.CurrencyRateController.currentCurrency,
	keyrings: state.engine.backgroundState.KeyringController.keyrings,
	networkModalVisible: state.modals.networkModalVisible,
	accountsModalVisible: state.modals.accountsModalVisible,
	receiveModalVisible: state.modals.receiveModalVisible,
	passwordSet: state.user.passwordSet,
	wizard: state.wizard,
	ticker: state.engine.backgroundState.NetworkController.provider.ticker,
	providerType: state.engine.backgroundState.NetworkController.provider.type,
	paymentChannelsEnabled: state.settings.paymentChannelsEnabled,
	tokens: state.engine.backgroundState.AssetsController.tokens,
	tokenBalances: state.engine.backgroundState.TokenBalancesController.contractBalances,
	collectibles: state.engine.backgroundState.AssetsController.collectibles,
	seedphraseBackedUp: state.user.seedphraseBackedUp
});

const mapDispatchToProps = dispatch => ({
	toggleNetworkModal: () => dispatch(toggleNetworkModal()),
	toggleAccountsModal: () => dispatch(toggleAccountsModal()),
	toggleReceiveModal: () => dispatch(toggleReceiveModal()),
	showAlert: config => dispatch(showAlert(config)),
	newAssetTransaction: selectedAsset => dispatch(newAssetTransaction(selectedAsset)),
	protectWalletModalVisible: () => dispatch(protectWalletModalVisible())
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(DrawerView);
