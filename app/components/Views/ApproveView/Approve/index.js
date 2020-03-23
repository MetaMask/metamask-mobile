import React, { PureComponent } from 'react';
import {
	SafeAreaView,
	StyleSheet,
	Text,
	View,
	TouchableOpacity,
	TextInput,
	Clipboard,
	Alert,
	InteractionManager
} from 'react-native';
import PropTypes from 'prop-types';
import { getApproveNavbar } from '../../../UI/Navbar';
import { colors, fontStyles, baseStyles } from '../../../../styles/common';
import { connect } from 'react-redux';
import WebsiteIcon from '../../../UI/WebsiteIcon';
import { getHost } from '../../../../util/browser';
import TransactionDirection from '../../TransactionDirection';
import contractMap from 'eth-contract-metadata';
import { safeToChecksumAddress, renderShortAddress, renderAccountName } from '../../../../util/address';
import Engine from '../../../../core/Engine';
import ActionView from '../../../UI/ActionView';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import IonicIcon from 'react-native-vector-icons/Ionicons';
import CustomGas from '../../SendFlow/CustomGas';
import ActionModal from '../../../UI/ActionModal';
import { strings } from '../../../../../locales/i18n';
import { setTransactionObject } from '../../../../actions/transaction';
import { BNToHex, hexToBN } from 'gaba/dist/util';
import { renderFromWei, weiToFiatNumber, isBN, renderFromTokenMinimalUnit, isDecimal } from '../../../../util/number';
import { getTicker, decodeTransferData, generateApproveData } from '../../../../util/transactions';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import ErrorMessage from '../../SendFlow/ErrorMessage';
import { showAlert } from '../../../../actions/alert';
import Feather from 'react-native-vector-icons/Feather';
import TransactionsNotificationManager from '../../../../core/TransactionsNotificationManager';
import Identicon from '../../../UI/Identicon';
import Analytics from '../../../../core/Analytics';
import ANALYTICS_EVENT_OPTS from '../../../../util/analytics';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1
	},
	icon: {
		borderRadius: 32,
		height: 64,
		width: 64
	},
	section: {
		flexDirection: 'column',
		paddingHorizontal: 24,
		borderBottomWidth: 1,
		borderBottomColor: colors.grey200,
		paddingVertical: 20
	},
	title: {
		...fontStyles.normal,
		fontSize: 24,
		textAlign: 'center',
		color: colors.black,
		lineHeight: 34,
		marginVertical: 16
	},
	explanation: {
		...fontStyles.normal,
		fontSize: 14,
		textAlign: 'center',
		color: colors.grey500,
		lineHeight: 20
	},
	editPermissionText: {
		...fontStyles.bold,
		color: colors.blue,
		fontSize: 14,
		lineHeight: 20,
		textAlign: 'center',
		marginVertical: 20
	},
	viewDetailsText: {
		...fontStyles.normal,
		color: colors.blue,
		fontSize: 12,
		lineHeight: 16,
		textAlign: 'center'
	},
	actionTouchable: {
		flexDirection: 'column',
		alignItems: 'center'
	},
	websiteIconWrapper: {
		flexDirection: 'column',
		alignItems: 'center'
	},
	sectionTitleText: {
		...fontStyles.bold,
		color: colors.black,
		fontSize: 14,
		marginLeft: 8
	},
	sectionTitleRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 12
	},
	sectionExplanationText: {
		...fontStyles.normal,
		fontSize: 12,
		color: colors.grey500,
		marginVertical: 6
	},
	editText: {
		...fontStyles.normal,
		color: colors.blue,
		fontSize: 12
	},
	fiatFeeText: {
		...fontStyles.bold,
		fontSize: 18,
		color: colors.black,
		textTransform: 'uppercase'
	},
	feeText: {
		...fontStyles.normal,
		fontSize: 14,
		color: colors.grey500
	},
	row: {
		flexDirection: 'row',
		alignItems: 'center'
	},
	column: {
		flexDirection: 'column'
	},
	sectionLeft: {
		flex: 0.6,
		flexDirection: 'row',
		alignItems: 'center'
	},
	sectionRight: {
		flex: 0.4,
		alignItems: 'flex-end'
	},
	permissionDetails: {
		...fontStyles.normal,
		fontSize: 14,
		color: colors.black,
		marginVertical: 8
	},
	viewDetailsWrapper: {
		flexDirection: 'row',
		marginTop: 20
	},
	copyIcon: {
		marginLeft: 8
	},
	customGasModalTitle: {
		borderBottomColor: colors.grey100,
		borderBottomWidth: 1
	},
	customGasModalTitleText: {
		...fontStyles.bold,
		color: colors.black,
		fontSize: 18,
		alignSelf: 'center',
		margin: 16
	},
	option: {
		flexDirection: 'row',
		marginVertical: 8
	},
	optionText: {
		...fontStyles.normal,
		fontSize: 14,
		lineHeight: 20
	},
	touchableOption: {
		flexDirection: 'row'
	},
	selectedCircle: {
		width: 8,
		height: 8,
		borderRadius: 8 / 2,
		margin: 3,
		backgroundColor: colors.blue
	},
	outSelectedCircle: {
		width: 18,
		height: 18,
		borderRadius: 18 / 2,
		borderWidth: 2,
		borderColor: colors.blue
	},
	circle: {
		width: 18,
		height: 18,
		borderRadius: 18 / 2,
		backgroundColor: colors.white,
		opacity: 1,
		borderWidth: 2,
		borderColor: colors.grey200
	},
	input: {
		padding: 12,
		borderColor: colors.grey200,
		borderRadius: 10,
		borderWidth: 2
	},
	spendLimitContent: {
		marginLeft: 8,
		flex: 1
	},
	spendLimitWrapper: {
		padding: 16
	},
	spendLimitTitle: {
		...fontStyles.bold,
		color: colors.black,
		fontSize: 14,
		lineHeight: 20,
		marginBottom: 8
	},
	spendLimitSubtitle: {
		...fontStyles.normal,
		fontSize: 12,
		lineHeight: 18,
		color: colors.grey500
	},
	textBlue: {
		color: colors.blue
	},
	textBlack: {
		color: colors.black
	},
	errorMessageWrapper: {
		marginTop: 16
	},
	fromGraphic: {
		flex: 1,
		borderColor: colors.grey100,
		borderBottomWidth: 1,
		alignItems: 'center',
		flexDirection: 'row',
		minHeight: 42,
		paddingHorizontal: 16
	},
	addressText: {
		...fontStyles.normal,
		color: colors.black,
		marginLeft: 8
	},
	tokenBalanceWrapper: {
		flex: 1,
		alignItems: 'flex-end'
	},
	tokenBalanceText: {
		...fontStyles.normal,
		color: colors.grey500,
		fontSize: 14,
		lineHeight: 20
	}
});

