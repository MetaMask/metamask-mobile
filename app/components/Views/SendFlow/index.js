import React, { PureComponent } from 'react';
import { colors, fontStyles, baseStyles } from '../../../styles/common';
import { getTransactionOptionsTitle } from '../../UI/Navbar';
import AddressList from './AddressList';
import PropTypes from 'prop-types';
import { StyleSheet, View, TouchableOpacity, Text, TextInput } from 'react-native';
import { AddressFrom, AddressTo } from './AddressInputs';
import Modal from 'react-native-modal';
import AccountList from '../../UI/AccountList';
import { connect } from 'react-redux';
import { renderFromWei } from '../../../util/number';
import ActionModal from '../../UI/ActionModal';
import Engine from '../../../core/Engine';
import { isValidAddress } from 'ethereumjs-util';

const styles = StyleSheet.create({
	wrapper: {
		flex: 1,
		backgroundColor: colors.white
	},
	imputWrapper: {
		flex: 0,
		borderBottomWidth: 1,
		borderBottomColor: colors.grey050
	},
	addressListWrapper: {
		flex: 1
	},
	bottomModal: {
		justifyContent: 'flex-end',
		margin: 0
	},
	myAccountsText: {
		...fontStyles.normal,
		color: colors.blue,
		fontSize: 16,
		alignSelf: 'center'
	},
	myAccountsTouchable: {
		padding: 28
	},
	addToAddressBookRoot: {
		flex: 1,
		paddingHorizontal: 24
	},
	addToAddressBookWrapper: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center'
	},
	addTextTitle: {
		...fontStyles.normal,
		fontSize: 24,
		color: colors.black,
		marginBottom: 24
	},
	addTextSubtitle: {
		...fontStyles.normal,
		fontSize: 16,
		color: colors.grey600,
		marginBottom: 24
	},
	addTextInput: {
		...fontStyles.normal,
		color: colors.black,
		fontSize: 20,
		width: '100%'
	},
	addInputWrapper: {
		flexDirection: 'row',
		borderWidth: 1,
		borderRadius: 8,
		borderColor: colors.grey050,
		height: 50,
		width: '100%',
		padding: 10
	},
	input: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		marginHorizontal: 6,
		width: '100%'
	}
});

/**
 * View that wraps the wraps the "Send" screen
 */
class SendFlow extends PureComponent {
	static navigationOptions = ({ navigation }) => getTransactionOptionsTitle('send.title', navigation);

	static propTypes = {
		/**
		 * Map of accounts to information objects including balances
		 */
		accounts: PropTypes.object,
		/**
		 * Map representing the address book
		 */
		addressBook: PropTypes.object,
		/**
		 * Network id
		 */
		network: PropTypes.string,
		/**
		 * Object that represents the navigator
		 */
		navigation: PropTypes.object,
		/**
		 * Selected address as string
		 */
		selectedAddress: PropTypes.string,
		/**
		 * List of accounts from the PreferencesController
		 */
		identities: PropTypes.object,
		/**
		 * List of keyrings
		 */
		keyrings: PropTypes.array,
		/**
		 * Current provider ticker
		 */
		ticker: PropTypes.string
	};

	state = {
		fromAccountModalVisible: false,
		addToAddressBookModalVisible: false,
		fromSelectedAddress: undefined,
		fromAccountName: undefined,
		fromAccountBalance: undefined,
		toSelectedAddress: undefined,
		addToAddressToAddressBook: false,
		alias: undefined
	};

	componentDidMount = () => {
		const { navigation, selectedAddress, identities, accounts, ticker } = this.props;
		navigation && navigation.setParams({ mode: 'edit' });
		this.setState({
			fromSelectedAddress: selectedAddress,
			fromAccountName: identities[selectedAddress].name,
			fromAccountBalance: `${renderFromWei(accounts[selectedAddress].balance)} ${ticker}`
		});
	};

	toggleFromAccountModal = () => {
		const { fromAccountModalVisible } = this.state;
		this.setState({ fromAccountModalVisible: !fromAccountModalVisible });
	};

	toggleAddToAddressBookModal = () => {
		const { addToAddressBookModalVisible } = this.state;
		this.setState({ addToAddressBookModalVisible: !addToAddressBookModalVisible });
	};

	onAccountChange = accountAddress => {
		const { identities, ticker, accounts } = this.props;
		const { name: fromAccountName } = identities[accountAddress];
		const fromAccountBalance = `${renderFromWei(accounts[accountAddress].balance)} ${ticker}`;
		this.setState({ fromAccountName, fromAccountBalance, fromSelectedAddress: accountAddress });
		this.toggleFromAccountModal();
	};

