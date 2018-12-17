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
import FoundationIcon from 'react-native-vector-icons/Foundation';
import { colors, fontStyles } from '../../styles/common';
import Networks from '../../util/networks';
import Identicon from '../Identicon';
import StyledButton from '../StyledButton';
import AccountList from '../AccountList';
import NetworkList from '../NetworkList';
import { fromWei } from '../../util/number';
import { strings } from '../../../locales/i18n';
import { DrawerActions } from 'react-navigation-drawer'; // eslint-disable-line
import Modal from 'react-native-modal';
import { toChecksumAddress } from 'ethereumjs-util';
import SecureKeychain from '../../core/SecureKeychain';
import { toggleNetworkModal } from '../../actions/modals';

const styles = StyleSheet.create({
	wrapper: {
		flex: 1,
		backgroundColor: colors.white
	},
	header: {
		flexDirection: 'column',
		paddingBottom: 5
	},
	network: {
		paddingVertical: 8,
		flexDirection: 'row',
		alignSelf: 'flex-end',
		marginRight: 17,
		marginTop: Platform.OS === 'android' ? -23 : -21
	},
	networkName: {
		textAlign: 'right',
		fontSize: 11,
		color: colors.fontSecondary,
		...fontStyles.normal
	},
	networkIcon: {
		width: 5,
		height: 5,
		borderRadius: 100,
		marginRight: 5,
		marginTop: 5
	},
	metamaskName: {
		width: 94,
		height: 12,
		marginTop: 17,
		paddingVertical: 8,
		marginLeft: 17,
		marginRight: 50
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
		flex: 1,
		fontSize: 20,
		lineHeight: 24,
		color: colors.white,
		...fontStyles.normal
	},
	caretDown: {
		textAlign: 'right',
		marginRight: 7,
		fontSize: 24,
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
		flexDirection: 'row',
		paddingVertical: 12
	},
	menuItemName: {
		paddingLeft: 10,
		paddingTop: 2,
		fontSize: 16,
		color: colors.gray,
		...fontStyles.normal
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
	}
});