/**
 * PureComponent that manages ERC20 approve from the dapp browser
 */
class Approve extends PureComponent {
	static navigationOptions = ({ navigation }) => getApproveNavbar('approve.title', navigation);

	static propTypes = {
		/**
		 * List of accounts from the AccountTrackerController
		 */
		accounts: PropTypes.object,
		/**
		 * Object that represents the navigator
		 */
		navigation: PropTypes.object,
		/**
		 * ETH to current currency conversion rate
		 */
		conversionRate: PropTypes.number,
		/**
		 * An object containing token balances for current account and network in the format address => balance
		 */
		contractBalances: PropTypes.object,
		/**
		 * Currency code of the currently-active currency
		 */
		currentCurrency: PropTypes.string,
		/**
		/* Identities object required to get account name
		*/
		identities: PropTypes.object,
		/**
		 * Transaction state
		 */
		transaction: PropTypes.object.isRequired,
		/**
		 * Action that sets transaction attributes from object to a transaction
		 */
		setTransactionObject: PropTypes.func.isRequired,
		/**
		 * Action that shows the global alert
		 */
		showAlert: PropTypes.func,
		/**
		 * Current provider ticker
		 */
		ticker: PropTypes.string,
		/**
		 * List of transactions
		 */
		transactions: PropTypes.array,
		/**
		 * Number of tokens
		 */
		tokensLength: PropTypes.number,
		/**
		 * Number of accounts
		 */
		accountsLength: PropTypes.number,
		/**
		 * A string representing the network name
		 */
		providerType: PropTypes.string
	};