	onToSelectedAddressChange = toSelectedAddress => {
		const { addressBook, network, identities } = this.props;
		const networkAddressBook = addressBook[network] || {};

		if (isValidAddress(toSelectedAddress)) {
			if (networkAddressBook[toSelectedAddress] || identities[toSelectedAddress]) {
				// In address book, pass to send
				this.setState({ addToAddressToAddressBook: false });
			} else {
				this.setState({ addToAddressToAddressBook: true });
				// Add to address book
			}
		} else {
			this.setState({ addToAddressToAddressBook: false });
		}
		this.setState({ toSelectedAddress });
	};

	onChangeAlias = alias => {
		this.setState({ alias });
	};

	onSaveToAddressBook = () => {
		const { network } = this.props;
		const { toSelectedAddress, alias } = this.state;
		const { AddressBookController } = Engine.context;
		AddressBookController.set(toSelectedAddress, alias, network);
		this.toggleAddToAddressBookModal();
		// Go to send flow
	};

	onScan = () => {
		this.props.navigation.navigate('QRScanner', {
			onScanSuccess: meta => {
				if (meta.target_address) {
					this.onToSelectedAddressChange(meta.target_address);
				}
			}
		});
	};

	render = () => {
		const { identities, keyrings, ticker } = this.props;
		const {
			fromAccountModalVisible,
			addToAddressBookModalVisible,
			fromSelectedAddress,
			fromAccountName,
			fromAccountBalance,
			toSelectedAddress,
			addToAddressToAddressBook,
			alias
		} = this.state;

		return (
			<View style={styles.wrapper}>
				<View style={styles.imputWrapper}>
					<AddressFrom
						onPressIcon={this.toggleFromAccountModal}
						fromAccountAddress={fromSelectedAddress}
						fromAccountName={fromAccountName}
						fromAccountBalance={fromAccountBalance}
					/>
					<AddressTo
						highlighted
						toSelectedAddress={toSelectedAddress}
						onToSelectedAddressChange={this.onToSelectedAddressChange}
						onScan={this.onScan}
					/>
				</View>

				<View style={styles.addressListWrapper}>
					{!addToAddressToAddressBook ? (
						<AddressList onAccountPress={this.onToSelectedAddressChange} />
					) : (
						<TouchableOpacity style={styles.myAccountsTouchable} onPress={this.toggleAddToAddressBookModal}>
							<Text style={styles.myAccountsText}>Add this address to your address book</Text>
						</TouchableOpacity>
					)}
				</View>

				<Modal
					isVisible={fromAccountModalVisible}
					style={styles.bottomModal}
					onBackdropPress={this.toggleFromAccountModal}
					onBackButtonPress={this.toggleFromAccountModal}
					onSwipeComplete={this.toggleFromAccountModal}
					swipeDirection={'down'}
					propagateSwipe
				>
					<AccountList
						enableAccountsAddition={false}
						identities={identities}
						selectedAddress={fromSelectedAddress}
						keyrings={keyrings}
						onAccountChange={this.onAccountChange}
						ticker={ticker}
					/>
				</Modal>

				<ActionModal
					modalVisible={addToAddressBookModalVisible}
					confirmText={'Save'}
					cancelText={'Cancel'}
					onCancelPress={this.toggleAddToAddressBookModal}
					onRequestClose={this.toggleAddToAddressBookModal}
					onConfirmPress={this.onSaveToAddressBook}
					cancelButtonMode={'normal'}
					confirmButtonMode={'confirm'}
				>
					<View style={styles.addToAddressBookRoot}>
						<View style={styles.addToAddressBookWrapper}>
							<View style={baseStyles.flexGrow}>
								<Text style={styles.addTextTitle}>Add to address book</Text>
								<Text style={styles.addTextSubtitle}>Enter an alias</Text>
								<View style={styles.addInputWrapper}>
									<View style={styles.input}>
										<TextInput
											autoCapitalize="none"
											autoCorrect={false}
											onChangeText={this.onChangeAlias}
											placeholder={'e.g. Vitalik B.'}
											placeholderTextColor={colors.grey100}
											spellCheck={false}
											style={styles.addTextInput}
											numberOfLines={1}
											onBlur={this.onBlur}
											onFocus={this.onInputFocus}
											onSubmitEditing={this.onFocus}
											value={alias}
										/>
									</View>
								</View>
							</View>
						</View>
					</View>
				</ActionModal>
			</View>
		);
	};
}

const mapStateToProps = state => ({
	accounts: state.engine.backgroundState.AccountTrackerController.accounts,
	addressBook: state.engine.backgroundState.AddressBookController.addressBook,
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	identities: state.engine.backgroundState.PreferencesController.identities,
	keyrings: state.engine.backgroundState.KeyringController.keyrings,
	ticker: state.engine.backgroundState.NetworkController.provider.ticker,
	network: state.engine.backgroundState.NetworkController.network
});

export default connect(mapStateToProps)(SendFlow);