const metamask_name = require('../../images/metamask-name.png'); // eslint-disable-line
const ICON_IMAGES = {
	assets: require('../../images/tokens-icon.png')
};

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
		 * List of keyrings
		 */
		keyrings: PropTypes.array,
		/**
		 * Action that toggles the network modal
		 */
		toggleNetworkModal: PropTypes.func.isRequired,
		/**
		 * Boolean that determines the status of the networks modal
		 */
		networkModalVisible: PropTypes.bool.isRequired
	};

	state = {
		accountsModalVisible: false
	};

	onNetworkPress = () => {
		this.props.toggleNetworkModal();
	};

	onAccountPress = () => {
		this.setState({ accountsModalVisible: true });
	};

	hideAccountsModal = () => {
		this.setState({ accountsModalVisible: false });
	};

	hideNetworksModal = () => {
		this.props.toggleNetworkModal();
	};

	showQrCode = async () => {
		await this.hideDrawer();
		this.props.navigation.navigate('Wallet', { page: 0 });
		setTimeout(() => {
			this.props.navigation.navigate('AccountDetails');
		}, 300);
	};

	onDeposit = () => {
		Alert.alert(strings('drawer.coming_soon'));
	};

	onSend = async () => {
		await this.hideDrawer();
		this.props.navigation.navigate('Wallet', { page: 0 });
		setTimeout(() => {
			this.props.navigation.navigate('SendScreen');
		}, 300);
	};

	async goToWalletTab(tabIndex) {
		await this.hideDrawer();
		this.props.navigation.navigate('Wallet', { page: 0 });
		setTimeout(() => {
			this.props.navigation.navigate('Wallet', { page: tabIndex });
		}, 300);
	}

	goToBrowser = async () => {
		await this.hideDrawer();
		setTimeout(() => {
			this.props.navigation.navigate('BrowserHome');
		}, 300);
	};

	showAssets = () => {
		this.goToWalletTab(0);
	};

	copyAddressToClipboard = async () => {
		const { selectedAddress } = this.props;
		await Clipboard.setString(selectedAddress);
		Alert.alert(strings('account_details.account_copied_to_clipboard'));
	};

	showSettings = async () => {
		await this.hideDrawer();
		setTimeout(() => {
			this.props.navigation.navigate('AppConfigurations');
		}, 300);
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
		const isRopsten = network.provider.type === 'ropsten';
		const url = `https://${isRopsten ? 'ropsten.' : ''}etherscan.io/address/${selectedAddress}`;
		this.goToBrowserUrl(url);
	};

	showHelp = () => {
		this.goToBrowserUrl('https://support.metamask.io');
	};

	async goToBrowserUrl(url) {
		await this.hideDrawer();
		this.props.navigation.navigate('BrowserView', {
			url
		});
	}

	hideDrawer() {
		return new Promise(resolve => {
			this.props.navigation.dispatch(DrawerActions.closeDrawer());
			setTimeout(() => {
				resolve();
			}, 300);
		});
	}

	getIcon(name, size) {
		return <Icon name={name} size={size || 24} color={colors.gray} />;
	}

	getImageIcon(name) {
		return <Image source={ICON_IMAGES[name]} style={styles.menuItemIconImage} />;
	}

	sections = [
		[
			{
				name: strings('drawer.assets'),
				icon: this.getImageIcon('assets'),
				action: this.showAssets
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
				icon: this.getIcon('cogs'),
				action: this.showSettings
			},
			{
				name: strings('drawer.help'),
				icon: this.getIcon('question-circle'),
				action: this.showHelp
			},
			{
				name: strings('drawer.logout'),
				icon: this.getIcon('sign-out'),
				action: this.logout
			}
		]
	];

	render = () => {
		const { network, accounts, identities, selectedAddress, keyrings } = this.props;
		const account = { address: selectedAddress, ...identities[selectedAddress], ...accounts[selectedAddress] };
		account.balance = (accounts[selectedAddress] && fromWei(accounts[selectedAddress].balance, 'ether')) || 0;
		const { color, name } = Networks[network.provider.type] || { ...Networks.rpc, color: null };

		return (
			<SafeAreaView style={styles.wrapper} testID={'drawer-screen'}>
				<ScrollView>
					<View style={styles.header}>
						<Image source={metamask_name} style={styles.metamaskName} resizeMethod={'auto'} />
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
						</TouchableOpacity>
					</View>
					<View style={styles.account}>
						<ImageBackground
							source={require('../../images/drawer-bg.png')}
							style={styles.accountBg}
							resizeMode={'cover'}
						>
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
									<Text style={styles.accountBalance}>
										{account.balance} {strings('unit.eth')}
									</Text>
									<Text style={styles.accountAddress}>{`${account.address.substr(
										0,
										6
									)}...${account.address.substr(-4)}`}</Text>
								</TouchableOpacity>
							</View>
							<TouchableOpacity
								style={styles.qrCodeWrapper}
								onPress={this.onAccountPress}
								testID={'navbar-account-button'}
							>
								<MaterialIcon name="info" onPress={this.showQrCode} size={32} style={styles.infoIcon} />
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
						{this.sections.map((section, i) => (
							<View key={`section_${i}`} style={styles.menuSection}>
								{section.map((item, j) => (
									<TouchableOpacity
										key={`item_${i}_${j}`}
										style={styles.menuItem}
										onPress={() => item.action()} // eslint-disable-line
									>
										{item.icon}
										<Text style={styles.menuItemName}>{item.name}</Text>
									</TouchableOpacity>
								))}
							</View>
						))}
					</View>
				</ScrollView>
				<Modal isVisible={this.props.networkModalVisible} onBackdropPress={this.hideNetworksModal}>
					<NetworkList onClose={this.hideNetworksModal} />
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
	keyrings: state.engine.backgroundState.KeyringController.keyrings,
	networkModalVisible: state.modals.networkModalVisible
});

const mapDispatchToProps = dispatch => ({
	toggleNetworkModal: () => dispatch(toggleNetworkModal())
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(DrawerView);