	state = {
		approved: false,
		currentCustomGasSelected: 'average',
		customGasSelected: 'average',
		customGas: undefined,
		customGasPrice: undefined,
		customGasModalVisible: false,
		editPermissionModalVisible: false,
		gasError: undefined,
		host: undefined,
		originalApproveAmount: undefined,
		originalTransactionData: this.props.transaction.data,
		totalGas: undefined,
		totalGasFiat: undefined,
		tokenSymbol: undefined,
		tokenDecimals: undefined,
		spendLimitUnlimitedSelected: true,
		spendLimitCustomValue: undefined,
		ticker: getTicker(this.props.ticker),
		validSpendLimitCustomValue: true,
		viewDetails: false
	};

	customSpendLimitInput = React.createRef();

	componentDidMount = async () => {
		const {
			transaction: { origin, to, gas, gasPrice, data },
			conversionRate
		} = this.props;
		const { AssetsContractController } = Engine.context;
		const host = getHost(origin);
		let tokenSymbol, tokenDecimals;
		const contract = contractMap[safeToChecksumAddress(to)];
		if (!contract) {
			tokenSymbol = await AssetsContractController.getAssetSymbol(to);
			tokenDecimals = await AssetsContractController.getTokenDecimals(to);
		} else {
			tokenSymbol = contract.symbol;
			tokenDecimals = contract.decimals;
		}
		const originalApproveAmount = decodeTransferData('transfer', data)[1];
		const totalGas = gas.mul(gasPrice);
		this.setState({
			host,
			originalApproveAmount,
			tokenDecimals,
			tokenSymbol,
			totalGas: renderFromWei(totalGas),
			totalGasFiat: weiToFiatNumber(totalGas, conversionRate)
		});
	};

	componentWillUnmount = () => {
		const { approved } = this.state;
		const { transaction } = this.props;
		if (!approved) Engine.context.TransactionController.cancelTransaction(transaction.id);
	};

	trackApproveEvent = event => {
		const { transaction, tokensLength, accountsLength, providerType } = this.props;
		InteractionManager.runAfterInteractions(() => {
			Analytics.trackEventWithParameters(event, {
				view: transaction.origin,
				numberOfTokens: tokensLength,
				numberOfAccounts: accountsLength,
				network: providerType
			});
		});
	};

	onViewDetails = () => {
		const { viewDetails } = this.state;
		this.setState({ viewDetails: !viewDetails });
	};

	toggleCustomGasModal = () => {
		const { customGasModalVisible } = this.state;
		!customGasModalVisible && this.trackApproveEvent(ANALYTICS_EVENT_OPTS.DAPP_APPROVE_SCREEN_EDIT_FEE);
		this.setState({ customGasModalVisible: !customGasModalVisible, gasError: undefined });
	};

	toggleEditPermissionModal = () => {
		const { editPermissionModalVisible } = this.state;
		!editPermissionModalVisible && this.trackApproveEvent(ANALYTICS_EVENT_OPTS.DAPP_APPROVE_SCREEN_EDIT_PERMISSION);
		this.setState({ editPermissionModalVisible: !editPermissionModalVisible });
	};

	handleSetGasFee = () => {
		const { customGas, customGasPrice, customGasSelected } = this.state;
		const { setTransactionObject, conversionRate } = this.props;

		if (!customGas || !customGasPrice) {
			this.toggleCustomGasModal();
			return;
		}
		this.setState({ gasEstimationReady: false });

		setTransactionObject({ gas: customGas, gasPrice: customGasPrice });
		const totalGas = customGas.mul(customGasPrice);

		setTimeout(() => {
			this.setState({
				customGas: undefined,
				customGasPrice: undefined,
				gasEstimationReady: true,
				currentCustomGasSelected: customGasSelected,
				errorMessage: undefined,
				totalGas: renderFromWei(totalGas),
				totalGasFiat: weiToFiatNumber(totalGas, conversionRate)
			});
		}, 100);
		this.toggleCustomGasModal();
	};

	handleGasFeeSelection = ({ gas, gasPrice, customGasSelected, error }) => {
		this.setState({ customGas: gas, customGasPrice: gasPrice, customGasSelected, gasError: error });
	};

