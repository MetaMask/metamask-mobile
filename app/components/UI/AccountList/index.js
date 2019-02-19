import React, { Component } from 'react';
import Engine from '../../../core/Engine';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Identicon from '../Identicon';
import PropTypes from 'prop-types';
import {
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
		borderColor: colors.borderColor
	},
	dragger: {
		width: 48,
		height: 5,
		borderRadius: 4,
		backgroundColor: colors.gray,
		opacity: Platform.OS === 'android' ? 0.6 : 0.5
	},
	accountsWrapper: {
		flex: 1
	},
	account: {
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderColor: colors.borderColor,
		flexDirection: 'row',
		paddingHorizontal: 20,
		paddingVertical: 20
	},
	accountInfo: {
		marginLeft: 15,
		flex: 1
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
	selected: {
		marginRight: 15,
		alignContent: 'flex-end'
	},
	footer: {
		height: DeviceSize.isIphoneX() ? 120 : 100,
		paddingBottom: DeviceSize.isIphoneX() ? 30 : 0,
		justifyContent: 'center',
		flexDirection: 'column',
		alignItems: 'center'
	},
	btnText: {
		fontSize: 14,
		color: colors.primary,
		...fontStyles.normal
	},
	footerButton: {
		width: '100%',
		height: 43,
		alignItems: 'center',
		justifyContent: 'center',
		borderTopWidth: StyleSheet.hairlineWidth,
		borderColor: colors.borderColor
	},
	importedText: {
		color: colors.another50ShadesOfGrey,
		fontSize: 10,
		...fontStyles.bold
	},
	importedWrapper: {
		width: Platform.OS === 'android' ? 73 : 70,
		flex: 1,
		marginTop: 5,
		paddingHorizontal: 10,
		paddingVertical: 3,
		borderRadius: 10,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: colors.another50ShadesOfGrey
	}
});

/**
 * View that contains the list of all the available accounts
 */
export default class AccountList extends Component {
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
		onImportAccount: PropTypes.func
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
			this.scrollToCurrentAccount();
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

			InteractionManager.runAfterInteractions(() => {
				Engine.refreshTransactionHistory();
				const { AssetsDetectionController, AccountTrackerController } = Engine.context;
				AssetsDetectionController.detectAssets();
				AccountTrackerController.refresh();
			});
		} catch (e) {
			// Restore to the previous index in case anything goes wrong
			this.setState({ selectedAccountIndex: previousIndex });
			Logger.error('error while trying change the selected account', e); // eslint-disable-line
		}
	};

	importAccount = () => {
		this.props.onImportAccount();
	};

	addAccount = async () => {
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

	renderItem = ({ item }) => {
		const { index, name, address, balance, isSelected, isImported } = item;

		const selected = isSelected ? <Icon name="check-circle" size={30} color={colors.primary} /> : null;
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
			>
				<Identicon address={address} diameter={38} />
				<View style={styles.accountInfo}>
					<Text style={styles.accountLabel}>{name}</Text>
					<Text style={styles.accountBalance}>
						{renderFromWei(balance)} {strings('unit.eth')}
					</Text>
					<View style={styles.imported}>{imported}</View>
				</View>
				<View style={styles.selected}>{selected}</View>
			</TouchableOpacity>
		);
	};

	getAccounts() {
		const { accounts, identities, selectedAddress, keyrings } = this.props;
		// This is a temporary fix until we can read the state from GABA
		const allKeyrings = keyrings && keyrings.length ? keyrings : Engine.context.KeyringController.state.keyrings;

		const accountsOrdered = allKeyrings.reduce((list, keyring) => list.concat(keyring.accounts), []);
		return accountsOrdered.filter(address => !!identities[toChecksumAddress(address)]).map((addr, index) => {
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

	render = () => {
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
				/>
				<View style={styles.footer}>
					<TouchableOpacity style={styles.footerButton} onPress={this.addAccount}>
						{this.state.loading ? (
							<ActivityIndicator size="small" color={colors.primary} />
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
	};
}
