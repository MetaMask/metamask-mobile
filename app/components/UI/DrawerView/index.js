import React, { Component } from 'react';
import {
	Alert,
	Clipboard,
	Platform,
	ImageBackground,
	TouchableOpacity,
	SafeAreaView,
	View,
	Image,
	StyleSheet,
	Text,
	ScrollView
} from 'react-native';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import Icon from 'react-native-vector-icons/FontAwesome';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import IonicIcon from 'react-native-vector-icons/Ionicons';
import FoundationIcon from 'react-native-vector-icons/Foundation';
import { colors, fontStyles } from '../../../styles/common';
import Networks, { hasBlockExplorer } from '../../../util/networks';
import Identicon from '../Identicon';
import StyledButton from '../StyledButton';
import AccountList from '../AccountList';
import NetworkList from '../NetworkList';
import { renderFromWei, renderFiat } from '../../../util/number';
import { strings } from '../../../../locales/i18n';
import { DrawerActions } from 'react-navigation-drawer'; // eslint-disable-line
import Modal from 'react-native-modal';
import { toChecksumAddress } from 'ethereumjs-util';
import SecureKeychain from '../../../core/SecureKeychain';
import { toggleNetworkModal } from '../../../actions/modals';
import { showAlert } from '../../../actions/alert';
import { getEtherscanAddressUrl } from '../../../util/etherscan';
import { renderShortAddress } from '../../../util/address';
import Engine from '../../../core/Engine';
import AppConstants from '../../../core/AppConstants';
import { setTokensTransaction } from '../../../actions/transaction';
import findFirstIncomingTransaction from '../../../util/accountSecurity';

const styles = StyleSheet.create({
	wrapper: {
		flex: 1,
		backgroundColor: colors.white
	},
	header: {
		height: 40,
		flexDirection: 'column',
		paddingBottom: 10
	},
	network: {
		paddingVertical: Platform.OS === 'android' ? 5 : 7,
		paddingHorizontal: 12,
		flexDirection: 'row',
		alignSelf: 'flex-end',
		marginRight: 10,
		marginTop: Platform.OS === 'android' ? -3 : -5,
		borderRadius: 15,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: colors.fontSecondary
	},
	networkName: {
		textAlign: 'right',
		fontSize: 10,
		color: colors.fontSecondary,
		...fontStyles.normal
	},
	networkIcon: {
		width: 5,
		height: 5,
		borderRadius: 100,
		marginRight: 5,
		marginTop: Platform.OS === 'android' ? 5 : 3
	},
	caretDownNetwork: {
		marginLeft: 7,
		marginTop: 0,
		fontSize: 12,
		color: colors.fontSecondary
	},
	metamaskLogo: {
		flexDirection: 'row',
		flex: 1,
		marginTop: Platform.OS === 'android' ? 0 : 10,
		marginLeft: 17,
		paddingTop: Platform.OS === 'android' ? 10 : 0
	},
	metamaskFox: {
		height: 22,
		width: 22,
		marginRight: 3
	},
	metamaskName: {
		marginTop: 5,
		width: 78,
		height: 10
	},
	account: {
		backgroundColor: colors.white
	},
	accountBg: {
		width: '100%',
		height: 150
	},
	accountBgOverlay: {
		backgroundColor: colors.overlay,
		padding: 17
	},
	identiconWrapper: {
		marginBottom: 12
	},
	accountNameWrapper: {
		flexDirection: 'row'
	},
	accountName: {
		fontSize: 20,
		lineHeight: 24,
		color: colors.white,
		...fontStyles.normal
	},
	caretDown: {
		textAlign: 'right',
		marginLeft: 7,
		marginTop: 3,
		fontSize: 18,
		color: colors.white
	},
	accountBalance: {
		fontSize: 12,
		lineHeight: 16,
		color: colors.white,
		...fontStyles.normal
	},
	accountAddress: {
		fontSize: 12,
		lineHeight: 16,
		color: colors.white,
		...fontStyles.normal
	},
	qrCodeWrapper: {
		position: 'absolute',
		right: 17,
		top: 17
	},
	infoIcon: {
		color: colors.white
	},
	buttons: {
		flexDirection: 'row',
		padding: 17
	},
	button: {
		flex: 1,
		flexDirection: 'row',
		borderRadius: 30,
		borderWidth: 1
	},
	leftButton: {
		marginRight: 5
	},
	rightButton: {
		marginLeft: 5
	},
	buttonText: {
		marginLeft: Platform.OS === 'ios' ? 8 : 28,
		marginTop: Platform.OS === 'ios' ? 0 : -17,
		fontSize: 15,
		color: colors.primary,
		...fontStyles.normal
	},
	buttonContent: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'flex-start',
		justifyContent: 'center'
	},
	buttonIcon: {
		width: 15,
		height: 15,
		marginTop: 0
	},
	menu: {
		marginLeft: 17
	},
	menuSection: {
		borderTopWidth: 1,
		borderColor: colors.borderColor,
		paddingVertical: 12
	},
	menuItem: {
		flex: 1,
		flexDirection: 'row',
		paddingVertical: 12
	},
	menuItemName: {
		flex: 1,
		paddingLeft: 10,
		paddingTop: 2,
		fontSize: 16,
		color: colors.gray,
		...fontStyles.normal
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
	otherNetworkIcon: {
		backgroundColor: colors.transparent,
		borderColor: colors.borderColor,
		borderWidth: 1
	},
	itemLabel: {
		marginRight: 15,
		alignContent: 'flex-end',
		justifyContent: 'flex-end',
		alignSelf: 'flex-end',
		paddingHorizontal: 12,
		paddingVertical: 3,
		borderRadius: 15
	},
	itemLabelText: {
		color: colors.white,
		textAlign: 'center',
		...fontStyles.bold
	}
});