	renderCustomGasModal = () => {
		const { customGasModalVisible, currentCustomGasSelected, gasError } = this.state;
		const { gas, gasPrice } = this.props.transaction;
		return (
			<ActionModal
				modalVisible={customGasModalVisible}
				confirmText={strings('transaction.set_gas')}
				cancelText={strings('transaction.cancel_gas')}
				confirmDisabled={!!gasError}
				onCancelPress={this.toggleCustomGasModal}
				onRequestClose={this.toggleCustomGasModal}
				onConfirmPress={this.handleSetGasFee}
				cancelButtonMode={'neutral'}
				confirmButtonMode={'confirm'}
			>
				<View style={baseStyles.flexGrow}>
					<View style={styles.customGasModalTitle}>
						<Text style={styles.customGasModalTitleText}>{strings('transaction.transaction_fee')}</Text>
					</View>
					<CustomGas
						selected={currentCustomGasSelected}
						handleGasFeeSelection={this.handleGasFeeSelection}
						gas={gas}
						gasPrice={gasPrice}
					/>
				</View>
			</ActionModal>
		);
	};

	onPressSpendLimitUnlimitedSelected = () => {
		this.setState({ spendLimitUnlimitedSelected: true, spendLimitCustomValue: undefined });
	};

	onPressSpendLimitCustomSelected = () => {
		this.setState({ spendLimitUnlimitedSelected: false });
		setTimeout(
			() =>
				this.customSpendLimitInput &&
				this.customSpendLimitInput.current &&
				this.customSpendLimitInput.current.focus(),
			100
		);
	};

	onSpendLimitCustomValueChange = value => {
		let validSpendLimitCustomValue = true;
		if (value && isDecimal(value)) {
			const floatValue = parseFloat(value);
			if (floatValue < 1) validSpendLimitCustomValue = false;
		} else {
			validSpendLimitCustomValue = false;
		}
		this.setState({ spendLimitCustomValue: value, validSpendLimitCustomValue });
	};

	handleSetSpendLimit = () => {
		const {
			transaction: { data },
			setTransactionObject
		} = this.props;
		const { spendLimitCustomValue, originalTransactionData, spendLimitUnlimitedSelected } = this.state;
		let newData;
		if (spendLimitUnlimitedSelected) {
			newData = originalTransactionData;
		} else {
			const spender = decodeTransferData('transfer', data)[0];
			newData = generateApproveData({ spender, value: parseInt(spendLimitCustomValue).toString(16) });
		}

		setTransactionObject({ data: newData });
		this.toggleEditPermissionModal();
	};

