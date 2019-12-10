import React, { PureComponent } from 'react';
import Engine from '../../../core/Engine';
import PropTypes from 'prop-types';
import {
	Alert,
	ActivityIndicator,
	InteractionManager,
	FlatList,
	TouchableOpacity,
	StyleSheet,
	Text,
	View,
	SafeAreaView,
	Platform
} from 'react-native';
import { colors, fontStyles } from '../../../styles/common';
import DeviceSize from '../../../util/DeviceSize';
import { strings } from '../../../../locales/i18n';
import { toChecksumAddress } from 'ethereumjs-util';
import Logger from '../../../util/Logger';
import Analytics from '../../../core/Analytics';
import ANALYTICS_EVENT_OPTS from '../../../util/analytics';
import AccountElement from './AccountElement';
import { connect } from 'react-redux';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		borderTopLeftRadius: 10,
		borderTopRightRadius: 10,
		minHeight: 450
	},
	titleWrapper: {
		width: '100%',
		height: 33,
		alignItems: 'center',
		justifyContent: 'center',
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderColor: colors.grey100
	},
	dragger: {
		width: 48,
		height: 5,
		borderRadius: 4,
		backgroundColor: colors.grey400,
		opacity: Platform.OS === 'android' ? 0.6 : 0.5
	},
	accountsWrapper: {
		flex: 1
	},
	footer: {
		height: DeviceSize.isIphoneX() ? 140 : 110,
		paddingBottom: DeviceSize.isIphoneX() ? 30 : 0,
		justifyContent: 'center',
		flexDirection: 'column',
		alignItems: 'center'
	},
	btnText: {
		fontSize: 14,
		color: colors.blue,
		...fontStyles.normal
	},
	footerButton: {
		width: '100%',
		height: 55,
		alignItems: 'center',
		justifyContent: 'center',
		borderTopWidth: StyleSheet.hairlineWidth,
		borderColor: colors.grey100
	}
});

/**
 * View that contains the list of all the available accounts
 */
class AccountList extends PureComponent {
	static propTypes = {
		/**
		 * Map of accounts to information objects including balances
		 */
		accounts: PropTypes.object,
		/**
		 * An object containing each identity in the format address => account
		 */
		identities: PropTypes.object,
		/**
		 * A string representing the selected address => account
		 */
		selectedAddress: PropTypes.string,
		/**
		 * An object containing all the keyrings
		 */
		keyrings: PropTypes.array,
		/**
		 * function to be called when switching accounts
		 */
		onAccountChange: PropTypes.func,
		/**
		 * function to be called when importing an account
		 */
		onImportAccount: PropTypes.func,
		/**
		 * Current provider ticker
		 */
		ticker: PropTypes.string,
		/**
		 * Whether it will show options to create or import accounts
		 */
		enableAccountsAddition: PropTypes.bool
	};

	state = {
		selectedAccountIndex: 0,
		loading: false,
		orderedAccounts: {}
	};

	flatList = React.createRef();
	lastPosition = 0;
	updating = false;

	getInitialSelectedAccountIndex = () => {
		const { identities, selectedAddress } = this.props;
		Object.keys(identities).forEach((address, i) => {
			if (selectedAddress === address) {
				this.mounted && this.setState({ selectedAccountIndex: i });
			}
		});
	};

	componentDidMount() {
		this.mounted = true;
		this.getInitialSelectedAccountIndex();
		const orderedAccounts = this.getAccounts();
		InteractionManager.runAfterInteractions(() => {
			if (orderedAccounts.length > 4) {
				this.scrollToCurrentAccount();
			}
		});
		this.mounted && this.setState({ orderedAccounts });
	}

	componentWillUnmount = () => {
		this.mounted = false;
	};

	scrollToCurrentAccount() {
		this.flatList &&
			this.flatList.current &&
			this.flatList.current.scrollToIndex({ index: this.state.selectedAccountIndex, animated: true });
	}

	onAccountChange = async newIndex => {
		const previousIndex = this.state.selectedAccountIndex;
		const { PreferencesController } = Engine.context;
		const { keyrings } = this.props;

		requestAnimationFrame(async () => {
			try {
				this.mounted && this.setState({ selectedAccountIndex: newIndex });

				const allKeyrings =
					keyrings && keyrings.length ? keyrings : Engine.context.KeyringController.state.keyrings;
				const accountsOrdered = allKeyrings.reduce((list, keyring) => list.concat(keyring.accounts), []);

				// If not enabled is used from address book so we don't change accounts
				if (!this.props.enableAccountsAddition) {
					this.props.onAccountChange(accountsOrdered[newIndex]);
					const orderedAccounts = this.getAccounts();
					this.mounted && this.setState({ orderedAccounts });
					return;
				}

				PreferencesController.setSelectedAddress(accountsOrdered[newIndex]);

				this.props.onAccountChange();

				InteractionManager.runAfterInteractions(async () => {
					setTimeout(() => {
						Engine.refreshTransactionHistory();
					}, 1000);
				});
			} catch (e) {
				// Restore to the previous index in case anything goes wrong
				this.mounted && this.setState({ selectedAccountIndex: previousIndex });
				Logger.error('error while trying change the selected account', e); // eslint-disable-line
			}
			InteractionManager.runAfterInteractions(() => {
				setTimeout(() => {
					Analytics.trackEvent(ANALYTICS_EVENT_OPTS.ACCOUNTS_SWITCHED_ACCOUNTS);
				}, 1000);
			});
			const orderedAccounts = this.getAccounts();
			this.mounted && this.setState({ orderedAccounts });
		});
	};

