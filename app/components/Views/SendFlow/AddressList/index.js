import React, { PureComponent } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { colors, fontStyles } from '../../../../styles/common';
import PropTypes from 'prop-types';
import Identicon from '../../../UI/Identicon';
import { connect } from 'react-redux';
import { renderShortAddress, safeToChecksumAddress } from '../../../../util/address';
import Fuse from 'fuse.js';
import { strings } from '../../../../../locales/i18n';

const styles = StyleSheet.create({
	root: {
		flex: 1,
		backgroundColor: colors.white
	},
	addressElementWrapper: {
		padding: 16,
		flexDirection: 'row',
		alignItems: 'center',
		borderBottomWidth: 1,
		borderBottomColor: colors.grey050
	},
	addressElementInformation: {
		flexDirection: 'column'
	},
	addressIdenticon: {
		paddingRight: 16
	},
	addressTextNickname: {
		...fontStyles.normal,
		color: colors.black,
		fontSize: 14
	},
	addressTextAddress: {
		...fontStyles.normal,
		fontSize: 12,
		color: colors.grey500
	},
	myAccountsText: {
		...fontStyles.normal,
		color: colors.blue,
		fontSize: 16,
		textAlign: 'center'
	},
	myAccountsWrapper: {
		flexGrow: 1
	},
	myAccountsTouchable: {
		borderBottomWidth: 1,
		borderBottomColor: colors.grey050,
		padding: 16
	},
	labelElementWrapper: {
		backgroundColor: colors.grey000,
		flexDirection: 'row',
		alignItems: 'center',
		borderBottomWidth: 1,
		borderBottomColor: colors.grey050,
		padding: 8
	},
	labelElementText: {
		...fontStyles.normal,
		fontSize: 12,
		marginHorizontal: 8,
		color: colors.grey600
	},
	message: {
		padding: 16
	}
});

const AddressElement = (address, nickname, onAccountPress, onAccountLongPress) => {
	const primaryLabel = nickname || renderShortAddress(address);
	const secondaryLabel = nickname && renderShortAddress(address);
	return (
		<TouchableOpacity
			onPress={() => onAccountPress(address)} /* eslint-disable-line */
			onLongPress={() => onAccountLongPress(address)} /* eslint-disable-line */
			key={address}
			style={styles.addressElementWrapper}
		>
			<View style={styles.addressIdenticon}>
				<Identicon address={address} diameter={28} />
			</View>
			<View style={styles.addressElementInformation}>
				<Text style={styles.addressTextNickname} numberOfLines={1}>
					{primaryLabel}
				</Text>
				{!!secondaryLabel && (
					<Text style={styles.addressTextAddress} numberOfLines={1}>
						{secondaryLabel}
					</Text>
				)}
			</View>
		</TouchableOpacity>
	);
};

const LabelElement = label => (
	<View key={label} style={styles.labelElementWrapper}>
		<Text style={styles.labelElementText}>{label}</Text>
	</View>
);

/**
 * View that wraps the wraps the "Send" screen
 */
class AddressList extends PureComponent {
	static propTypes = {
		/**
		 * List of accounts from the PreferencesController
		 */
		identities: PropTypes.object,
		/**
		 * Map representing the address book
		 */
		addressBook: PropTypes.object,
		/**
		 * Search input from parent component
		 */
		inputSearch: PropTypes.string,
		/**
		 * Network id
		 */
		network: PropTypes.string,
		/**
		 * Callback called when account in address book is pressed
		 */
		onAccountPress: PropTypes.func,
		/**
		 * An array that represents the user transactions
		 */
		transactions: PropTypes.array,
		/**
		 * Whether it only has to render address book
		 */
		onlyRenderAddressBook: PropTypes.bool
	};

	state = {
		myAccountsOpened: false,
		processedAddressBookList: undefined,
		processedRecentsList: undefined
	};

	networkAddressBook;

	componentDidMount = () => {
		const { addressBook, network } = this.props;
		this.networkAddressBook = addressBook[network] || {};
		const networkAddressBookList = Object.keys(this.networkAddressBook).map(
			address => this.networkAddressBook[address]
		);
		this.fuse = new Fuse(networkAddressBookList, {
			shouldSort: true,
			threshold: 0.45,
			location: 0,
			distance: 10,
			maxPatternLength: 32,
			minMatchCharLength: 1,
			keys: [{ name: 'name', weight: 0.5 }, { name: 'address', weight: 0.5 }]
		});
		this.getRecentAddresses();
		this.parseAddressBook(networkAddressBookList);
	};