	renderEditPermissionModal = () => {
		const {
			editPermissionModalVisible,
			host,
			spendLimitUnlimitedSelected,
			tokenDecimals,
			tokenSymbol,
			spendLimitCustomValue,
			validSpendLimitCustomValue,
			originalApproveAmount
		} = this.state;
		const {
			identities,
			transaction: { from, to },
			contractBalances
		} = this.props;
		const checksummedTo = safeToChecksumAddress(to);
		const tokenBalance =
			checksummedTo in contractBalances
				? renderFromTokenMinimalUnit(contractBalances[checksummedTo], tokenDecimals)
				: 0;
		return (
			<ActionModal
				modalVisible={editPermissionModalVisible}
				confirmText={strings('spend_limit_edition.save')}
				onCancelPress={this.toggleEditPermissionModal}
				onRequestClose={this.toggleEditPermissionModal}
				onConfirmPress={this.handleSetSpendLimit}
				cancelButtonMode={'neutral'}
				confirmButtonMode={'confirm'}
				confirmDisabled={!spendLimitUnlimitedSelected && !validSpendLimitCustomValue}
				displayCancelButton={false}
			>
				<View style={baseStyles.flexGrow}>
					<View style={styles.customGasModalTitle}>
						<Text style={styles.customGasModalTitleText}>{strings('spend_limit_edition.title')}</Text>
					</View>

					<KeyboardAwareScrollView extraScrollHeight={-140}>
						<View style={styles.fromGraphic}>
							<Identicon address={from} diameter={18} />
							<Text style={styles.addressText} numberOfLines={1}>
								{renderAccountName(from, identities)}
							</Text>
							<View style={styles.tokenBalanceWrapper}>
								<Text
									style={styles.tokenBalanceText}
									numberOfLines={1}
								>{`${tokenBalance} ${tokenSymbol}`}</Text>
							</View>
						</View>

						<View style={styles.spendLimitWrapper}>
							<Text style={styles.spendLimitTitle}>{strings('spend_limit_edition.spend_limit')}</Text>
							<Text style={styles.spendLimitSubtitle}>
								{strings('spend_limit_edition.allow')}
								<Text style={fontStyles.bold}>{` ${host} `}</Text>
								{strings('spend_limit_edition.allow_explanation')}
							</Text>

							<View style={styles.option}>
								<TouchableOpacity
									onPress={this.onPressSpendLimitUnlimitedSelected}
									style={styles.touchableOption}
								>
									{spendLimitUnlimitedSelected ? (
										<View style={styles.outSelectedCircle}>
											<View style={styles.selectedCircle} />
										</View>
									) : (
										<View style={styles.circle} />
									)}
								</TouchableOpacity>
								<View style={styles.spendLimitContent}>
									<Text
										style={[
											styles.optionText,
											spendLimitUnlimitedSelected ? styles.textBlue : styles.textBlack
										]}
									>
										{strings('spend_limit_edition.unlimited')}
									</Text>
									<Text style={styles.sectionExplanationText}>
										{strings('spend_limit_edition.requested_by')}
										<Text style={fontStyles.bold}>{` ${host}`}</Text>
									</Text>
									<Text
										style={[styles.optionText, styles.textBlack]}
									>{`${originalApproveAmount} ${tokenSymbol}`}</Text>
								</View>
							</View>

							<View style={styles.option}>
								<TouchableOpacity
									onPress={this.onPressSpendLimitCustomSelected}
									style={styles.touchableOption}
								>
									{spendLimitUnlimitedSelected ? (
										<View style={styles.circle} />
									) : (
										<View style={styles.outSelectedCircle}>
											<View style={styles.selectedCircle} />
										</View>
									)}
								</TouchableOpacity>
								<View style={styles.spendLimitContent}>
									<Text
										style={[
											styles.optionText,
											!spendLimitUnlimitedSelected ? styles.textBlue : styles.textBlack
										]}
									>
										{strings('spend_limit_edition.custom_spend_limit')}
									</Text>
									<Text style={styles.sectionExplanationText}>
										{strings('spend_limit_edition.max_spend_limit')}
									</Text>
									<TextInput
										ref={this.customSpendLimitInput}
										autoCapitalize="none"
										keyboardType="numeric"
										autoCorrect={false}
										onChangeText={this.onSpendLimitCustomValueChange}
										placeholder={`100 ${tokenSymbol}`}
										placeholderTextColor={colors.grey100}
										spellCheck={false}
										style={styles.input}
										value={spendLimitCustomValue}
										numberOfLines={1}
										onFocus={this.onPressSpendLimitCustomSelected}
										returnKeyType={'done'}
									/>
									<Text style={styles.sectionExplanationText}>
										{strings('spend_limit_edition.minimum', { tokenSymbol })}
									</Text>
								</View>
							</View>
						</View>
					</KeyboardAwareScrollView>
				</View>
			</ActionModal>
		);
	};

	validateGas = () => {
		let error;
		const {
			transaction: { gas, gasPrice, from },
			accounts
		} = this.props;
		const fromAccount = accounts[safeToChecksumAddress(from)];
		if (!gas) error = strings('transaction.invalid_gas');
		else if (!gasPrice) error = strings('transaction.invalid_gas_price');
		else if (fromAccount && isBN(gas) && isBN(gasPrice) && hexToBN(fromAccount.balance).lt(gas.mul(gasPrice))) {
			error = strings('transaction.insufficient');
		}
		this.setState({ gasError: error });
		return error;
	};

	prepareTransaction = transaction => ({
		...transaction,
		gas: BNToHex(transaction.gas),
		gasPrice: BNToHex(transaction.gasPrice),
		value: BNToHex(transaction.value),
		to: safeToChecksumAddress(transaction.to),
		from: safeToChecksumAddress(transaction.from)
	});

