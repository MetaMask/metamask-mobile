import React, { PureComponent } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, InteractionManager } from 'react-native';
import ActionView from '../../UI/ActionView';
import Clipboard from '@react-native-community/clipboard';
import PropTypes from 'prop-types';
import { getApproveNavbar } from '../../UI/Navbar';
import { colors, fontStyles, baseStyles } from '../../../styles/common';
import { connect } from 'react-redux';
import { getHost } from '../../../util/browser';
import contractMap from 'eth-contract-metadata';
import { safeToChecksumAddress, renderShortAddress } from '../../../util/address';
import Engine from '../../../core/Engine';
import { strings } from '../../../../locales/i18n';
import { setTransactionObject } from '../../../actions/transaction';
import { util } from '@metamask/controllers';
import { renderFromWei, weiToFiatNumber, fromTokenMinimalUnit } from '../../../util/number';
import currencySymbols from '../../../util/currency-symbols.json';
import {
	getTicker,
	decodeTransferData,
	getNormalizedTxState,
	getActiveTabUrl,
	getMethodData
} from '../../../util/transactions';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import ErrorMessage from '../../Views/SendFlow/ErrorMessage';
import { showAlert } from '../../../actions/alert';
import Analytics from '../../../core/Analytics';
import { ANALYTICS_EVENT_OPTS } from '../../../util/analytics';
import TransactionHeader from '../../UI/TransactionHeader';
import ConnectHeader from '../../UI/ConnectHeader';
import AccountInfoCard from '../../UI/AccountInfoCard';
import IonicIcon from 'react-native-vector-icons/Ionicons';
import TransactionReviewDetailsCard from '../../UI/TransactionReview/TransactionReivewDetailsCard';
import StyledButton from '../../UI/StyledButton';
import Device from '../../../util/Device';
import AppConstants from '../../../core/AppConstants';
import { WALLET_CONNECT_ORIGIN } from '../../../util/walletconnect';

const { hexToBN } = util;
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
		marginVertical: 16,
		paddingHorizontal: 16
	},
	explanation: {
		...fontStyles.normal,
		fontSize: 14,
		textAlign: 'center',
		color: colors.black,
		lineHeight: 20,
		paddingHorizontal: 16
	},
	editPermissionWrapper: {
		paddingHorizontal: 16,
		paddingBottom: 16
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
	actionViewWrapper: {
		height: Device.isMediumDevice() ? 200 : 350
	},
	actionViewChildren: {
		height: 300
	},
	paddingHorizontal: {
		paddingHorizontal: 16
	}
});

const { ORIGIN_DEEPLINK, ORIGIN_QR_CODE } = AppConstants.DEEPLINKS;

/**
 * PureComponent that manages ERC20 approve from the dapp browser
 */
class ApproveTransactionReview extends PureComponent {
	static navigationOptions = ({ navigation }) => getApproveNavbar('approve.title', navigation);

	static propTypes = {
		/**
		 * ETH to current currency conversion rate
		 */
		conversionRate: PropTypes.number,
		/**
		 * Callback triggered when this transaction is cancelled
		 */
		onCancel: PropTypes.func,
		/**
		 * Callback triggered when this transaction is confirmed
		 */
		onConfirm: PropTypes.func,
		/**
		 * Currency code of the currently-active currency
		 */
		currentCurrency: PropTypes.string,
		/**
		 * Transaction state
		 */
		transaction: PropTypes.object.isRequired,
		/**
		 * Action that shows the global alert
		 */
		showAlert: PropTypes.func,
		/**
		 * Current provider ticker
		 */
		ticker: PropTypes.string,
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
		/**
		 * Function to change the mode
		 */
		onModeChange: PropTypes.func,
		/**
		 * Error coming from gas component
		 */
		gasError: PropTypes.string,
		/**
		 * Primary currency, either ETH or Fiat
		 */
		primaryCurrency: PropTypes.string,
		/**
		 * Active tab URL, the currently active tab url
		 */
		activeTabUrl: PropTypes.string
	};

	state = {
		viewData: false,
		editPermissionVisible: false,
		host: undefined,
		originalApproveAmount: undefined,
		totalGas: undefined,
		totalGasFiat: undefined,
		tokenSymbol: undefined,
		spendLimitUnlimitedSelected: true,
		spendLimitCustomValue: undefined,
		ticker: getTicker(this.props.ticker),
		viewDetails: false,
		spenderAddress: '0x...'
	};

	customSpendLimitInput = React.createRef();
	originIsWalletConnect = this.props.transaction.origin?.includes(WALLET_CONNECT_ORIGIN);

	componentDidMount = async () => {
		const {
			transaction: { origin, to, gas, gasPrice, data },
			conversionRate
		} = this.props;
		const { AssetsContractController } = Engine.context;
		const host = getHost(this.originIsWalletConnect ? origin.split(WALLET_CONNECT_ORIGIN)[1] : origin);
		let tokenSymbol, tokenDecimals;
		const contract = contractMap[safeToChecksumAddress(to)];
		if (!contract) {
			try {
				tokenDecimals = await AssetsContractController.getTokenDecimals(to);
				tokenSymbol = await AssetsContractController.getAssetSymbol(to);
				tokenDecimals = await AssetsContractController.getTokenDecimals(to);
			} catch (e) {
				tokenSymbol = 'ERC20 Token';
				tokenDecimals = 18;
			}
		} else {
			tokenSymbol = contract.symbol;
			tokenDecimals = contract.decimals;
		}
		const [spenderAddress, , originalApproveAmount] = decodeTransferData('transfer', data);
		const approveAmount = fromTokenMinimalUnit(hexToBN(originalApproveAmount), tokenDecimals);
		const totalGas = gas?.mul(gasPrice);
		const { name: method } = await getMethodData(data);

		this.setState({
			host,
			method,
			originalApproveAmount: approveAmount,
			tokenSymbol,
			totalGas: renderFromWei(totalGas),
			totalGasFiat: weiToFiatNumber(totalGas, conversionRate),
			spenderAddress
		});
	};