	componentDidUpdate = prevProps => {
		if (prevProps.inputSearch !== this.props.inputSearch) {
			let networkAddressBookList;
			if (this.props.inputSearch) {
				networkAddressBookList = this.fuse.search(this.props.inputSearch);
			} else {
				const { addressBook, network } = this.props;
				const networkAddressBook = addressBook[network] || {};
				networkAddressBookList = Object.keys(networkAddressBook).map(address => networkAddressBook[address]);
			}
			this.getRecentAddresses(this.props.inputSearch);
			this.parseAddressBook(networkAddressBookList);
		}
	};

	openMyAccounts = () => {
		this.setState({ myAccountsOpened: true });
	};

	getRecentAddresses = inputSearch => {
		const { transactions, network, identities, onAccountPress } = this.props;
		const recents = [];
		const parsedRecents = [];
		if (!inputSearch) {
			parsedRecents.push(LabelElement(strings('address_book.recents')));
			const networkTransactions = transactions.filter(tx => tx.networkID === network);
			networkTransactions.forEach(({ transaction: { to } }) => {
				const checksummedTo = safeToChecksumAddress(to);
				if (recents.length > 2) return;
				if (!recents.includes(checksummedTo) && !Object.keys(identities).includes(checksummedTo)) {
					recents.push(checksummedTo);
					if (this.networkAddressBook[checksummedTo]) {
						parsedRecents.push(
							AddressElement(checksummedTo, this.networkAddressBook[checksummedTo].name, onAccountPress)
						);
					} else {
						parsedRecents.push(AddressElement(checksummedTo, undefined, onAccountPress));
					}
				}
			});
		}
		this.setState({ processedRecentsList: parsedRecents });
	};

	parseAddressBook = networkAddressBookList => {
		const { onAccountPress } = this.props;
		const list = [];
		const addressBookTree = {};
		networkAddressBookList.forEach(contact => {
			const initial = contact.name[0] && contact.name[0].toUpperCase();
			if (Object.keys(addressBookTree).includes(initial)) {
				addressBookTree[initial].push(contact);
			} else {
				addressBookTree[initial] = [contact];
			}
		});
		Object.keys(addressBookTree)
			.sort()
			.forEach(initial => {
				list.push(LabelElement(initial));
				addressBookTree[initial].forEach(({ address, name }) => {
					list.push(AddressElement(address, name, onAccountPress));
				});
			});
		this.setState({ processedAddressBookList: list });
	};

	renderMyAccounts = () => {
		const { identities, onAccountPress, inputSearch } = this.props;
		const { myAccountsOpened } = this.state;
		if (inputSearch) return;
		return !myAccountsOpened ? (
			<TouchableOpacity style={styles.myAccountsTouchable} onPress={this.openMyAccounts}>
				<Text style={styles.myAccountsText}>Transfer between my accounts</Text>
			</TouchableOpacity>
		) : (
			<View>
				{Object.keys(identities).map(address =>
					AddressElement(address, identities[address].name, onAccountPress)
				)}
			</View>
		);
	};

	renderAddressBook = () => {
		const { processedAddressBookList } = this.state;

		return !processedAddressBookList || !processedAddressBookList.length ? (
			<View style={styles.message}>
				<Text style={styles.myAccountsText}>No contacts on address book</Text>
			</View>
		) : (
			<View>{processedAddressBookList}</View>
		);
	};

	render = () => {
		const { processedRecentsList } = this.state;
		const { onlyRenderAddressBook } = this.props;
		return (
			<View style={styles.root}>
				<ScrollView style={styles.myAccountsWrapper}>
					{!onlyRenderAddressBook && this.renderMyAccounts()}
					{!onlyRenderAddressBook && processedRecentsList}
					{this.renderAddressBook()}
				</ScrollView>
			</View>
		);
	};
}

const mapStateToProps = state => ({
	addressBook: state.engine.backgroundState.AddressBookController.addressBook,
	identities: state.engine.backgroundState.PreferencesController.identities,
	network: state.engine.backgroundState.NetworkController.network,
	transactions: state.engine.backgroundState.TransactionController.transactions
});

export default connect(mapStateToProps)(AddressList);