	onConfirm = async () => {
		if (this.validateGas()) return;
		const { TransactionController } = Engine.context;
		const { transactions } = this.props;
		try {
			const transaction = this.prepareTransaction(this.props.transaction);

			TransactionController.hub.once(`${transaction.id}:finished`, transactionMeta => {
				if (transactionMeta.status === 'submitted') {
					this.setState({ approved: true });
					this.props.navigation.pop();
					this.props.navigation.navigate('ApproveSuccessView');
					TransactionsNotificationManager.watchSubmittedTransaction({
						...transactionMeta,
						assetType: 'ETH'
					});
				} else {
					throw transactionMeta.error;
				}
			});

			const fullTx = transactions.find(({ id }) => id === transaction.id);
			const updatedTx = { ...fullTx, transaction };
			await TransactionController.updateTransaction(updatedTx);
			await TransactionController.approveTransaction(transaction.id);
			this.trackApproveEvent(ANALYTICS_EVENT_OPTS.DAPP_APPROVE_SCREEN_APPROVE);
		} catch (error) {
			Alert.alert(strings('transactions.transaction_error'), error && error.message, [{ text: 'OK' }]);
			this.setState({ transactionHandled: false });
		}
	};

	onCancel = () => {
		this.trackApproveEvent(ANALYTICS_EVENT_OPTS.DAPP_APPROVE_SCREEN_CANCEL);
		this.props.navigation.pop();
	};

	copyContractAddress = async () => {
		const { transaction } = this.props;
		await Clipboard.setString(transaction.to);
		this.props.showAlert({
			isVisible: true,
			autodismiss: 1500,
			content: 'clipboard-alert',
			data: { msg: strings('transactions.address_copied_to_clipboard') }
		});
	};

