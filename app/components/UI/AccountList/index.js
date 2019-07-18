import React, { PureComponent } from 'react';
import Engine from '../../../core/Engine';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Identicon from '../Identicon';
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
import { renderFromWei } from '../../../util/number';
import { strings } from '../../../../locales/i18n';
import { toChecksumAddress } from 'ethereumjs-util';
import Logger from '../../../util/Logger';
import Analytics from '../../../core/Analytics';
import ANALYTICS_EVENT_OPTS from '../../../util/analytics';
import { getTicker } from '../../../util/transactions';

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
	account: {
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderColor: colors.grey100,
		flexDirection: 'row',
		paddingHorizontal: 20,
		paddingVertical: 20,
		height: 80
	},
	accountInfo: {
		marginLeft: 15,
		marginRight: 0,
		flex: 1,
		flexDirection: 'row'
	},
	accountLabel: {
		fontSize: 18,
		color: colors.fontPrimary,
		...fontStyles.normal
	},
	accountBalance: {
		paddingTop: 5,
		fontSize: 12,
		color: colors.fontSecondary,
		...fontStyles.normal
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
	},
	importedText: {
		color: colors.grey400,
		fontSize: 10,
		...fontStyles.bold
	},
	importedWrapper: {
		width: 73,
		paddingHorizontal: 10,
		paddingVertical: 3,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: colors.grey400
	},
	importedView: {
		flex: 0.5,
		alignItems: 'center',
		marginTop: 2
	},
	accountMain: {
		flex: 1,
		flexDirection: 'column'
	},
	selectedWrapper: {
		flex: 0.2,
		alignItems: 'flex-end'
	}
});

/**
 * View that contains the list of all the available accounts
 */
export default class AccountList extends PureComponent {
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
		ticker: PropTypes.string
	};

	state = {
		selectedAccountIndex: 0,
		loading: false
	};

	flatList = React.createRef();
	lastPosition = 0;

	getInitialSelectedAccountIndex = () => {
		const { identities, selectedAddress } = this.props;
		Object.keys(identities).forEach((address, i) => {
			if (selectedAddress === address) {
				this.setState({ selectedAccountIndex: i });
			}
		});
	};

	componentDidMount() {
		this.getInitialSelectedAccountIndex();
		InteractionManager.runAfterInteractions(() => {
			if (this.getAccounts().length > 4) {
				this.scrollToCurrentAccount();
			}
		});
	}

	scrollToCurrentAccount() {
		this.flatList &&
			this.flatList.current &&
			this.flatList.current.scrollToIndex({ index: this.state.selectedAccountIndex, animated: true });
	}

	onAccountChange = async newIndex => {
		const previousIndex = this.state.selectedAccountIndex;
		const { PreferencesController } = Engine.context;
		const { keyrings } = this.props;
		try {
			this.setState({ selectedAccountIndex: newIndex });

			const allKeyrings =
				keyrings && keyrings.length ? keyrings : Engine.context.KeyringController.state.keyrings;
			const accountsOrdered = allKeyrings.reduce((list, keyring) => list.concat(keyring.accounts), []);

			await PreferencesController.update({ selectedAddress: accountsOrdered[newIndex] });

			this.props.onAccountChange();

			InteractionManager.runAfterInteractions(async () => {
				setTimeout(() => {
					Engine.refreshTransactionHistory();
				}, 1000);
			});
		} catch (e) {
			// Restore to the previous index in case anything goes wrong
			this.setState({ selectedAccountIndex: previousIndex });
			Logger.error('error while trying change the selected account', e); // eslint-disable-line
		}
		InteractionManager.runAfterInteractions(() => {
			setTimeout(() => {
				Analytics.trackEvent(ANALYTICS_EVENT_OPTS.ACCOUNTS_SWITCHED_ACCOUNTS);
			}, 1000);
		});
	};

	importAccount = () => {
		this.props.onImportAccount();
	};

	addAccount = async () => {
		if (this.state.loading) return;
		this.setState({ loading: true });
		const { KeyringController } = Engine.context;
		try {
			await KeyringController.addNewAccount();
			const { PreferencesController } = Engine.context;
			const newIndex = Object.keys(this.props.identities).length - 1;
			await PreferencesController.update({ selectedAddress: Object.keys(this.props.identities)[newIndex] });
			this.setState({ selectedAccountIndex: newIndex });
			setTimeout(() => {
				this.flatList && this.flatList.current && this.flatList.current.scrollToEnd();
				this.setState({ loading: false });
			}, 500);
		} catch (e) {
			// Restore to the previous index in case anything goes wrong
			Logger.error('error while trying to add a new account', e); // eslint-disable-line
			this.setState({ loading: false });
		}
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
		const { index, name, address, balance, isSelected, isImported } = item;

		const selected = isSelected ? <Icon name="check-circle" size={30} color={colors.blue} /> : null;
		const imported = isImported ? (
			<View style={styles.importedWrapper}>
				<Text numberOfLines={1} style={styles.importedText}>
					{strings('accounts.imported')}
				</Text>
			</View>
		) : null;

		return (
			<TouchableOpacity
				style={styles.account}
				key={`account-${address}`}
				onPress={() => this.onAccountChange(index)} // eslint-disable-line
				onLongPress={() => this.onLongPress(address, imported, index)} // eslint-disable-line
			>
				<Identicon address={address} diameter={38} />
				<View style={styles.accountInfo}>
					<View style={styles.accountMain}>
						<Text numberOfLines={1} style={[styles.accountLabel]}>
							{name}
						</Text>
						<Text style={styles.accountBalance}>
							{renderFromWei(balance)} {getTicker(ticker)}
						</Text>
					</View>
					{imported && <View style={styles.importedView}>{imported}</View>}
					<View style={styles.selectedWrapper}>{selected}</View>
				</View>
			</TouchableOpacity>
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
				const isSelected = identityAddressChecksummed === toChecksumAddress(selectedAddress);
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
		const accounts = this.getAccounts();

		return (
			<SafeAreaView style={styles.wrapper} testID={'account-list'}>
				<View style={styles.titleWrapper}>
					<View style={styles.dragger} />
				</View>
				<FlatList
					data={accounts}
					keyExtractor={this.keyExtractor}
					renderItem={this.renderItem}
					ref={this.flatList}
					style={styles.accountsWrapper}
					getItemLayout={(data, index) => ({ length: 80, offset: 80 * index, index })} // eslint-disable-line
				/>
				<View style={styles.footer}>
					<TouchableOpacity style={styles.footerButton} onPress={this.addAccount}>
						{this.state.loading ? (
							<ActivityIndicator size="small" color={colors.blue} />
						) : (
							<Text style={styles.btnText}>{strings('accounts.create_new_account')}</Text>
						)}
					</TouchableOpacity>
					<TouchableOpacity onPress={this.importAccount} style={styles.footerButton}>
						<Text style={styles.btnText}>{strings('accounts.import_account')}</Text>
					</TouchableOpacity>
				</View>
			</SafeAreaView>
		);
	}
}