	componentDidUpdate(previousProps, previousState) {
		const {
			transaction: { gas, gasPrice },
			conversionRate
		} = this.props;
		const totalGas = gas?.mul(gasPrice);
		if (
			previousProps.transaction.gas !== this.props.transaction.gas ||
			previousProps.transaction.gasPrice !== this.props.transaction.gasPrice
		) {
			// eslint-disable-next-line react/no-did-update-set-state
			this.setState({
				totalGas: renderFromWei(totalGas),
				totalGasFiat: weiToFiatNumber(totalGas, conversionRate)
			});
		}
	}

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

	toggleEditPermission = () => {
		const { editPermissionVisible } = this.state;
		!editPermissionVisible && this.trackApproveEvent(ANALYTICS_EVENT_OPTS.DAPP_APPROVE_SCREEN_EDIT_PERMISSION);
		this.setState({ editPermissionVisible: !editPermissionVisible });
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
		this.setState({ spendLimitCustomValue: value });
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

	edit = () => {
		const { onModeChange } = this.props;
		Analytics.trackEvent(ANALYTICS_EVENT_OPTS.TRANSACTIONS_EDIT_TRANSACTION);
		onModeChange && onModeChange('edit');
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
			<View style={[baseStyles.section, styles.editPermissionWrapper]}>
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
									{strings('spend_limit_edition.proposed')}
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

	render = () => {
		const {
			host,
			tokenSymbol,
			viewDetails,
			totalGas,
			totalGasFiat,
			editPermissionVisible,
			ticker,
			spenderAddress
		} = this.state;

		const {
			primaryCurrency,
			currentCurrency,
			gasError,
			activeTabUrl,
			transaction: { origin }
		} = this.props;

		const isFiat = primaryCurrency.toLowerCase() === 'fiat';
		const currencySymbol = currencySymbols[currentCurrency];
		const totalGasFiatRounded = Math.round(totalGasFiat * 100) / 100;
		const originIsDeeplink = origin === ORIGIN_DEEPLINK || origin === ORIGIN_QR_CODE;

		return (
			<View>
				{viewDetails ? (
					this.renderTransactionReview()
				) : editPermissionVisible ? (
					this.renderEditPermission()
				) : (
					<>
						<View style={styles.section} testID={'approve-screen'}>
							<TransactionHeader
								currentPageInformation={{ origin, spenderAddress, title: host, url: activeTabUrl }}
							/>
							<Text style={styles.title} testID={'allow-access'}>
								{strings(
									`spend_limit_edition.${
										originIsDeeplink ? 'allow_to_address_access' : 'allow_to_access'
									}`,
									{ tokenSymbol }
								)}
							</Text>
							<Text style={styles.explanation}>
								{`${strings(
									`spend_limit_edition.${
										originIsDeeplink ? 'you_trust_this_address' : 'you_trust_this_site'
									}`
								)}`}
							</Text>
							<View style={styles.actionViewWrapper}>
								<ActionView
									confirmButtonMode="confirm"
									cancelText={strings('transaction.reject')}
									confirmText={strings('transactions.approve')}
									onCancelPress={this.props.onCancel}
									onConfirmPress={this.props.onConfirm}
								>
									<View style={styles.actionViewChildren}>
										<TouchableOpacity
											style={styles.actionTouchable}
											onPress={this.toggleEditPermission}
										>
											<Text style={styles.editPermissionText}>
												{strings('spend_limit_edition.edit_permission')}
											</Text>
										</TouchableOpacity>
										<View style={styles.paddingHorizontal}>
											<AccountInfoCard />
											<View style={styles.section}>
												<TouchableOpacity onPress={this.edit}>
													<View style={styles.networkFee}>
														<Text style={styles.sectionLeft}>
															{strings('transaction.transaction_fee')}
														</Text>
														<Text style={styles.sectionRight}>
															{isFiat && currencySymbol}
															{isFiat ? totalGasFiatRounded : totalGas}{' '}
															{!isFiat && ticker}
														</Text>
														<View style={styles.networkFeeArrow}>
															<IonicIcon
																name="ios-arrow-forward"
																size={16}
																color={colors.grey00}
															/>
														</View>
													</View>
												</TouchableOpacity>
												<TouchableOpacity
													style={styles.actionTouchable}
													onPress={this.toggleViewDetails}
												>
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
										</View>
									</View>
								</ActionView>
							</View>
						</View>
					</>
				)}
			</View>
		);
	};
}

const mapStateToProps = state => ({
	accounts: state.engine.backgroundState.AccountTrackerController.accounts,
	conversionRate: state.engine.backgroundState.CurrencyRateController.conversionRate,
	currentCurrency: state.engine.backgroundState.CurrencyRateController.currentCurrency,
	ticker: state.engine.backgroundState.NetworkController.provider.ticker,
	transaction: getNormalizedTxState(state),
	accountsLength: Object.keys(state.engine.backgroundState.AccountTrackerController.accounts).length,
	tokensLength: state.engine.backgroundState.AssetsController.tokens.length,
	providerType: state.engine.backgroundState.NetworkController.provider.type,
	primaryCurrency: state.settings.primaryCurrency,
	activeTabUrl: getActiveTabUrl(state)
});

const mapDispatchToProps = dispatch => ({
	setTransactionObject: transaction => dispatch(setTransactionObject(transaction)),
	showAlert: config => dispatch(showAlert(config))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(ApproveTransactionReview);
