import React, { PureComponent } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, FlatList } from 'react-native';
import { colors, fontStyles } from '../../../../styles/common';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import Fuse from 'fuse.js';
import { strings } from '../../../../../locales/i18n';
import AddressElement from '../AddressElement';

const styles = StyleSheet.create({
	root: {
		flex: 1,
		backgroundColor: colors.white,
	},
	messageText: {
		...fontStyles.normal,
		color: colors.blue,
		fontSize: 16,
		textAlign: 'center',
	},
	messageLeft: {
		textAlign: 'left',
	},
	myAccountsWrapper: {
		flexGrow: 1,
	},
	myAccountsTouchable: {
		borderBottomWidth: 1,
		borderBottomColor: colors.grey050,
		padding: 16,
	},
	labelElementWrapper: {
		backgroundColor: colors.grey000,
		flexDirection: 'row',
		alignItems: 'center',
		borderBottomWidth: 1,
		borderBottomColor: colors.grey050,
		padding: 8,
	},
	labelElementInitialText: {
		textTransform: 'uppercase',
	},
	labelElementText: {
		...fontStyles.normal,
		fontSize: 12,
		marginHorizontal: 8,
		color: colors.grey600,
	},
});

const LabelElement = (label) => (
	<View key={label} style={styles.labelElementWrapper}>
		<Text style={[styles.labelElementText, label.length > 1 ? {} : styles.labelElementInitialText]}>{label}</Text>
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
		 * Callback called when account in address book is long pressed
		 */
		onAccountLongPress: PropTypes.func,
		/**
		 * Whether it only has to render address book
		 */
		onlyRenderAddressBook: PropTypes.bool,
		reloadAddressList: PropTypes.bool,
		/**
		 * An array that represents the user's recent toAddresses
		 */
		recents: PropTypes.array,
	};

	state = {
		myAccountsOpened: false,
		processedAddressBookList: undefined,
		contactElements: [],
	};

	networkAddressBook = {};

	componentDidMount = () => {
		const { addressBook, network } = this.props;
		this.networkAddressBook = addressBook[network] || {};
		const networkAddressBookList = Object.keys(this.networkAddressBook).map(
			(address) => this.networkAddressBook[address]
		);
		this.fuse = new Fuse(networkAddressBookList, {
			shouldSort: true,
			threshold: 0.45,
			location: 0,
			distance: 10,
			maxPatternLength: 32,
			minMatchCharLength: 1,
			keys: [
				{ name: 'name', weight: 0.5 },
				{ name: 'address', weight: 0.5 },
			],
		});
		this.parseAddressBook(networkAddressBookList);
	};

	componentDidUpdate = (prevProps) => {
		const { network, addressBook, reloadAddressList } = this.props;
		if (
			(prevProps.reloadAddressList && reloadAddressList !== prevProps.reloadAddressList) ||
			prevProps.inputSearch !== this.props.inputSearch ||
			JSON.stringify(prevProps.addressBook[network]) !== JSON.stringify(addressBook[network])
		) {
			let networkAddressBookList;
			if (this.props.inputSearch) {
				networkAddressBookList = this.fuse.search(this.props.inputSearch);
			} else {
				const { addressBook } = this.props;
				const networkAddressBook = addressBook[network] || {};
				networkAddressBookList = Object.keys(networkAddressBook).map((address) => networkAddressBook[address]);
			}
			this.parseAddressBook(networkAddressBookList);
		}
	};

	openMyAccounts = () => {
		this.setState({ myAccountsOpened: true });
	};

	parseAddressBook = (networkAddressBookList) => {
		const contactElements = [];
		const addressBookTree = {};
		networkAddressBookList.forEach((contact) => {
			const contactNameInitial = contact && contact.name && contact.name[0];
			const nameInitial = contactNameInitial && contactNameInitial.match(/[a-z]/i);
			const initial = nameInitial ? nameInitial[0] : strings('address_book.others');
			if (Object.keys(addressBookTree).includes(initial)) {
				addressBookTree[initial].push(contact);
			} else {
				addressBookTree[initial] = [contact];
			}
		});
		Object.keys(addressBookTree)
			.sort()
			.forEach((initial) => {
				contactElements.push(initial);
				addressBookTree[initial].forEach((contact) => {
					contactElements.push(contact);
				});
			});
		this.setState({ contactElements });
	};

	renderMyAccounts = () => {
		const { identities, onAccountPress, inputSearch, onAccountLongPress } = this.props;
		const { myAccountsOpened } = this.state;
		if (inputSearch) return;
		return !myAccountsOpened ? (
			<TouchableOpacity
				style={styles.myAccountsTouchable}
				onPress={this.openMyAccounts}
				testID={'my-accounts-button'}
			>
				<Text style={[styles.messageText, styles.messageLeft]}>{strings('address_book.between_account')}</Text>
			</TouchableOpacity>
		) : (
			<View>
				{Object.keys(identities).map((address) => (
					<AddressElement
						key={address}
						address={address}
						name={identities[address].name}
						onAccountPress={onAccountPress}
						onAccountLongPress={onAccountLongPress}
						testID={'account-identity'}
					/>
				))}
			</View>
		);
	};

	elementKeyExtractor = (element) => {
		if (typeof element === 'string') return element;
		return element.address + element.name;
	};

	renderElement = ({ item: element }) => {
		const { onAccountPress, onAccountLongPress } = this.props;
		if (typeof element === 'string') {
			return LabelElement(element);
		}
		return (
			<AddressElement
				address={element.address}
				name={element.name}
				onAccountPress={onAccountPress}
				onAccountLongPress={onAccountLongPress}
			/>
		);
	};

	renderRecents = () => {
		const { recents, onAccountPress, onAccountLongPress, inputSearch } = this.props;
		if (!recents.length || inputSearch) return;
		return (
			<>
				{LabelElement(strings('address_book.recents'))}
				{recents
					.filter((recent) => recent != null)
					.map((address, index) => (
						<AddressElement
							key={index}
							address={address}
							onAccountPress={onAccountPress}
							onAccountLongPress={onAccountLongPress}
						/>
					))}
			</>
		);
	};

	render = () => {
		const { contactElements } = this.state;
		const { onlyRenderAddressBook } = this.props;
		return (
			<View style={styles.root}>
				<ScrollView style={styles.myAccountsWrapper}>
					{!onlyRenderAddressBook && this.renderMyAccounts()}
					{!onlyRenderAddressBook && this.renderRecents()}
					{contactElements.length ? (
						<FlatList
							data={contactElements}
							keyExtractor={this.elementKeyExtractor}
							renderItem={this.renderElement}
						/>
					) : null}
				</ScrollView>
			</View>
		);
	};
}

const mapStateToProps = (state) => ({
	recents: state.recents,
	addressBook: state.engine.backgroundState.AddressBookController.addressBook,
	identities: state.engine.backgroundState.PreferencesController.identities,
	network: state.engine.backgroundState.NetworkController.network,
	transactions: state.engine.backgroundState.TransactionController.transactions,
	chainId: state.engine.backgroundState.NetworkController.provider.chainId,
});

export default connect(mapStateToProps)(AddressList);
