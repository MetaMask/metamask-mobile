import React, { PureComponent } from 'react';
import { colors, fontStyles, baseStyles } from '../../../../styles/common';
import { getSendFlowTitle } from '../../../UI/Navbar';
import AddressList from './../AddressList';
import PropTypes from 'prop-types';
import { StyleSheet, View, TouchableOpacity, Text, TextInput, SafeAreaView, InteractionManager } from 'react-native';
import { AddressFrom, AddressTo } from './../AddressInputs';
import Modal from 'react-native-modal';
import AccountList from '../../../UI/AccountList';
import { connect } from 'react-redux';
import { renderFromWei } from '../../../../util/number';
import ActionModal from '../../../UI/ActionModal';
import Engine from '../../../../core/Engine';
import { isValidAddress, toChecksumAddress } from 'ethereumjs-util';
import { doENSLookup, doENSReverseLookup } from '../../../../util/ENSUtils';
import StyledButton from '../../../UI/StyledButton';
import { setSelectedAsset, setRecipient, newAssetTransaction } from '../../../../actions/transaction';
import { isENS } from '../../../../util/address';
import { getTicker, getEther } from '../../../../util/transactions';
import ErrorMessage from '../ErrorMessage';
import { strings } from '../../../../../locales/i18n';
import WarningMessage from '../WarningMessage';
import { util } from '@metamask/controllers';
import Analytics from '../../../../core/Analytics';
import { ANALYTICS_EVENT_OPTS } from '../../../../util/analytics';
import { allowedToBuy } from '../../../UI/FiatOrders';

const { hexToBN } = util;
const styles = StyleSheet.create({
	wrapper: {
		flex: 1,
		backgroundColor: colors.white
	},
	imputWrapper: {
		flex: 0,
		borderBottomWidth: 1,
		borderBottomColor: colors.grey050,
		paddingHorizontal: 8
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
		padding: 24
	},
	addToAddressBookWrapper: {
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
		fontSize: 20
	},
	addInputWrapper: {
		flexDirection: 'row',
		borderWidth: 1,
		borderRadius: 8,
		borderColor: colors.grey050,
		height: 50,
		width: '100%'
	},
	input: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		marginHorizontal: 6,
		width: '100%'
	},
	nextActionWrapper: {
		flex: 1,
		marginBottom: 16
	},
	buttonNextWrapper: {
		flexDirection: 'row',
		alignItems: 'flex-end'
	},
	buttonNext: {
		flex: 1,
		marginHorizontal: 24
	},
	addressErrorWrapper: {
		margin: 16
	},
	footerContainer: {
		flex: 1,
		justifyContent: 'flex-end'
	},
	warningContainer: {
		marginHorizontal: 24,
		marginBottom: 32
	},
	buyEth: {
		...fontStyles.bold,
		color: colors.black,
		textDecorationLine: 'underline'
	},
	bold: {
		...fontStyles.bold
	}
});

const dummy = () => true;

/**
 * View that wraps the wraps the "Send" screen
 */