const metamask_name = require('../../../images/metamask-name.png'); // eslint-disable-line
const metamask_fox = require('../../../images/fox.png'); // eslint-disable-line
const ICON_IMAGES = {
	assets: require('../../../images/tokens-icon.png')
};
const drawerBg = require('../../../images/drawer-bg.png'); // eslint-disable-line

/**
 * View component that displays the MetaMask fox
 * in the middle of the screen
 */
class DrawerView extends Component {
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
		 * Number of assets from the AssetsController
		 */
		tokensCount: PropTypes.number,
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
		toggleNetworkModal: PropTypes.func.isRequired,
		/**
		 * Action that shows the global alert
		 */
		showAlert: PropTypes.func.isRequired,
		/**
		 * Boolean that determines the status of the networks modal
		 */
		networkModalVisible: PropTypes.bool.isRequired,
		/**
		 * Action that sets a tokens type transaction
		 */
		setTokensTransaction: PropTypes.func.isRequired,
		/**
		 * Boolean that determines if the user has set a password before
		 */
		passwordSet: PropTypes.bool
	};

	state = {
		accountsModalVisible: false
	};

	currentBalance = null;
	previousBalance = null;
	processedNewBalance = false;

	componentDidUpdate() {
		setTimeout(async () => {
			if (
				!this.props.passwordSet &&
				!this.processedNewBalance &&
				this.currentBalance >= this.previousBalance &&
				this.currentBalance > 0
			) {
				this.processedNewBalance = true;
				const { selectedAddress, network, identities } = this.props;

				const incomingTransaction = await findFirstIncomingTransaction(network.provider.type, selectedAddress);
				if (incomingTransaction) {
					this.props.navigation.navigate('FirstIncomingTransaction', {
						incomingTransaction,
						selectedAddress,
						accountName: identities[selectedAddress].name
					});
				}
			}
		}, 1000);
	}

	onNetworkPress = () => {
		this.props.toggleNetworkModal();
	};

	onAccountPress = () => {
		this.setState({ accountsModalVisible: true });
	};

	hideAccountsModal = () => {
		this.setState({ accountsModalVisible: false });
	};

	onNetworksModalClose = async manualClose => {
		this.hideNetworksModal();
		if (!manualClose) {
			await this.hideDrawer();
		}
	};
	hideNetworksModal = () => {
		this.props.toggleNetworkModal();
	};

	showAccountDetails = () => {
		this.props.navigation.navigate('WalletView', { page: 0 });
		this.props.navigation.navigate('AccountDetails');
		this.hideDrawer();
	};

	onDeposit = () => {
		Alert.alert(strings('drawer.coming_soon'));
	};

	onSend = async () => {
		this.props.setTokensTransaction({ symbol: 'ETH' });
		this.props.navigation.navigate('SendView');
		this.hideDrawer();
	};

	async goToWalletTab(tabIndex) {
		this.props.navigation.navigate('WalletView', { page: 0 });
		this.hideDrawer();
		if (tabIndex !== 0) {
			setTimeout(() => {
				this.props.navigation.navigate('WalletView', { page: tabIndex });
			}, 300);
		}
	}

	goToBrowser = () => {
		this.props.navigation.navigate('BrowserHome');
		this.hideDrawer();
	};

	showAssets = () => {
		this.goToWalletTab(0);
	};

	copyAddressToClipboard = async () => {
		const { selectedAddress } = this.props;
		await Clipboard.setString(selectedAddress);
		this.props.showAlert({
			isVisible: true,
			autodismiss: 2000,
			content: 'clipboard-alert',
			data: { msg: strings('account_details.account_copied_to_clipboard') }
		});
	};

	showSettings = async () => {
		this.props.navigation.navigate('SettingsView');
		this.hideDrawer();
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
					onPress: async () => {
						await SecureKeychain.resetGenericPassword();
						this.props.navigation.navigate('Entry');
					}
				}
			],
			{ cancelable: false }
		);
	};

	viewInEtherscan = () => {
		const { selectedAddress, network } = this.props;
		const url = getEtherscanAddressUrl(network.provider.type, selectedAddress);
		this.goToBrowserUrl(url);
	};

	goToFeedback = () => {
		this.goToBrowserUrl(AppConstants.FEEDBACK_URL);
	};

	showHelp = () => {
		this.goToBrowserUrl('https://support.metamask.io');
	};

	goToBrowserUrl(url) {
		this.props.navigation.navigate('BrowserView', {
			url
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
			this.hideAccountsModal();
			this.hideDrawer();
		}, 300);
	};

	getIcon(name, size) {
		return <Icon name={name} size={size || 24} color={colors.gray} />;
	}

	getImageIcon(name) {
		return <Image source={ICON_IMAGES[name]} style={styles.menuItemIconImage} />;
	}

	getLabelForAssets = () => {
		if (this.props.tokensCount > 0) {
			return {
				text: this.props.tokensCount + 1,
				color: colors.fontSecondary
			};
		}
		return null;
	};

	getSections = () => [
		[
			{
				name: strings('drawer.assets'),
				icon: this.getImageIcon('assets'),
				action: this.showAssets,
				label: this.getLabelForAssets()
			},
			{
				name: strings('drawer.dapp_browser'),
				icon: this.getIcon('globe'),
				action: this.goToBrowser
			}
		],
		[
			{
				name: strings('drawer.copy_address'),
				icon: this.getIcon('copy'),
				action: this.copyAddressToClipboard
			},
			{
				name: strings('drawer.view_in_etherscan'),
				icon: this.getIcon('eye'),
				action: this.viewInEtherscan
			}
		],
		[
			{
				name: strings('drawer.settings'),
				action: this.showSettings
			},
			{
				name: strings('drawer.help'),
				action: this.showHelp
			},
			{
				name: strings('drawer.submit_feedback'),
				action: this.goToFeedback
			},
			{
				name: strings('drawer.logout'),
				action: this.logout
			}
		]
	];

	render = () => {
		const { network, accounts, identities, selectedAddress, keyrings, currentCurrency } = this.props;
		const account = { address: selectedAddress, ...identities[selectedAddress], ...accounts[selectedAddress] };
		account.balance = (accounts[selectedAddress] && renderFromWei(accounts[selectedAddress].balance)) || 0;
		const { color, name } = Networks[network.provider.type] || { ...Networks.rpc, color: null };
		const fiatBalance = Engine.getTotalFiatAccountBalance();
		if (fiatBalance !== this.previousBalance) {
			this.previousBalance = this.currentBalance;
		}
		this.currentBalance = fiatBalance;
		const fiatBalanceStr = renderFiat(this.currentBalance, currentCurrency);

		return (
			<SafeAreaView style={styles.wrapper} testID={'drawer-screen'}>
				<ScrollView>
					<View style={styles.header}>
						<View style={styles.metamaskLogo}>
							<Image source={metamask_fox} style={styles.metamaskFox} resizeMethod={'auto'} />
							<Image source={metamask_name} style={styles.metamaskName} resizeMethod={'auto'} />
						</View>
						<TouchableOpacity style={styles.network} onPress={this.onNetworkPress}>
							<View
								style={[
									styles.networkIcon,
									color ? { backgroundColor: color } : styles.otherNetworkIcon
								]}
							/>
							<Text style={styles.networkName} testID={'navbar-title-network'}>
								{name}
							</Text>
							<Icon name="caret-down" size={10} style={styles.caretDownNetwork} />
						</TouchableOpacity>
					</View>
					<View style={styles.account}>
						<ImageBackground source={drawerBg} style={styles.accountBg} resizeMode={'cover'}>
							<View style={styles.accountBgOverlay}>
								<TouchableOpacity
									style={styles.identiconWrapper}
									onPress={this.onAccountPress}
									testID={'navbar-account-identicon'}
								>
									<Identicon diameter={48} address={selectedAddress} />
								</TouchableOpacity>
								<TouchableOpacity
									style={styles.accountInfo}
									onPress={this.onAccountPress}
									testID={'navbar-account-button'}
								>
									<View style={styles.accountNameWrapper}>
										<Text style={styles.accountName} numberOfLines={1}>
											{account.name}
										</Text>
										<Icon name="caret-down" size={24} style={styles.caretDown} />
									</View>
									<Text style={styles.accountBalance}>{fiatBalanceStr}</Text>
									<Text style={styles.accountAddress}>{renderShortAddress(account.address)}</Text>
								</TouchableOpacity>
							</View>
							<TouchableOpacity
								style={styles.qrCodeWrapper}
								onPress={this.onAccountPress}
								testID={'navbar-account-button'}
							>
								<IonicIcon
									name="ios-information-circle-outline"
									onPress={this.showAccountDetails}
									size={24}
									style={styles.infoIcon}
								/>
							</TouchableOpacity>
						</ImageBackground>
					</View>
					<View style={styles.buttons}>
						<StyledButton
							type={'normal'}
							onPress={this.onSend}
							containerStyle={[styles.button, styles.leftButton]}
							style={styles.buttonContent}
						>
							<MaterialIcon name={'send'} size={15} color={colors.primary} style={styles.buttonIcon} />
							<Text style={styles.buttonText}>{strings('drawer.send_button')}</Text>
						</StyledButton>
						<StyledButton
							type={'normal'}
							onPress={this.onDeposit}
							containerStyle={[styles.button, styles.rightButton]}
							style={styles.buttonContent}
						>
							<FoundationIcon
								name={'download'}
								size={20}
								color={colors.primary}
								style={styles.buttonIcon}
							/>
							<Text style={styles.buttonText}>{strings('drawer.deposit_button')}</Text>
						</StyledButton>
					</View>
					<View style={styles.menu}>
						{this.getSections().map((section, i) => (
							<View key={`section_${i}`} style={styles.menuSection}>
								{section
									.filter(item => {
										if (item.name.toLowerCase().indexOf('etherscan') !== -1) {
											return hasBlockExplorer(network.provider.type);
										}
										return true;
									})
									.map((item, j) => (
										<TouchableOpacity
											key={`item_${i}_${j}`}
											style={styles.menuItem}
											onPress={() => item.action()} // eslint-disable-line
										>
											{item.icon ? item.icon : null}
											<Text style={[styles.menuItemName, !item.icon ? styles.noIcon : null]}>
												{item.name}
											</Text>
											{item.label ? (
												<View style={[styles.itemLabel, { backgroundColor: item.label.color }]}>
													<Text style={styles.itemLabelText}>{item.label.text}</Text>
												</View>
											) : null}
										</TouchableOpacity>
									))}
							</View>
						))}
					</View>
				</ScrollView>
				<Modal isVisible={this.props.networkModalVisible} onBackdropPress={this.hideNetworksModal}>
					<NetworkList onClose={this.onNetworksModalClose} />
				</Modal>
				<Modal
					isVisible={this.state.accountsModalVisible}
					style={styles.bottomModal}
					onBackdropPress={this.hideAccountsModal}
				>
					<AccountList
						accounts={accounts}
						identities={identities}
						selectedAddress={selectedAddress}
						keyrings={keyrings}
						onAccountChange={this.onAccountChange}
					/>
				</Modal>
			</SafeAreaView>
		);
	};
}

const mapStateToProps = state => ({
	network: state.engine.backgroundState.NetworkController,
	selectedAddress: toChecksumAddress(state.engine.backgroundState.PreferencesController.selectedAddress),
	accounts: state.engine.backgroundState.AccountTrackerController.accounts,
	identities: state.engine.backgroundState.PreferencesController.identities,
	currentCurrency: state.engine.backgroundState.CurrencyRateController.currentCurrency,
	keyrings: state.engine.backgroundState.KeyringController.keyrings,
	networkModalVisible: state.modals.networkModalVisible,
	tokensCount: state.engine.backgroundState.AssetsController.tokens.length,
	passwordSet: state.user.passwordSet
});

const mapDispatchToProps = dispatch => ({
	toggleNetworkModal: () => dispatch(toggleNetworkModal()),
	showAlert: config => dispatch(showAlert(config)),
	setTokensTransaction: asset => dispatch(setTokensTransaction(asset))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(DrawerView);
