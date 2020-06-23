import React, { PureComponent } from 'react';
import {
	SafeAreaView,
	StyleSheet,
	Text,
	View,
	TouchableOpacity,
	TextInput,
	Alert,
	InteractionManager
} from 'react-native';
import Clipboard from '@react-native-community/clipboard';
import PropTypes from 'prop-types';
import { getApproveNavbar } from '../../../UI/Navbar';
import { colors, fontStyles, baseStyles } from '../../../../styles/common';
import { connect } from 'react-redux';
import { getHost } from '../../../../util/browser';
import contractMap from 'eth-contract-metadata';
import { safeToChecksumAddress, renderShortAddress } from '../../../../util/address';
import Engine from '../../../../core/Engine';
import CustomGas from '../../SendFlow/CustomGas';
import ActionModal from '../../../UI/ActionModal';
import { strings } from '../../../../../locales/i18n';
import { setTransactionObject } from '../../../../actions/transaction';
import { util } from '@metamask/controllers';
import { renderFromWei, weiToFiatNumber, isBN, isDecimal } from '../../../../util/number';
import {
	getTicker,
	decodeTransferData,
	generateApproveData,
	getNormalizedTxState,
	getMethodData
} from '../../../../util/transactions';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import ErrorMessage from '../../SendFlow/ErrorMessage';
import { showAlert } from '../../../../actions/alert';
import NotificationManager from '../../../../core/NotificationManager';
import Analytics from '../../../../core/Analytics';
import { ANALYTICS_EVENT_OPTS } from '../../../../util/analytics';
import Device from '../../../../util/Device';
import TransactionHeader from '../../../UI/TransactionHeader';
import ConnectHeader from '../../../UI/ConnectHeader';
import AccountInfoCard from '../../../UI/AccountInfoCard';
import IonicIcon from 'react-native-vector-icons/Ionicons';
import TransactionReviewDetailsCard from '../../../UI/TransactionReview/TransactionReivewDetailsCard';
import StyledButton from '../../../UI/StyledButton';
import currencySymbols from '../../../../util/currency-symbols.json';