class SendFlow extends PureComponent {
	static navigationOptions = ({ navigation, screenProps }) =>
		getSendFlowTitle('send.send_to', navigation, screenProps);

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
		 * Start transaction with asset
		 */
		newAssetTransaction: PropTypes.func.isRequired,
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
		ticker: PropTypes.string,
		/**
		 * Action that sets transaction to and ensRecipient in case is available
		 */
		setRecipient: PropTypes.func,
		/**
		 * Set selected in transaction state
		 */
		setSelectedAsset: PropTypes.func,
		/**
		 * Network provider type as mainnet
		 */
		providerType: PropTypes.string,
		/**
		 * Indicates whether the current transaction is a payment channel transaction
		 */
		isPaymentChannelTransaction: PropTypes.bool,
		/**
		 * Selected asset from current transaction state
		 */
		selectedAsset: PropTypes.object
	};

	addressToInputRef = React.createRef();

	state = {
		addressError: undefined,
		balanceIsZero: false,
		fromAccountModalVisible: false,
		addToAddressBookModalVisible: false,
		fromSelectedAddress: this.props.selectedAddress,
		fromAccountName: this.props.identities[this.props.selectedAddress].name,
		fromAccountBalance: undefined,
		toSelectedAddress: undefined,
		toSelectedAddressName: undefined,
		toSelectedAddressReady: false,
		toEnsName: undefined,
		addToAddressToAddressBook: false,
		alias: undefined,
		inputWidth: { width: '99%' }
	};

	componentDidMount = async () => {
		const {
			addressBook,
			selectedAddress,
			accounts,
			ticker,
			network,
			isPaymentChannelTransaction,
			selectedAsset,
			navigation,
			providerType
		} = this.props;
		const { fromAccountName } = this.state;
		// For analytics
		navigation.setParams({ providerType });
		const networkAddressBook = addressBook[network] || {};
		const ens = await doENSReverseLookup(selectedAddress, network);
		const fromAccountBalance = isPaymentChannelTransaction
			? `${selectedAsset.assetBalance} ${selectedAsset.symbol}`
			: `${renderFromWei(accounts[selectedAddress].balance)} ${getTicker(ticker)}`;

		setTimeout(() => {
			this.setState({
				fromAccountName: ens || fromAccountName,
				fromAccountBalance,
				balanceIsZero: hexToBN(accounts[selectedAddress].balance).isZero(),
				inputWidth: { width: '100%' }
			});
		}, 100);
		if (!Object.keys(networkAddressBook).length) {
			this.addressToInputRef && this.addressToInputRef.current && this.addressToInputRef.current.focus();
		}
		//Fills in to address and sets the transaction if coming from QR code scan
		const targetAddress = navigation.getParam('txMeta', null)?.target_address;
		if (targetAddress) {
			this.props.newAssetTransaction(getEther());
			this.onToSelectedAddressChange(targetAddress);
		}
	};

	toggleFromAccountModal = () => {
		const { fromAccountModalVisible } = this.state;
		this.setState({ fromAccountModalVisible: !fromAccountModalVisible });
	};

	toggleAddToAddressBookModal = () => {
		const { addToAddressBookModalVisible } = this.state;
		this.setState({ addToAddressBookModalVisible: !addToAddressBookModalVisible });
	};

	onAccountChange = async accountAddress => {
		const { identities, ticker, accounts } = this.props;
		const { name } = identities[accountAddress];
		const { PreferencesController } = Engine.context;
		const fromAccountBalance = `${renderFromWei(accounts[accountAddress].balance)} ${getTicker(ticker)}`;
		const ens = await doENSReverseLookup(accountAddress);
		const fromAccountName = ens || name;
		PreferencesController.setSelectedAddress(accountAddress);
		// If new account doesn't have the asset
		this.props.setSelectedAsset(getEther());
		this.setState({
			fromAccountName,
			fromAccountBalance,
			fromSelectedAddress: accountAddress,
			balanceIsZero: hexToBN(accounts[accountAddress].balance).isZero()
		});
		this.toggleFromAccountModal();
	};

	onToSelectedAddressChange = async toSelectedAddress => {
		const { AssetsContractController } = Engine.context;
		const { addressBook, network, identities } = this.props;
		const networkAddressBook = addressBook[network] || {};
		let addressError, toAddressName, toEnsName, errorContinue, isOnlyWarning;
		let [addToAddressToAddressBook, toSelectedAddressReady] = [false, false];
		if (isValidAddress(toSelectedAddress)) {
			const checksummedToSelectedAddress = toChecksumAddress(toSelectedAddress);
			toSelectedAddressReady = true;
			const ens = await doENSReverseLookup(toSelectedAddress);
			if (ens) {
				toAddressName = ens;
				if (!networkAddressBook[checksummedToSelectedAddress] && !identities[checksummedToSelectedAddress]) {
					addToAddressToAddressBook = true;
				}
			} else if (networkAddressBook[checksummedToSelectedAddress] || identities[checksummedToSelectedAddress]) {
				toAddressName =
					(networkAddressBook[checksummedToSelectedAddress] &&
						networkAddressBook[checksummedToSelectedAddress].name) ||
					(identities[checksummedToSelectedAddress] && identities[checksummedToSelectedAddress].name);
			} else {
				// If not in address book nor user accounts
				addToAddressToAddressBook = true;
			}

			// Check if it's token contract address
			try {
				const symbol = await AssetsContractController.getAssetSymbol(toSelectedAddress);
				if (symbol) {
					addressError = (
						<Text>
							<Text>{strings('transaction.tokenContractAddressWarning_1')}</Text>
							<Text style={styles.bold}>{strings('transaction.tokenContractAddressWarning_2')}</Text>
							<Text>{strings('transaction.tokenContractAddressWarning_3')}</Text>
						</Text>
					);
					errorContinue = true;
				}
			} catch (e) {
				// Not a token address
			}

			/**
			 * Not using this for now; Import isSmartContractAddress from utils/transaction and use this for checking smart contract: await isSmartContractAddress(toSelectedAddress);
			 * Check if it's smart contract address
			 */
			/*
			const smart = false; //

			if (smart) {
				addressError = strings('transaction.smartContractAddressWarning');
				isOnlyWarning = true;
			}
			*/
		} else if (isENS(toSelectedAddress)) {
			toEnsName = toSelectedAddress;
			const resolvedAddress = await doENSLookup(toSelectedAddress, network);
			if (resolvedAddress) {
				const checksummedResolvedAddress = toChecksumAddress(resolvedAddress);
				toAddressName = toSelectedAddress;
				toSelectedAddress = resolvedAddress;
				toSelectedAddressReady = true;
				if (!networkAddressBook[checksummedResolvedAddress] && !identities[checksummedResolvedAddress]) {
					addToAddressToAddressBook = true;
				}
			} else {
				addressError = strings('transaction.could_not_resolve_ens');
			}
		} else if (toSelectedAddress && toSelectedAddress.length >= 42) {
			addressError = strings('transaction.invalid_address');
		}
		this.setState({
			addressError,
			toSelectedAddress,
			addToAddressToAddressBook,
			toSelectedAddressReady,
			toSelectedAddressName: toAddressName,
			toEnsName,
			errorContinue,
			isOnlyWarning
		});
	};

	validateToAddress = async () => {
		const { toSelectedAddress } = this.state;
		const { network } = this.props;
		let addressError;
		if (isENS(toSelectedAddress)) {
			const resolvedAddress = await doENSLookup(toSelectedAddress, network);
			if (!resolvedAddress) {
				addressError = strings('transaction.could_not_resolve_ens');
			}
		} else if (!isValidAddress(toSelectedAddress)) {
			addressError = strings('transaction.invalid_address');
		}
		this.setState({ addressError });
		return addressError;
	};

	onToClear = () => {
		this.onToSelectedAddressChange();
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
		this.setState({ toSelectedAddressName: alias, addToAddressToAddressBook: false, alias: undefined });
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

	onTransactionDirectionSet = async () => {
		const { setRecipient, navigation, providerType } = this.props;
		const {
			fromSelectedAddress,
			toSelectedAddress,
			toEnsName,
			toSelectedAddressName,
			fromAccountName
		} = this.state;
		const addressError = await this.validateToAddress();
		if (addressError) return;
		setRecipient(fromSelectedAddress, toSelectedAddress, toEnsName, toSelectedAddressName, fromAccountName);
		InteractionManager.runAfterInteractions(() => {
			Analytics.trackEventWithParameters(ANALYTICS_EVENT_OPTS.SEND_FLOW_ADDS_RECIPIENT, {
				network: providerType
			});
		});
		navigation.navigate('Amount');
	};

	renderAddToAddressBookModal = () => {
		const { addToAddressBookModalVisible, alias } = this.state;
		return (
			<ActionModal
				modalVisible={addToAddressBookModalVisible}
				confirmText={strings('address_book.save')}
				cancelText={strings('address_book.cancel')}
				onCancelPress={this.toggleAddToAddressBookModal}
				onRequestClose={this.toggleAddToAddressBookModal}
				onConfirmPress={this.onSaveToAddressBook}
				cancelButtonMode={'normal'}
				confirmButtonMode={'confirm'}
				confirmDisabled={!alias}
			>
				<View style={styles.addToAddressBookRoot}>
					<View style={styles.addToAddressBookWrapper} testID={'add-address-modal'}>
						<View style={baseStyles.flexGrow}>
							<Text style={styles.addTextTitle}>{strings('address_book.add_to_address_book')}</Text>
							<Text style={styles.addTextSubtitle}>{strings('address_book.enter_an_alias')}</Text>
							<View style={styles.addInputWrapper}>
								<View style={styles.input}>
									<TextInput
										autoCapitalize="none"
										autoCorrect={false}
										onChangeText={this.onChangeAlias}
										placeholder={strings('address_book.enter_an_alias_placeholder')}
										placeholderTextColor={colors.grey100}
										spellCheck={false}
										style={styles.addTextInput}
										numberOfLines={1}
										onBlur={this.onBlur}
										onFocus={this.onInputFocus}
										onSubmitEditing={this.onFocus}
										value={alias}
										testID={'address-alias-input'}
									/>
								</View>
							</View>
						</View>
					</View>
				</View>
			</ActionModal>
		);
	};

	renderFromAccountModal = () => {
		const { identities, keyrings, ticker } = this.props;
		const { fromAccountModalVisible, fromSelectedAddress } = this.state;
		return (
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
		);
	};

	onToInputFocus = () => {
		const { toInputHighlighted } = this.state;
		this.setState({ toInputHighlighted: !toInputHighlighted });
	};

	goToBuy = () => {
		this.props.navigation.navigate('PaymentMethodSelector');
		InteractionManager.runAfterInteractions(() => {
			Analytics.trackEvent(ANALYTICS_EVENT_OPTS.WALLET_BUY_ETH);
		});
	};

	renderBuyEth = () => {
		if (!allowedToBuy(this.props.network)) {
			return null;
		}

		return (
			<>
				{'\n'}
				<Text style={styles.buyEth} onPress={this.goToBuy}>
					{strings('fiat_on_ramp.buy_eth')}
				</Text>
			</>
		);
	};

	render = () => {
		const { isPaymentChannelTransaction } = this.props;
		const {
			fromSelectedAddress,
			fromAccountName,
			fromAccountBalance,
			toSelectedAddress,
			toSelectedAddressReady,
			toSelectedAddressName,
			addToAddressToAddressBook,
			addressError,
			balanceIsZero,
			toInputHighlighted,
			inputWidth,
			errorContinue,
			isOnlyWarning
		} = this.state;
		return (
			<SafeAreaView style={styles.wrapper} testID={'send-screen'}>
				<View style={styles.imputWrapper}>
					<AddressFrom
						onPressIcon={isPaymentChannelTransaction ? null : this.toggleFromAccountModal}
						fromAccountAddress={fromSelectedAddress}
						fromAccountName={fromAccountName}
						fromAccountBalance={fromAccountBalance}
					/>
					<AddressTo
						inputRef={this.addressToInputRef}
						highlighted={toInputHighlighted}
						addressToReady={toSelectedAddressReady}
						toSelectedAddress={toSelectedAddress}
						toAddressName={toSelectedAddressName}
						onToSelectedAddressChange={this.onToSelectedAddressChange}
						onScan={this.onScan}
						onClear={this.onToClear}
						onInputFocus={this.onToInputFocus}
						onInputBlur={this.onToInputFocus}
						onSubmit={this.onTransactionDirectionSet}
						inputWidth={inputWidth}
					/>
				</View>
				{addressError && (
					<View style={styles.addressErrorWrapper} testID={'address-error'}>
						<ErrorMessage
							errorMessage={addressError}
							errorContinue={!!errorContinue}
							onContinue={this.onTransactionDirectionSet}
							isOnlyWarning={!!isOnlyWarning}
						/>
					</View>
				)}

				<View style={baseStyles.flexGrow}>
					{!toSelectedAddressReady ? (
						<AddressList
							inputSearch={toSelectedAddress}
							onAccountPress={this.onToSelectedAddressChange}
							onAccountLongPress={dummy}
						/>
					) : (
						<View style={styles.nextActionWrapper}>
							{addToAddressToAddressBook && (
								<TouchableOpacity
									style={styles.myAccountsTouchable}
									onPress={this.toggleAddToAddressBookModal}
									testID={'add-address-button'}
								>
									<Text style={styles.myAccountsText}>
										{strings('address_book.add_this_address')}
									</Text>
								</TouchableOpacity>
							)}
							<View style={styles.footerContainer} testID={'no-eth-message'}>
								{!isPaymentChannelTransaction && balanceIsZero && (
									<View style={styles.warningContainer}>
										<WarningMessage
											warningMessage={
												<>
													{strings('transaction.not_enough_for_gas')}

													{this.renderBuyEth()}
												</>
											}
										/>
									</View>
								)}
								{!errorContinue && (
									<View style={styles.buttonNextWrapper}>
										<StyledButton
											type={'confirm'}
											containerStyle={styles.buttonNext}
											onPress={this.onTransactionDirectionSet}
											testID={'address-book-next-button'}
										>
											{strings('address_book.next')}
										</StyledButton>
									</View>
								)}
							</View>
						</View>
					)}
				</View>

				{this.renderFromAccountModal()}
				{this.renderAddToAddressBookModal()}
			</SafeAreaView>
		);
	};
}

const mapStateToProps = state => ({
	accounts: state.engine.backgroundState.AccountTrackerController.accounts,
	addressBook: state.engine.backgroundState.AddressBookController.addressBook,
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	selectedAsset: state.transaction.selectedAsset,
	identities: state.engine.backgroundState.PreferencesController.identities,
	keyrings: state.engine.backgroundState.KeyringController.keyrings,
	ticker: state.engine.backgroundState.NetworkController.provider.ticker,
	network: state.engine.backgroundState.NetworkController.network,
	providerType: state.engine.backgroundState.NetworkController.provider.type,
	isPaymentChannelTransaction: state.transaction.paymentChannelTransaction
});

const mapDispatchToProps = dispatch => ({
	setRecipient: (from, to, ensRecipient, transactionToName, transactionFromName) =>
		dispatch(setRecipient(from, to, ensRecipient, transactionToName, transactionFromName)),
	newAssetTransaction: selectedAsset => dispatch(newAssetTransaction(selectedAsset)),
	setSelectedAsset: selectedAsset => dispatch(setSelectedAsset(selectedAsset))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(SendFlow);
