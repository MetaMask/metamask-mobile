import React, { Component } from 'react';
import {
	Alert,
	Clipboard,
	Platform,
	TouchableOpacity,
	View,
	Image,
	StyleSheet,
	Text,
	ScrollView,
	Dimensions,
	InteractionManager
} from 'react-native';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import QRCode from 'react-native-qrcode-svg';
import Share from 'react-native-share'; // eslint-disable-line  import/default
import Icon from 'react-native-vector-icons/FontAwesome';
import FeatherIcon from 'react-native-vector-icons/Feather';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, fontStyles } from '../../../styles/common';
import { hasBlockExplorer } from '../../../util/networks';
import Identicon from '../Identicon';
import StyledButton from '../StyledButton';
import AccountList from '../AccountList';
import NetworkList from '../NetworkList';
import CustomAlert from '../CustomAlert';
import { renderFromWei, renderFiat } from '../../../util/number';
import { strings } from '../../../../locales/i18n';
import { DrawerActions } from 'react-navigation-drawer'; // eslint-disable-line
import Modal from 'react-native-modal';
import { toChecksumAddress } from 'ethereumjs-util';
import SecureKeychain from '../../../core/SecureKeychain';
import { toggleNetworkModal, toggleAccountsModal, toggleReceiveModal } from '../../../actions/modals';
import { showAlert } from '../../../actions/alert';
import { getEtherscanAddressUrl } from '../../../util/etherscan';
import { renderShortAddress } from '../../../util/address';
import Engine from '../../../core/Engine';
import { setTokensTransaction } from '../../../actions/transaction';
import findFirstIncomingTransaction from '../../../util/accountSecurity';
import ActionModal from '../ActionModal';
import DeviceInfo from 'react-native-device-info';
import Logger from '../../../util/Logger';
import DeviceSize from '../../../util/DeviceSize';

const styles = StyleSheet.create({
	wrapper: {
		flex: 1,
		backgroundColor: colors.white
	},
	header: {
		paddingTop: DeviceSize.isIphoneX() ? 60 : 24,
		backgroundColor: colors.drawerBg,
		height: DeviceSize.isIphoneX() ? 110 : 74,
		flexDirection: 'column',
		paddingBottom: 0
	},
	settings: {
		paddingHorizontal: 12,
		alignSelf: 'flex-end',
		alignItems: 'center',
		marginRight: 3,
		marginTop: Platform.OS === 'android' ? -3 : -10
	},
	settingsIcon: {
		marginBottom: 12
	},
	metamaskLogo: {
		flexDirection: 'row',
		flex: 1,
		marginTop: Platform.OS === 'android' ? 0 : 12,
		marginLeft: 15,
		paddingTop: Platform.OS === 'android' ? 10 : 0
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
		backgroundColor: colors.drawerBg
	},
	accountBgOverlay: {
		borderBottomColor: colors.borderColor,
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
		borderColor: colors.primary
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
	qrCodeWrapper: {
		position: 'absolute',
		right: 17,
		top: 17
	},
	infoIcon: {
		color: colors.primary
	},
	buttons: {
		flexDirection: 'row',
		borderBottomColor: colors.borderColor,
		borderBottomWidth: 1,
		padding: 15
	},
	button: {
		flex: 1,
		flexDirection: 'row',
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
		marginLeft: Platform.OS === 'ios' ? 8 : 28,
		marginTop: Platform.OS === 'ios' ? 0 : -23,
		paddingBottom: Platform.OS === 'ios' ? 0 : 3,
		fontSize: 15,
		color: colors.primary,
		...fontStyles.normal
	},
	buttonContent: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		justifyContent: 'center'
	},
	buttonIcon: {
		marginTop: 0
	},
	menu: {
		marginLeft: 17
	},
	noTopBorder: {
		borderTopWidth: 0
	},
	menuSection: {
		borderTopWidth: 1,
		borderColor: colors.borderColor,
		paddingVertical: 5
	},
	menuItem: {
		flex: 1,
		flexDirection: 'row',
		paddingVertical: 9
	},
	menuItemName: {
		flex: 1,
		paddingLeft: 15,
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
	modalView: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 20,
		flexDirection: 'column'
	},
	modalText: {
		fontSize: 18,
		textAlign: 'center',
		...fontStyles.normal
	},
	modalTitle: {
		fontSize: 22,
		marginBottom: 15,
		textAlign: 'center',
		...fontStyles.bold
	},
	detailsWrapper: {
		padding: 10,
		alignItems: 'center'
	},
	qrCode: {
		marginVertical: 15,
		alignItems: 'center',
		justifyContent: 'center',
		padding: 40,
		backgroundColor: colors.concrete,
		borderRadius: 8
	},
	addressWrapper: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 15,
		paddingVertical: 10,
		marginTop: 10,
		marginBottom: 20,
		marginRight: 10,
		marginLeft: 10,
		borderRadius: 5,
		backgroundColor: colors.concrete
	},
	addressTitle: {
		fontSize: 16,
		marginBottom: 10,
		...fontStyles.normal
	},
	address: {
		fontSize: 17,
		letterSpacing: 2,
		fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace'
	},
	secureModalText: {
		textAlign: 'center',
		fontSize: 13,
		...fontStyles.normal
	},
	bold: {
		...fontStyles.bold
	},
	secureModalImage: {
		width: 100,
		height: 100
	},
	importedWrapper: {
		marginTop: 10,
		width: 73,
		paddingHorizontal: 10,
		paddingVertical: 3,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: colors.another50ShadesOfGrey
	},
	importedText: {
		color: colors.another50ShadesOfGrey,
		fontSize: 10,
		...fontStyles.bold
	}
});