const { BNToHex, hexToBN } = util;
const styles = StyleSheet.create({
	networkFee: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		borderWidth: 1,
		borderColor: colors.grey200,
		borderRadius: 10,
		padding: 16
	},
	networkFeeArrow: {
		paddingLeft: 20,
		marginTop: 2
	},
	wrapper: {
		backgroundColor: colors.white,
		flex: 1
	},
	section: {
		minWidth: '100%',
		width: '100%',
		paddingVertical: 10
	},
	title: {
		...fontStyles.bold,
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
		color: colors.black,
		lineHeight: 20
	},
	editPermissionText: {
		...fontStyles.bold,
		color: colors.blue,
		fontSize: 12,
		lineHeight: 20,
		textAlign: 'center',
		marginVertical: 20,
		borderWidth: 1,
		borderRadius: 20,
		borderColor: colors.blue,
		paddingVertical: 8,
		paddingHorizontal: 16
	},
	viewDetailsText: {
		...fontStyles.normal,
		color: colors.blue,
		fontSize: 12,
		lineHeight: 16,
		marginTop: 20,
		textAlign: 'center'
	},
	actionTouchable: {
		flexDirection: 'column',
		alignItems: 'center'
	},
	sectionExplanationText: {
		...fontStyles.normal,
		fontSize: 12,
		color: colors.grey500,
		marginVertical: 6
	},
	sectionLeft: {
		...fontStyles.bold,
		color: colors.black,
		fontSize: 14,
		flex: 1
	},
	sectionRight: {
		...fontStyles.bold,
		color: colors.black,
		fontSize: 14,
		flex: 1,
		textTransform: 'uppercase',
		textAlign: 'right'
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
	actionModal: {
		justifyContent: 'flex-end',
		alignItems: 'center',
		width: '100%'
	},
	viewWrapperStyle: {
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		marginHorizontal: 0,
		backgroundColor: colors.white,
		paddingBottom: Device.isIphoneX() ? 24 : 0
	},
	viewContainerStyle: {
		borderRadius: 20
	},
	actionContainerStyle: {
		borderTopWidth: 0
	},
	childrenContainerStyle: {
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		width: '100%',
		backgroundColor: colors.white,
		paddingTop: 24,
		paddingHorizontal: 24
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
		 * Currency code of the currently-active currency
		 */
		currentCurrency: PropTypes.string,
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
		providerType: PropTypes.string,
		primaryCurrency: PropTypes.string,
		activeTabUrl: PropTypes.string
	};

	state = {
		approved: false,
		viewData: false,
		currentCustomGasSelected: 'average',
		customGasSelected: 'average',
		customGas: undefined,
		customGasPrice: undefined,
		customGasVisible: false,
		editPermissionVisible: false,
		gasError: undefined,
		host: undefined,
		originalApproveAmount: undefined,
		originalTransactionData: this.props.transaction.data,
		totalGas: undefined,
		totalGasFiat: undefined,
		tokenSymbol: undefined,
		tokenDecimals: undefined,
		ready: false,
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
		const { name: method } = await getMethodData(data);

		this.setState({
			host,
			method,
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

	toggleViewData = () => {
		const { viewData } = this.state;
		this.setState({ viewData: !viewData });
	};

	toggleViewDetails = () => {
		const { viewDetails } = this.state;
		Analytics.trackEvent(ANALYTICS_EVENT_OPTS.DAPP_APPROVE_SCREEN_VIEW_DETAILS);
		this.setState({ viewDetails: !viewDetails });
	};

	toggleCustomGasModal = () => {
		const { customGasVisible } = this.state;
		!customGasVisible && this.trackApproveEvent(ANALYTICS_EVENT_OPTS.DAPP_APPROVE_SCREEN_EDIT_FEE);
		this.setState({ customGasVisible: !customGasVisible, gasError: undefined });
	};

	toggleEditPermission = () => {
		const { editPermissionVisible } = this.state;
		!editPermissionVisible && this.trackApproveEvent(ANALYTICS_EVENT_OPTS.DAPP_APPROVE_SCREEN_EDIT_PERMISSION);
		this.setState({ editPermissionVisible: !editPermissionVisible });
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

	ready = () => {
		this.setState({ ready: true });
	};

	renderCustomGas = () => {
		const { currentCustomGasSelected, gasError } = this.state;
		const { gas, gasPrice } = this.props.transaction;
		return (
			<View style={styles.section}>
				<CustomGas
					selected={currentCustomGasSelected}
					handleGasFeeSelection={this.handleGasFeeSelection}
					gas={gas}
					gasPrice={gasPrice}
					gasError={gasError}
					toggleCustomGasModal={this.toggleCustomGasModal}
					parentStateReady={this.ready}
				/>
				<StyledButton
					// testID={cancelTestID}
					type="confirm"
					onPress={this.handleSetGasFee}
				>
					{strings('custom_gas.save')}
				</StyledButton>
			</View>
		);
	};

	renderTransactionReview = () => {
		const { host, method, viewData, tokenSymbol } = this.state;
		const {
			transaction: { to, data }
		} = this.props;
		const amount = decodeTransferData('transfer', data)[1];

		return (
			<TransactionReviewDetailsCard
				toggleViewDetails={this.toggleViewDetails}
				toggleViewData={this.toggleViewData}
				copyContractAddress={this.copyContractAddress}
				address={renderShortAddress(to)}
				host={host}
				allowance={amount}
				tokenSymbol={tokenSymbol}
				data={data}
				method={method}
				displayViewData={viewData}
			/>
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
		this.toggleEditPermission();
	};

	renderEditPermission = () => {
		const {
			host,
			spendLimitUnlimitedSelected,
			tokenSymbol,
			spendLimitCustomValue,
			originalApproveAmount
		} = this.state;
		return (
			<View style={baseStyles.section}>
				<KeyboardAwareScrollView resetScrollToCoords={{ x: 0, y: 0 }}>
					<ConnectHeader action={this.toggleEditPermission} title={strings('spend_limit_edition.title')} />
					<View>
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
					<StyledButton
						// testID={cancelTestID}
						type="confirm"
						onPress={this.toggleEditPermission}
					>
						{strings('transaction.set_gas')}
					</StyledButton>
				</KeyboardAwareScrollView>
			</View>
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
					NotificationManager.watchSubmittedTransaction({
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
		const { activeTabUrl, currentCurrency, primaryCurrency } = this.props;

		const {
			host,
			tokenSymbol,
			viewDetails,
			totalGas,
			totalGasFiat,
			customGasVisible,
			editPermissionVisible,
			ticker,
			gasError
		} = this.state;

		const isFiat = primaryCurrency.toLowerCase() === 'fiat';
		const symbol = currencySymbols[currentCurrency];

		return (
			<SafeAreaView style={styles.wrapper}>
				<ActionModal
					cancelText={strings('spend_limit_edition.cancel')}
					confirmText={strings('spend_limit_edition.approve')}
					onCancelPress={this.onCancel}
					onConfirmPress={this.onConfirm}
					confirmButtonMode="confirm"
					onRequestClose={this.onCancel}
					displayCancelButton={false}
					displayConfirmButton={!editPermissionVisible && !customGasVisible}
					modalVisible
					modalStyle={styles.actionModal}
					viewWrapperStyle={styles.viewWrapperStyle}
					viewContainerStyle={styles.viewContainerStyle}
					actionContainerStyle={styles.actionContainerStyle}
					childrenContainerStyle={styles.childrenContainerStyle}
				>
					<View>
						{viewDetails ? (
							this.renderTransactionReview()
						) : customGasVisible ? (
							this.renderCustomGas()
						) : editPermissionVisible ? (
							this.renderEditPermission()
						) : (
							<>
								<View style={styles.section} testID={'approve-screen'}>
									<TransactionHeader currentPageInformation={{ title: host, url: activeTabUrl }} />
									<Text style={styles.title} testID={'allow-access'}>
										{strings('spend_limit_edition.allow_to_access', { tokenSymbol })}
									</Text>
									<Text style={styles.explanation}>
										{strings('spend_limit_edition.you_trust_this_site')}
									</Text>
									<TouchableOpacity
										style={styles.actionTouchable}
										onPress={this.toggleEditPermission}
									>
										<Text style={styles.editPermissionText}>
											{strings('spend_limit_edition.edit_permission')}
										</Text>
									</TouchableOpacity>
									<AccountInfoCard />
								</View>
								<View style={styles.section}>
									<TouchableOpacity onPress={this.toggleCustomGasModal}>
										<View style={styles.networkFee}>
											<Text style={styles.sectionLeft}>
												{strings('transaction.transaction_fee')}
											</Text>
											<Text style={styles.sectionRight}>
												{isFiat && symbol}
												{isFiat ? totalGasFiat : totalGas} {!isFiat && ticker}
											</Text>
											<View style={styles.networkFeeArrow}>
												<IonicIcon name="ios-arrow-forward" size={16} color={colors.grey00} />
											</View>
										</View>
									</TouchableOpacity>
									<TouchableOpacity style={styles.actionTouchable} onPress={this.toggleViewDetails}>
										<View style={styles.viewDetailsWrapper}>
											<Text style={styles.viewDetailsText}>
												{strings('spend_limit_edition.view_details')}
											</Text>
										</View>
									</TouchableOpacity>
									{gasError && (
										<View style={styles.errorMessageWrapper}>
											<ErrorMessage errorMessage={gasError} />
										</View>
									)}
								</View>
							</>
						)}
					</View>
				</ActionModal>
			</SafeAreaView>
		);
	};
}

const mapStateToProps = state => ({
	accounts: state.engine.backgroundState.AccountTrackerController.accounts,
	conversionRate: state.engine.backgroundState.CurrencyRateController.conversionRate,
	currentCurrency: state.engine.backgroundState.CurrencyRateController.currentCurrency,
	identities: state.engine.backgroundState.PreferencesController.identities,
	ticker: state.engine.backgroundState.NetworkController.provider.ticker,
	transaction: getNormalizedTxState(state),
	transactions: state.engine.backgroundState.TransactionController.transactions,
	accountsLength: Object.keys(state.engine.backgroundState.AccountTrackerController.accounts).length,
	tokensLength: state.engine.backgroundState.AssetsController.tokens.length,
	providerType: state.engine.backgroundState.NetworkController.provider.type,
	primaryCurrency: state.settings.primaryCurrency,
	activeTabUrl: state.browser.tabs.find(({ id }) => id === state.browser.activeTab).url
});

const mapDispatchToProps = dispatch => ({
	setTransactionObject: transaction => dispatch(setTransactionObject(transaction)),
	showAlert: config => dispatch(showAlert(config))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(Approve);