	importAccount = () => {
		this.props.onImportAccount();
	};

	addAccount = async () => {
		if (this.state.loading) return;
		this.mounted && this.setState({ loading: true });
		const { KeyringController } = Engine.context;
		requestAnimationFrame(async () => {
			try {
				await KeyringController.addNewAccount();
				const { PreferencesController } = Engine.context;
				const newIndex = Object.keys(this.props.identities).length - 1;
				PreferencesController.setSelectedAddress(Object.keys(this.props.identities)[newIndex]);
				this.mounted && this.setState({ selectedAccountIndex: newIndex });
				setTimeout(() => {
					this.flatList && this.flatList.current && this.flatList.current.scrollToEnd();
					this.mounted && this.setState({ loading: false });
				}, 500);
				const orderedAccounts = this.getAccounts();
				this.mounted && this.setState({ orderedAccounts });
			} catch (e) {
				// Restore to the previous index in case anything goes wrong
				Logger.error('error while trying to add a new account', e); // eslint-disable-line
				this.mounted && this.setState({ loading: false });
			}
		});
	};

	isImported(allKeyrings, address) {
		let ret = false;
		for (const keyring of allKeyrings) {
			if (keyring.accounts.includes(address)) {
				ret = keyring.type !== 'HD Key Tree';
				break;
			}
		}

		return ret;
	}

	onLongPress = (address, imported, index) => {
		if (!imported) return;
		Alert.alert(
			strings('accounts.remove_account_title'),
			strings('accounts.remove_account_message'),
			[
				{
					text: strings('accounts.no'),
					onPress: () => false,
					style: 'cancel'
				},
				{
					text: strings('accounts.yes_remove_it'),
					onPress: async () => {
						await Engine.context.KeyringController.removeAccount(address);
						// Default to the previous account in the list
						this.onAccountChange(index - 1);
					}
				}
			],
			{ cancelable: false }
		);
	};

	renderItem = ({ item }) => {
		const { ticker } = this.props;
		return (
			<AccountElement onPress={this.onAccountChange} onLongPress={this.onLongPress} item={item} ticker={ticker} />
		);
	};

	getAccounts() {
		const { accounts, identities, selectedAddress, keyrings } = this.props;
		// This is a temporary fix until we can read the state from GABA
		const allKeyrings = keyrings && keyrings.length ? keyrings : Engine.context.KeyringController.state.keyrings;

		const accountsOrdered = allKeyrings.reduce((list, keyring) => list.concat(keyring.accounts), []);
		return accountsOrdered
			.filter(address => !!identities[toChecksumAddress(address)])
			.map((addr, index) => {
				const checksummedAddress = toChecksumAddress(addr);
				const identity = identities[checksummedAddress];
				const { name, address } = identity;
				const identityAddressChecksummed = toChecksumAddress(address);
				const isSelected = identityAddressChecksummed === selectedAddress;
				const isImported = this.isImported(allKeyrings, identityAddressChecksummed);
				let balance = 0x0;
				if (accounts[identityAddressChecksummed]) {
					balance = accounts[identityAddressChecksummed].balance;
				}
				return { index, name, address: identityAddressChecksummed, balance, isSelected, isImported };
			});
	}

	keyExtractor = item => item.address;

	render() {
		const { orderedAccounts } = this.state;
		const { enableAccountsAddition } = this.props;
		return (
			<SafeAreaView style={styles.wrapper} testID={'account-list'}>
				<View style={styles.titleWrapper}>
					<View style={styles.dragger} testID={'account-list-dragger'} />
				</View>
				<FlatList
					data={orderedAccounts}
					keyExtractor={this.keyExtractor}
					renderItem={this.renderItem}
					ref={this.flatList}
					style={styles.accountsWrapper}
					testID={'account-number-button'}
					getItemLayout={(_, index) => ({ length: 80, offset: 80 * index, index })} // eslint-disable-line
				/>
				{enableAccountsAddition && (
					<View style={styles.footer}>
						<TouchableOpacity
							style={styles.footerButton}
							testID={'create-account-button'}
							onPress={this.addAccount}
						>
							{this.state.loading ? (
								<ActivityIndicator size="small" color={colors.blue} />
							) : (
								<Text style={styles.btnText}>{strings('accounts.create_new_account')}</Text>
							)}
						</TouchableOpacity>
						<TouchableOpacity
							onPress={this.importAccount}
							style={styles.footerButton}
							testID={'import-account-button'}
						>
							<Text style={styles.btnText}>{strings('accounts.import_account')}</Text>
						</TouchableOpacity>
					</View>
				)}
			</SafeAreaView>
		);
	}
}

const mapStateToProps = state => ({
	accounts: state.engine.backgroundState.AccountTrackerController.accounts
});

export default connect(mapStateToProps)(AccountList);