const metamask_name = require('../../../images/metamask-name.png'); // eslint-disable-line
const metamask_fox = require('../../../images/fox.png'); // eslint-disable-line
const ICON_IMAGES = {
	assets: require('../../../images/wallet-icon.png')
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
		 * Boolean that determines the status of the networks modal
		 */
		accountsModalVisible: PropTypes.bool.isRequired,
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
		submitFeedback: false,
		showSecureWalletModal: false
	};

	currentBalance = null;
	previousBalance = null;
	processedNewBalance = false;

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
		setTimeout(async () => {
			if (
				!this.isCurrentAccountImported() &&
				!this.props.passwordSet &&
				!this.processedNewBalance &&
				this.currentBalance >= this.previousBalance &&
				this.currentBalance > 0
			) {
				const { selectedAddress, network } = this.props;

				const incomingTransaction = await findFirstIncomingTransaction(network.provider.type, selectedAddress);
				if (incomingTransaction) {
					this.processedNewBalance = true;
					// We need to wait for the notification to dismiss
					// before attempting to show the secure wallet modal
					setTimeout(() => {
						this.setState({ showSecureWalletModal: true });
					}, 4000);
				}
			}
		}, 1000);
	}

	onAccountPress = () => {
		this.props.toggleAccountsModal();
	};

	hideAccountsModal = () => {
		this.props.toggleAccountsModal();
	};

	hideReceiveModal = () => {
		this.props.toggleReceiveModal();
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

	showReceiveModal = () => {
		this.props.toggleReceiveModal();
	};

	onReceive = () => {
		this.props.toggleReceiveModal();
	};

	onSend = async () => {
		this.props.setTokensTransaction({ symbol: 'ETH' });
		this.props.navigation.navigate('SendView');
		this.hideDrawer();
	};

	async goToWalletTab(tabIndex) {
		this.props.navigation.navigate('WalletTabHome');
		this.hideDrawer();
		if (tabIndex !== 0) {
			setTimeout(() => {
				this.props.navigation.navigate('WalletView', { page: 0 });
				this.props.navigation.navigate('WalletView', { page: tabIndex });
			}, 100);
		}
	}

	goToBrowser = () => {
		this.props.navigation.navigate('BrowserTabHome');
		this.hideDrawer();
	};

	showWallet = () => {
		this.props.navigation.navigate('WalletTabHome');
		this.hideDrawer();
	};

	goToTransactionHistory = () => {
		this.goToWalletTab(2);
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
		this.goToBrowserUrl(url, 'etherscan.io');
	};

	submitFeedback = () => {
		this.setState({ submitFeedback: true });
	};

	closeSubmitFeedback = () => {
		this.setState({ submitFeedback: false });
	};

	goToBugFeedback = () => {
		const formId = '1FAIpQLSdjImKlZCFP2U5GifkNHEmbBrKHxDKl2DpU7rvLxyMdvZ4QLg';
		this.goToFeedback(formId);
	};

	goToGeneralFeedback = () => {
		const formId = '1FAIpQLSecHcnnn84-m01guIbv7Nh93mCj_G8IVdDn96dKFcXgNx0fKg';
		this.goToFeedback(formId);
	};

	goToFeedback = formId => {
		const appVersion = DeviceInfo.getVersion();
		const buildNumber = DeviceInfo.getBuildNumber();
		const systemName = DeviceInfo.getSystemName();
		const systemVersion = systemName === 'Android' ? DeviceInfo.getAPILevel() : DeviceInfo.getSystemVersion();
		this.goToBrowserUrl(
			`https://docs.google.com/forms/d/e/${formId}/viewform?entry.649573346=${systemName}+${systemVersion}+MM+${appVersion}+(${buildNumber})`,
			strings('drawer.feedback')
		);
		this.setState({ submitFeedback: false });
	};

	showHelp = () => {
		this.goToBrowserUrl('https://support.metamask.io', strings('drawer.metamask_support'));
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
			this.hideAccountsModal();
			this.hideDrawer();
		}, 300);
	};

	onImportAccount = () => {
		this.hideAccountsModal();
		this.props.navigation.navigate('ImportPrivateKey');
		this.hideDrawer();
	};

	getIcon(name, size) {
		return <Icon name={name} size={size || 24} color={colors.gray} />;
	}

	getFeatherIcon(name, size) {
		return <FeatherIcon name={name} size={size || 24} color={colors.gray} />;
	}

	getMaterialIcon(name, size) {
		return <MaterialIcon name={name} size={size || 24} color={colors.gray} />;
	}

	getImageIcon(name) {
		return <Image source={ICON_IMAGES[name]} style={styles.menuItemIconImage} />;
	}

	getSections = () => [
		[
			{
				name: strings('drawer.browser'),
				icon: this.getIcon('globe'),
				action: this.goToBrowser
			},
			{
				name: strings('drawer.wallet'),
				icon: this.getImageIcon('assets'),
				action: this.showWallet
			},
			{
				name: strings('drawer.transaction_history'),
				icon: this.getFeatherIcon('list'),
				action: this.goToTransactionHistory
			}
		],
		[
			{
				name: strings('drawer.share_address'),
				icon: this.getMaterialIcon('share-variant'),
				action: this.onShare
			},
			{
				name: strings('drawer.view_in_etherscan'),
				icon: this.getIcon('eye'),
				action: this.viewInEtherscan
			}
		],
		[
			{
				name: strings('drawer.help'),
				action: this.showHelp
			},
			{
				name: strings('drawer.submit_feedback'),
				action: this.submitFeedback
			},
			{
				name: strings('drawer.logout'),
				action: this.logout
			}
		]
	];

	copyAccountToClipboard = async () => {
		const { selectedAddress } = this.props;
		await Clipboard.setString(selectedAddress);
		this.hideReceiveModal();
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
			message: `ethereum:${selectedAddress}`
		}).catch(err => {
			Logger.log('Error while trying to share address', err);
		});
	};

	onSecureWalletModalAction = () => {
		this.setState({ showSecureWalletModal: false });
		InteractionManager.runAfterInteractions(() => {
			this.props.navigation.navigate('SetPasswordFlow');
		});
	};

	render() {
		const { network, accounts, identities, selectedAddress, keyrings, currentCurrency } = this.props;
		const account = { address: selectedAddress, ...identities[selectedAddress], ...accounts[selectedAddress] };
		account.balance = (accounts[selectedAddress] && renderFromWei(accounts[selectedAddress].balance)) || 0;
		const fiatBalance = Engine.getTotalFiatAccountBalance();
		if (fiatBalance !== this.previousBalance) {
			this.previousBalance = this.currentBalance;
		}
		this.currentBalance = fiatBalance;
		const fiatBalanceStr = renderFiat(this.currentBalance, currentCurrency);

		return (
			<View style={styles.wrapper} testID={'drawer-screen'}>
				<ScrollView>
					<View style={styles.header}>
						<View style={styles.metamaskLogo}>
							<Image source={metamask_fox} style={styles.metamaskFox} resizeMethod={'auto'} />
							<Image source={metamask_name} style={styles.metamaskName} resizeMethod={'auto'} />
						</View>
						<TouchableOpacity style={styles.settings} onPress={this.showSettings}>
							<FeatherIcon name="settings" size={22} style={styles.settingsIcon} />
						</TouchableOpacity>
					</View>
					<View style={styles.account}>
						<View style={styles.accountBgOverlay}>
							<TouchableOpacity
								style={styles.identiconWrapper}
								onPress={this.onAccountPress}
								testID={'navbar-account-identicon'}
							>
								<View style={styles.identiconBorder}>
									<Identicon diameter={48} address={selectedAddress} />
								</View>
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
								<Text style={styles.accountBalance}>${fiatBalanceStr}</Text>
								<Text style={styles.accountAddress}>{renderShortAddress(account.address)}</Text>
								{this.isCurrentAccountImported() && (
									<View style={styles.importedWrapper}>
										<Text numberOfLines={1} style={styles.importedText}>
											{strings('accounts.imported')}
										</Text>
									</View>
								)}
							</TouchableOpacity>
						</View>
						<TouchableOpacity
							style={styles.qrCodeWrapper}
							onPress={this.onAccountPress}
							testID={'navbar-account-button'}
						>
							<Icon name="qrcode" onPress={this.showReceiveModal} size={30} style={styles.infoIcon} />
						</TouchableOpacity>
					</View>
					<View style={styles.buttons}>
						<StyledButton
							type={'rounded-normal'}
							onPress={this.onSend}
							containerStyle={[styles.button, styles.leftButton]}
							style={styles.buttonContent}
						>
							<MaterialIcon
								name={'arrow-top-right'}
								size={22}
								color={colors.primary}
								style={styles.buttonIcon}
							/>
							<Text style={styles.buttonText}>{strings('drawer.send_button')}</Text>
						</StyledButton>
						<StyledButton
							type={'rounded-normal'}
							onPress={this.onReceive}
							containerStyle={[styles.button, styles.rightButton]}
							style={styles.buttonContent}
						>
							<MaterialIcon
								name={'arrow-collapse-down'}
								size={22}
								color={colors.primary}
								style={styles.buttonIcon}
							/>
							<Text style={styles.buttonText}>{strings('drawer.receive_button')}</Text>
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
										</TouchableOpacity>
									))}
							</View>
						))}
					</View>
				</ScrollView>
				<Modal
					isVisible={this.props.networkModalVisible}
					onBackdropPress={this.hideNetworksModal}
					onSwipeComplete={this.hideNetworksModal}
					swipeDirection={'down'}
					propagateSwipe
				>
					<NetworkList onClose={this.onNetworksModalClose} />
				</Modal>
				<Modal
					isVisible={this.props.accountsModalVisible}
					style={styles.bottomModal}
					onBackdropPress={this.hideAccountsModal}
					onSwipeComplete={this.hideAccountsModal}
					swipeDirection={'down'}
					propagateSwipe
				>
					<AccountList
						accounts={accounts}
						identities={identities}
						selectedAddress={selectedAddress}
						keyrings={keyrings}
						onAccountChange={this.onAccountChange}
						onImportAccount={this.onImportAccount}
					/>
				</Modal>
				<ActionModal
					modalVisible={this.state.submitFeedback}
					confirmText={strings('drawer.submit_bug')}
					cancelText={strings('drawer.submit_general_feedback')}
					onCancelPress={this.goToGeneralFeedback}
					onRequestClose={this.closeSubmitFeedback}
					onConfirmPress={this.goToBugFeedback}
					cancelButtonMode={'confirm'}
					confirmButtonMode={'confirm'}
				>
					<View style={styles.modalView}>
						<Text style={styles.modalTitle}>{strings('drawer.submit_feedback')}</Text>
						<Text style={styles.modalText}>{strings('drawer.submit_feedback_message')}</Text>
					</View>
				</ActionModal>
				<Modal
					isVisible={this.props.receiveModalVisible}
					onBackdropPress={this.hideReceiveModal}
					onSwipeComplete={this.hideReceiveModal}
					swipeDirection={'down'}
					propagateSwipe
				>
					<View style={styles.detailsWrapper}>
						<View style={styles.qrCode}>
							<QRCode value={`ethereum:${selectedAddress}`} size={Dimensions.get('window').width - 160} />
						</View>
						<TouchableOpacity style={styles.addressWrapper} onPress={this.copyAccountToClipboard}>
							<Text style={styles.addressTitle} testID={'public-address-text'}>
								Public Address
							</Text>
							<Text style={styles.address} testID={'public-address-text'}>
								{selectedAddress}
							</Text>
						</TouchableOpacity>
					</View>
				</Modal>
				{!this.props.passwordSet && (
					<CustomAlert
						headerStyle={{ backgroundColor: colors.headerModalRed }}
						headerContent={
							<Image
								source={require('../../../images/lock.png')}
								style={styles.secureModalImage}
								resizeMethod={'auto'}
							/>
						}
						titleText={strings('secure_your_wallet_modal.title')}
						buttonText={strings('secure_your_wallet_modal.button')}
						onPress={this.onSecureWalletModalAction}
						isVisible={this.state.showSecureWalletModal}
					>
						<Text style={styles.secureModalText}>
							{strings('secure_your_wallet_modal.body')}
							<Text style={styles.bold}>{strings('secure_your_wallet_modal.required')}</Text>
						</Text>
					</CustomAlert>
				)}
			</View>
		);
	}
}

const mapStateToProps = state => ({
	network: state.engine.backgroundState.NetworkController,
	selectedAddress: toChecksumAddress(state.engine.backgroundState.PreferencesController.selectedAddress),
	accounts: state.engine.backgroundState.AccountTrackerController.accounts,
	identities: state.engine.backgroundState.PreferencesController.identities,
	currentCurrency: state.engine.backgroundState.CurrencyRateController.currentCurrency,
	keyrings: state.engine.backgroundState.KeyringController.keyrings,
	networkModalVisible: state.modals.networkModalVisible,
	accountsModalVisible: state.modals.accountsModalVisible,
	receiveModalVisible: state.modals.receiveModalVisible,
	passwordSet: state.user.passwordSet
});

const mapDispatchToProps = dispatch => ({
	toggleNetworkModal: () => dispatch(toggleNetworkModal()),
	toggleAccountsModal: () => dispatch(toggleAccountsModal()),
	toggleReceiveModal: () => dispatch(toggleReceiveModal()),
	showAlert: config => dispatch(showAlert(config)),
	setTokensTransaction: asset => dispatch(setTokensTransaction(asset))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(DrawerView);