	render = () => {
		const {
			transaction,
			transaction: { data },
			currentCurrency
		} = this.props;
		const { host, tokenSymbol, viewDetails, totalGas, totalGasFiat, ticker, gasError } = this.state;
		const amount = decodeTransferData('transfer', data)[1];
		return (
			<SafeAreaView style={styles.wrapper}>
				<TransactionDirection />
				<ActionView
					cancelText={strings('spend_limit_edition.cancel')}
					confirmText={strings('spend_limit_edition.approve')}
					onCancelPress={this.onCancel}
					onConfirmPress={this.onConfirm}
					confirmButtonMode={'confirm'}
				>
					<View>
						<View style={styles.section}>
							<View style={styles.websiteIconWrapper}>
								<WebsiteIcon style={styles.icon} url={transaction.origin} title={host} />
							</View>
							<Text style={styles.title}>
								{strings('spend_limit_edition.allow_to_access', { host, tokenSymbol })}
							</Text>
							<Text style={styles.explanation}>
								{strings('spend_limit_edition.you_trust_this_site_1')}
								<Text style={fontStyles.bold}> {host} </Text>
								{strings('spend_limit_edition.you_trust_this_site_2', { tokenSymbol })}
							</Text>
							<TouchableOpacity style={styles.actionTouchable} onPress={this.toggleEditPermissionModal}>
								<Text style={styles.editPermissionText}>
									{strings('spend_limit_edition.edit_permission')}
								</Text>
							</TouchableOpacity>
						</View>
						<View style={styles.section}>
							<View style={styles.sectionTitleRow}>
								<FontAwesome5 name={'tag'} size={20} color={colors.grey500} />
								<Text style={[styles.sectionTitleText, styles.sectionLeft]}>
									{strings('transaction.transaction_fee')}
								</Text>
								<TouchableOpacity style={styles.sectionRight} onPress={this.toggleCustomGasModal}>
									<Text style={styles.editText}>{strings('transaction.edit')}</Text>
								</TouchableOpacity>
							</View>
							<View style={styles.row}>
								<View style={styles.sectionLeft}>
									<Text style={styles.sectionExplanationText}>
										{strings('spend_limit_edition.transaction_fee_explanation')}
									</Text>
								</View>
								<View style={[styles.column, styles.sectionRight]}>
									<Text style={styles.fiatFeeText}>{`${totalGasFiat} ${currentCurrency}`}</Text>
									<Text style={styles.feeText}>{`${totalGas} ${ticker}`}</Text>
								</View>
							</View>
							<TouchableOpacity style={styles.actionTouchable} onPress={this.onViewDetails}>
								<View style={styles.viewDetailsWrapper}>
									<Text style={styles.viewDetailsText}>
										{strings('spend_limit_edition.view_details')}
									</Text>
									<IonicIcon
										name={`ios-arrow-${viewDetails ? 'up' : 'down'}`}
										size={16}
										color={colors.blue}
										style={styles.copyIcon}
									/>
								</View>
							</TouchableOpacity>
							{gasError && (
								<View style={styles.errorMessageWrapper}>
									<ErrorMessage errorMessage={gasError} />
								</View>
							)}
						</View>

						{viewDetails && (
							<View style={styles.section}>
								<View style={styles.sectionTitleRow}>
									<FontAwesome5
										name={'user-check'}
										size={20}
										color={colors.grey500}
										onPress={this.toggleEditPermissionModal}
									/>
									<Text style={[styles.sectionTitleText, styles.sectionLeft]}>
										{strings('spend_limit_edition.permission_request')}
									</Text>
									<TouchableOpacity
										style={styles.sectionRight}
										onPress={this.toggleEditPermissionModal}
									>
										<Text style={styles.editText}>{strings('spend_limit_edition.edit')}</Text>
									</TouchableOpacity>
								</View>
								<View style={styles.row}>
									<Text style={styles.sectionExplanationText}>
										{strings('spend_limit_edition.details_explanation', { host })}
									</Text>
								</View>
								<Text style={styles.permissionDetails}>
									<Text style={fontStyles.bold}>{strings('spend_limit_edition.amount')}</Text>{' '}
									{`${amount} ${tokenSymbol}`}
								</Text>
								<View style={styles.row}>
									<Text style={styles.permissionDetails}>
										<Text style={fontStyles.bold}>{strings('spend_limit_edition.to')}</Text>{' '}
										{strings('spend_limit_edition.contract', {
											address: renderShortAddress(transaction.to)
										})}
									</Text>
									<Feather
										name="copy"
										size={16}
										color={colors.blue}
										style={styles.copyIcon}
										onPress={this.copyContractAddress}
									/>
								</View>
							</View>
						)}

						{viewDetails && (
							<View style={styles.section}>
								<View style={styles.sectionTitleRow}>
									<FontAwesome5 solid name={'file-alt'} size={20} color={colors.grey500} />
									<Text style={[styles.sectionTitleText, styles.sectionLeft]}>
										{strings('spend_limit_edition.data')}
									</Text>
								</View>
								<View style={styles.row}>
									<Text style={styles.sectionExplanationText}>
										{strings('spend_limit_edition.function_approve')}
									</Text>
								</View>
								<Text style={styles.sectionExplanationText}>{transaction.data}</Text>
							</View>
						)}
						{this.renderCustomGasModal()}
						{this.renderEditPermissionModal()}
					</View>
				</ActionView>
			</SafeAreaView>
		);
	};
}

const mapStateToProps = state => ({
	accounts: state.engine.backgroundState.AccountTrackerController.accounts,
	conversionRate: state.engine.backgroundState.CurrencyRateController.conversionRate,
	contractBalances: state.engine.backgroundState.TokenBalancesController.contractBalances,
	currentCurrency: state.engine.backgroundState.CurrencyRateController.currentCurrency,
	identities: state.engine.backgroundState.PreferencesController.identities,
	ticker: state.engine.backgroundState.NetworkController.provider.ticker,
	transaction: state.transaction,
	transactions: state.engine.backgroundState.TransactionController.transactions,
	accountsLength: Object.keys(state.engine.backgroundState.AccountTrackerController.accounts).length,
	tokensLength: state.engine.backgroundState.AssetsController.tokens.length,
	providerType: state.engine.backgroundState.NetworkController.provider.type
});

const mapDispatchToProps = dispatch => ({
	setTransactionObject: transaction => dispatch(setTransactionObject(transaction)),
	showAlert: config => dispatch(showAlert(config))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(Approve);
