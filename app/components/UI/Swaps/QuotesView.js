import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { View, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { connect } from 'react-redux';
import IonicIcon from 'react-native-vector-icons/Ionicons';
import AntIcon from 'react-native-vector-icons/AntDesign';
import FeatherIcon from 'react-native-vector-icons/Feather';
import FAIcon from 'react-native-vector-icons/FontAwesome';
import FA5Icon from 'react-native-vector-icons/FontAwesome5';
import BigNumber from 'bignumber.js';
import { toChecksumAddress } from 'ethereumjs-util';
import { NavigationContext } from 'react-navigation';

import Engine from '../../../core/Engine';
import AppConstants from '../../../core/AppConstants';
import Device from '../../../util/Device';
import Modal from 'react-native-modal';
import { colors } from '../../../styles/common';
import { hexToBN, renderFromTokenMinimalUnit, renderFromWei, toWei, weiToFiat } from '../../../util/number';
import { getErrorMessage, getFetchParams, getQuotesNavigationsParams, useRatio } from './utils';
import { getSwapsQuotesNavbar } from '../Navbar';
import Text from '../../Base/Text';
import Alert from '../../Base/Alert';
import Title from '../../Base/Title';
import useModalHandler from '../../Base/hooks/useModalHandler';
import ScreenView from '../FiatOrders/components/ScreenView';
import StyledButton from '../StyledButton';
import SliderButton from '../SliderButton';
import TokenIcon from './components/TokenIcon';
import QuotesSummary from './components/QuotesSummary';
import FeeModal from './components/FeeModal';
import QuotesModal from './components/QuotesModal';
import { strings } from '../../../../locales/i18n';
import { swapsUtils } from '@estebanmino/controllers';
import useBalance from './utils/useBalance';
import { fetchBasicGasEstimates } from '../../../util/custom-gas';
import CustomGas from '../CustomGas';
import useGasPrice from './utils/useGasPrice';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import AnimatedTransactionModal from '../AnimatedTransactionModal';
import { calcTokenAmount } from '@estebanmino/controllers/dist/util';

const POLLING_INTERVAL = AppConstants.SWAPS.POLLING_INTERVAL;

const styles = StyleSheet.create({
	screen: {
		flexGrow: 1,
		justifyContent: 'space-between'
	},
	topBar: {
		alignItems: 'center',
		marginVertical: 12
	},
	alertBar: {
		paddingHorizontal: 20,
		marginVertical: 10,
		width: '100%'
	},
	timerWrapper: {
		backgroundColor: colors.grey000,
		borderRadius: 20,
		marginVertical: 12,
		paddingVertical: 4,
		paddingHorizontal: 15,
		flexDirection: 'row',
		alignItems: 'center'
	},
	timer: {
		fontVariant: ['tabular-nums']
	},
	timerHiglight: {
		color: colors.red
	},
	content: {
		paddingHorizontal: 20,
		alignItems: 'center'
	},
	errorViewContent: {
		flex: 1,
		paddingHorizontal: 40,
		justifyContent: 'center'
	},
	sourceTokenContainer: {
		flexDirection: 'row',
		alignItems: 'center'
	},
	tokenIcon: {
		marginHorizontal: 5
	},
	tokenText: {
		color: colors.grey500,
		fontSize: Device.isSmallDevice() ? 16 : 18
	},
	tokenTextDestination: {
		color: colors.fontPrimary
	},
	arrowDown: {
		color: colors.grey100,
		fontSize: Device.isSmallDevice() ? 22 : 25,
		marginHorizontal: 15,
		marginTop: Device.isSmallDevice() ? 2 : 4,
		marginBottom: Device.isSmallDevice() ? 0 : 2
	},
	amount: {
		textAlignVertical: 'center',
		fontSize: Device.isSmallDevice() ? 45 : 60,
		marginBottom: Device.isSmallDevice() ? 8 : 24
	},
	exchangeRate: {
		flexDirection: 'row',
		alignItems: 'center',
		marginVertical: Device.isSmallDevice() ? 1 : 1
	},
	bottomSection: {
		marginBottom: 12,
		alignItems: 'stretch',
		paddingHorizontal: 20
	},
	sliderButtonText: {
		fontSize: 16,
		color: colors.white
	},
	quotesSummary: {
		marginVertical: Device.isSmallDevice() ? 12 : 24
	},
	quotesSummaryHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		flexWrap: 'wrap'
	},
	quotesRow: {
		flexDirection: 'row'
	},
	quotesDescription: {
		flex: 1,
		flexWrap: 'wrap',
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginRight: 6
	},
	quotesLegend: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		marginRight: 2
	},
	quotesFiatColumn: {
		alignItems: 'flex-end',
		justifyContent: 'center'
	},
	infoIcon: {
		fontSize: 12,
		margin: 3,
		color: colors.blue
	},
	ctaButton: {
		width: '100%'
	},
	errorIcon: {
		fontSize: 44,
		marginVertical: 4,
		color: colors.red
	},
	expiredIcon: {
		color: colors.blue
	},
	keyboardAwareWrapper: {
		flex: 1,
		justifyContent: 'flex-end'
	},
	bottomModal: {
		justifyContent: 'flex-end',
		margin: 0
	}
});

async function resetAndStartPolling({ slippage, sourceToken, destinationToken, sourceAmount, walletAddress }) {
	const { SwapsController, TokenRatesController, AssetsController } = Engine.context;
	const contractExchangeRates = TokenRatesController.state.contractExchangeRates;
	// ff the token is not in the wallet, we'll add it
	if (
		destinationToken.address !== swapsUtils.ETH_SWAPS_TOKEN_ADDRESS &&
		!contractExchangeRates[toChecksumAddress(destinationToken.address)]
	) {
		const { address, symbol, decimals } = destinationToken;
		await AssetsController.addToken(address, symbol, decimals);
		await new Promise(resolve =>
			setTimeout(() => {
				resolve();
			}, 500)
		);
	}
	const destinationTokenConversionRate =
		TokenRatesController.state.contractExchangeRates[toChecksumAddress(destinationToken.address)] || 0;

	// TODO: destinationToken could be the 0 address for ETH, also tokens that aren't on the wallet
	const fetchParams = getFetchParams({
		slippage,
		sourceToken,
		destinationToken,
		sourceAmount,
		walletAddress,
		destinationTokenConversionRate
	});
	await SwapsController.stopPollingAndResetState();
	await SwapsController.startFetchAndSetQuotes(fetchParams, fetchParams.metaData);
}

function SwapsQuotesView({
	tokens,
	accounts,
	balances,
	selectedAddress,
	currentCurrency,
	conversionRate,
	isInPolling,
	isInFetch,
	quotesLastFetched,
	pollingCyclesLeft,
	approvalTransaction,
	topAggId,
	quotes,
	quoteValues,
	errorKey
}) {
	const navigation = useContext(NavigationContext);

	/* Get params from navigation */
	const { sourceTokenAddress, destinationTokenAddress, sourceAmount, slippage } = useMemo(
		() => getQuotesNavigationsParams(navigation),
		[navigation]
	);

	/* Get tokens from the tokens list */
	const sourceToken = tokens?.find(token => token.address?.toLowerCase() === sourceTokenAddress.toLowerCase());
	const destinationToken = tokens?.find(
		token => token.address?.toLowerCase() === destinationTokenAddress.toLowerCase()
	);

	/* Balance */
	const balance = useBalance(accounts, balances, selectedAddress, sourceToken, { asUnits: true });
	const [hasEnoughBalance, missingBalance] = useMemo(() => {
		const sourceBN = new BigNumber(sourceAmount);
		const balanceBN = new BigNumber(balance);
		const hasEnough = balanceBN.gte(sourceBN);
		return [hasEnough, hasEnough ? null : sourceBN.minus(balanceBN)];
	}, [balance, sourceAmount]);

	/* State */
	const [firstLoadTime, setFirstLoadTime] = useState(Date.now());
	const [isFirstLoad, setFirstLoad] = useState(true);
	const [remainingTime, setRemainingTime] = useState(POLLING_INTERVAL);
	const [basicGasEstimates, setBasicGasEstimates] = useState({});
	// TODO: use this variable in the future when calculating savings
	const [isSaving] = useState(false);

	/* Get the ratio between the assets given the selected quote*/
	const [ratioAsSource, setRatioAsSource] = useState(true);

	/* Selected quote, initially topAggId (see effects) */
	const [selectedQuoteId, setSelectedQuoteId] = useState(null);

	const [editGasVisible, setEditGasVisible] = useState(false);

	const [apiGasPrice] = useGasPrice();
	const [customGasPrice, setCustomGasPrice] = useState(null);
	const [customGasLimit, setCustomGasLimit] = useState(null);

	/* Get quotes as an array sorted by overallValue */
	const allQuotes = useMemo(() => {
		if (!quotes || !quoteValues || Object.keys(quotes).length === 0 || Object.keys(quoteValues).length === 0) {
			return [];
		}

		const orderedValues = Object.values(quoteValues).sort(
			(a, b) => Number(b.overallValueOfQuote) - Number(a.overallValueOfQuote)
		);

		return orderedValues.map(quoteValue => quotes[quoteValue.aggregator]);
	}, [quoteValues, quotes]);

	/* Get the selected quote, by default is topAggId */
	const selectedQuote = useMemo(() => allQuotes.find(quote => quote.aggregator === selectedQuoteId), [
		allQuotes,
		selectedQuoteId
	]);
	const selectedQuoteValue = useMemo(() => quoteValues[selectedQuoteId], [quoteValues, selectedQuoteId]);

	console.log('- USE MEMO gasPrice', customGasPrice, apiGasPrice?.average);
	console.log('- USE MEMO gasLimit', customGasLimit, selectedQuote?.trade?.gas);
	const gasPrice = useMemo(() => customGasPrice || apiGasPrice?.average, [customGasPrice, apiGasPrice]);
	const gasLimit = useMemo(
		() => customGasLimit || selectedQuote?.trade?.gasEstimateWithRefund || selectedQuote?.averageGas,
		[customGasLimit, selectedQuote]
	);

	const [numerator, denominator] = useMemo(() => {
		const source = { ...sourceToken, amount: selectedQuote?.sourceAmount };
		const destination = { ...destinationToken, amount: selectedQuote?.destinationAmount };

		return ratioAsSource ? [destination, source] : [source, destination];
	}, [destinationToken, ratioAsSource, selectedQuote, sourceToken]);

	const ratio = useRatio(numerator?.amount, numerator?.decimals, denominator?.amount, denominator?.decimals);

	/* Modals, state and handlers */
	const [isFeeModalVisible, toggleFeeModal, , hideFeeModal] = useModalHandler(false);
	const [isQuotesModalVisible, toggleQuotesModal, , hideQuotesModal] = useModalHandler(false);

	/* Handlers */
	const handleRatioSwitch = () => setRatioAsSource(isSource => !isSource);

	const handleRetryFetchQuotes = useCallback(() => {
		if (errorKey === swapsUtils.SwapsError.QUOTES_EXPIRED_ERROR) {
			navigation.setParams({ leftAction: strings('navigation.back') });
			setFirstLoadTime(Date.now());
			setFirstLoad(true);
			resetAndStartPolling({
				slippage,
				sourceToken,
				destinationToken,
				sourceAmount,
				fromAddress: selectedAddress
			});
		} else {
			navigation.pop();
		}
	}, [errorKey, slippage, sourceToken, destinationToken, sourceAmount, selectedAddress, navigation]);

	const handleCompleteSwap = useCallback(async () => {
		if (!selectedQuote) {
			return;
		}
		const { TransactionController } = Engine.context;
		if (basicGasEstimates?.average) {
			if (approvalTransaction) {
				approvalTransaction.gasPrice = gasPrice;
			}
			selectedQuote.trade.gasPrice = gasPrice;
		}

		if (approvalTransaction) {
			await TransactionController.addTransaction(approvalTransaction);
		}
		// Modify gas limit for trade transaction only
		selectedQuote.trade.gas = gasLimit;
		await TransactionController.addTransaction(selectedQuote.trade);
		navigation.dismiss();
	}, [navigation, selectedQuote, approvalTransaction, basicGasEstimates, gasPrice, gasLimit]);

	const onEditMaxGas = () => setEditGasVisible(true);
	const onEditMaxGasCancel = () => setEditGasVisible(false);

	const onHandleGasFeeSelection = (gas, gasPrice) => {
		setCustomGasPrice(gasPrice);
		setCustomGasLimit(gas);
	};

	const gasFee = useMemo(() => {
		console.log('gasFee', customGasPrice, gasLimit);
		if (customGasPrice) {
			return calcTokenAmount(customGasPrice * gasLimit, 18);
		}
		return selectedQuoteValue?.ethFee;
	}, [selectedQuoteValue, customGasPrice, gasLimit]);

	const maxGasFee = useMemo(() => {
		console.log('maxGasFee', customGasPrice, selectedQuote?.maxGas?.toString(16));
		if (customGasPrice && selectedQuote?.maxGas) {
			return calcTokenAmount(customGasPrice * selectedQuote?.maxGas, 18);
		}
		return selectedQuoteValue?.maxEthFee;
	}, [selectedQuote, selectedQuoteValue, customGasPrice]);

	/* Effects */

	/* Main polling effect */
	useEffect(() => {
		resetAndStartPolling({
			slippage,
			sourceToken,
			destinationToken,
			sourceAmount,
			walletAddress: selectedAddress
		});
		return () => {
			const { SwapsController } = Engine.context;
			SwapsController.stopPollingAndResetState();
		};
	}, [destinationToken, selectedAddress, slippage, sourceAmount, sourceToken]);

	/* First load effect: handle initial animation */
	useEffect(() => {
		if (isFirstLoad) {
			if (firstLoadTime < quotesLastFetched || errorKey) {
				setFirstLoad(false);
				if (!errorKey) {
					navigation.setParams({ leftAction: strings('swaps.edit') });
				}
			}
		}
	}, [errorKey, firstLoadTime, isFirstLoad, navigation, quotesLastFetched]);

	/* selectedQuoteId effect: when topAggId changes make it selected by default */
	useEffect(() => setSelectedQuoteId(topAggId), [topAggId]);

	useEffect(() => {
		const setGasPriceEstimates = async () => {
			const basicGasEstimates = await fetchBasicGasEstimates();
			setBasicGasEstimates(basicGasEstimates);
		};
		setGasPriceEstimates();
	}, []);

	/* IsInFetch effect: hide every modal, handle countdown */
	useEffect(() => {
		if (isInFetch) {
			setRemainingTime(POLLING_INTERVAL);
			hideFeeModal();
			hideQuotesModal();
			return;
		}
		const tick = setInterval(() => {
			setRemainingTime(quotesLastFetched + POLLING_INTERVAL - Date.now() + 1000);
		}, 1000);
		return () => {
			clearInterval(tick);
		};
	}, [hideFeeModal, hideQuotesModal, isInFetch, quotesLastFetched]);

	/* errorKey effect: hide every modal*/
	useEffect(() => {
		if (errorKey) {
			hideFeeModal();
			hideQuotesModal();
		}
	}, [errorKey, hideFeeModal, hideQuotesModal]);

	/* Rendering */
	if (isFirstLoad || (!errorKey && !selectedQuote)) {
		return (
			<ScreenView contentContainerStyle={styles.screen}>
				<View style={[styles.content, styles.errorViewContent]}>
					<ActivityIndicator size="large" />
				</View>
			</ScreenView>
		);
	}

	if (!isInPolling && errorKey) {
		const [errorTitle, errorMessage, errorAction] = getErrorMessage(errorKey);
		const errorIcon =
			errorKey === swapsUtils.SwapsError.QUOTES_EXPIRED_ERROR ? (
				<FeatherIcon name="clock" style={[styles.errorIcon, styles.expiredIcon]} />
			) : (
				<AntIcon name="warning" style={[styles.errorIcon]} />
			);

		return (
			<ScreenView contentContainerStyle={styles.screen}>
				<View style={[styles.content, styles.errorViewContent]}>
					{errorIcon}
					<Title centered>{errorTitle}</Title>
					<Text centered>{errorMessage}</Text>
				</View>
				<View style={styles.bottomSection}>
					<StyledButton type="blue" containerStyle={styles.ctaButton} onPress={handleRetryFetchQuotes}>
						{errorAction}
					</StyledButton>
				</View>
			</ScreenView>
		);
	}

	return (
		<ScreenView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
			<View style={styles.topBar}>
				{!hasEnoughBalance && (
					<View style={styles.alertBar}>
						<Alert small type="info">
							{strings('swaps.you_need')}{' '}
							<Text reset bold>
								{renderFromTokenMinimalUnit(missingBalance, sourceToken.decimals)} {sourceToken.symbol}
							</Text>{' '}
							{strings('swaps.more_to_complete')}
						</Alert>
					</View>
				)}
				{isInPolling && (
					<View style={styles.timerWrapper}>
						{isInFetch ? (
							<>
								<ActivityIndicator size="small" />
								<Text> {strings('swaps.fetching_new_quotes')}</Text>
							</>
						) : (
							<Text primary>
								{pollingCyclesLeft > 0
									? strings('swaps.new_quotes_in')
									: strings('swaps.quotes_expire_in')}{' '}
								<Text
									bold
									primary
									style={[styles.timer, remainingTime < 30000 && styles.timerHiglight]}
								>
									{new Date(remainingTime).toISOString().substr(15, 4)}
								</Text>
							</Text>
						)}
					</View>
				)}
				{!isInPolling && (
					<View style={styles.timerWrapper}>
						<Text>...</Text>
					</View>
				)}
			</View>

			<View style={styles.content}>
				{selectedQuote && (
					<>
						<View style={styles.sourceTokenContainer}>
							<Text style={styles.tokenText}>
								{renderFromTokenMinimalUnit(selectedQuote.sourceAmount, sourceToken.decimals)}
							</Text>
							<TokenIcon
								style={styles.tokenIcon}
								icon={sourceToken.iconUrl}
								symbol={sourceToken.symbol}
							/>
							<Text style={styles.tokenText}>{sourceToken.symbol}</Text>
						</View>
						<IonicIcon style={styles.arrowDown} name="md-arrow-down" />
						<View style={styles.sourceTokenContainer}>
							<TokenIcon
								style={styles.tokenIcon}
								icon={destinationToken.iconUrl}
								symbol={destinationToken.symbol}
							/>
							<Text style={[styles.tokenText, styles.tokenTextDestination]}>
								{destinationToken.symbol}
							</Text>
						</View>
						<Text primary style={styles.amount} numberOfLines={1} adjustsFontSizeToFit allowFontScaling>
							~{renderFromTokenMinimalUnit(selectedQuote.destinationAmount, destinationToken.decimals)}
						</Text>
						<View style={styles.exchangeRate}>
							<Text>
								1 {denominator?.symbol} = {ratio.toFormat(10)} {numerator?.symbol}{' '}
								<FA5Icon name="sync" style={styles.infoIcon} onPress={handleRatioSwitch} />
							</Text>
						</View>
					</>
				)}
			</View>

			<View style={styles.bottomSection}>
				{selectedQuote && (
					<QuotesSummary style={styles.quotesSummary}>
						<QuotesSummary.Header style={styles.quotesSummaryHeader} savings={isSaving}>
							<QuotesSummary.HeaderText bold>
								{isSaving ? strings('swaps.savings') : strings('swaps.using_best_quote')}
							</QuotesSummary.HeaderText>
							<TouchableOpacity onPress={toggleQuotesModal}>
								<QuotesSummary.HeaderText small>
									{strings('swaps.view_details')} →
								</QuotesSummary.HeaderText>
							</TouchableOpacity>
						</QuotesSummary.Header>
						<QuotesSummary.Body>
							<View style={styles.quotesRow}>
								<View style={styles.quotesDescription}>
									<View style={styles.quotesLegend}>
										<Text primary bold>
											{strings('swaps.estimated_gas_fee')}
										</Text>
									</View>
									<Text primary bold>
										{renderFromWei(toWei(gasFee))} ETH
									</Text>
								</View>
								<View style={styles.quotesFiatColumn}>
									<Text primary bold>
										{weiToFiat(toWei(gasFee), conversionRate, currentCurrency)}
									</Text>
								</View>
							</View>

							<View style={styles.quotesRow}>
								<View style={styles.quotesDescription}>
									<View style={styles.quotesLegend}>
										<Text>{strings('swaps.max_gas_fee')} </Text>
										<TouchableOpacity onPress={onEditMaxGas}>
											<Text link>{strings('swaps.edit')}</Text>
										</TouchableOpacity>
									</View>
									<Text>{renderFromWei(toWei(maxGasFee))} ETH</Text>
								</View>
								<View style={styles.quotesFiatColumn}>
									<Text>{weiToFiat(toWei(maxGasFee), conversionRate, currentCurrency)}</Text>
								</View>
							</View>

							{approvalTransaction && (
								<View style={styles.quotesRow}>
									<TouchableOpacity style={styles.quotesRow}>
										<Text>
											{`${strings('swaps.enable.this_will')} `}
											<Text bold>
												{`${strings('swaps.enable.enable_asset', {
													asset: sourceToken.symbol
												})} `}
											</Text>
											{`${strings('swaps.enable.for_swapping')}`}
											{/* TODO: allow token spend limit in the future */}
											{/* <Text link>{` ${strings('swaps.enable.edit_limit')}`}</Text> */}
										</Text>
									</TouchableOpacity>
								</View>
							)}
							<QuotesSummary.Separator />
							<View style={styles.quotesRow}>
								<TouchableOpacity style={styles.quotesRow} onPress={toggleFeeModal}>
									<Text small>
										{`${strings('swaps.quotes_include_fee', { fee: selectedQuote.fee })} `}
										<FAIcon name="info-circle" style={styles.infoIcon} />
									</Text>
								</TouchableOpacity>
							</View>
						</QuotesSummary.Body>
					</QuotesSummary>
				)}
				<SliderButton
					incompleteText={
						<Text style={styles.sliderButtonText}>
							{strings('swaps.swipe_to')}{' '}
							<Text reset bold>
								{strings('swaps.swap')}
							</Text>
						</Text>
					}
					completeText={<Text style={styles.sliderButtonText}>{strings('swaps.completed_swap')}</Text>}
					disabled={!isInPolling || isInFetch || !selectedQuote || !hasEnoughBalance}
					onComplete={handleCompleteSwap}
				/>
			</View>

			<FeeModal isVisible={isFeeModalVisible} toggleModal={toggleFeeModal} />
			<QuotesModal
				isVisible={isQuotesModalVisible}
				toggleModal={toggleQuotesModal}
				quotes={allQuotes}
				destinationToken={destinationToken}
				selectedQuote={selectedQuoteId}
			/>
			<Modal
				isVisible={editGasVisible}
				animationIn="slideInUp"
				animationOut="slideOutDown"
				style={styles.bottomModal}
				backdropOpacity={0.7}
				animationInTiming={600}
				animationOutTiming={600}
				onBackdropPress={onEditMaxGasCancel}
				onBackButtonPress={onEditMaxGasCancel}
				onSwipeComplete={onEditMaxGasCancel}
				swipeDirection={'down'}
				propagateSwipe
			>
				<KeyboardAwareScrollView contentContainerStyle={styles.keyboardAwareWrapper}>
					<AnimatedTransactionModal onModeChange={() => undefined} ready review={onEditMaxGasCancel}>
						<CustomGas
							handleGasFeeSelection={onHandleGasFeeSelection}
							basicGasEstimates={apiGasPrice}
							gas={hexToBN(gasLimit)}
							gasPrice={toWei(gasPrice)}
							gasError={null}
							mode={'edit'}
							transaction={selectedQuote.trade}
						/>
					</AnimatedTransactionModal>
				</KeyboardAwareScrollView>
			</Modal>
		</ScreenView>
	);
}

SwapsQuotesView.propTypes = {
	tokens: PropTypes.arrayOf(PropTypes.object),
	/**
	 * Map of accounts to information objects including balances
	 */
	accounts: PropTypes.object,
	/**
	 * An object containing token balances for current account and network in the format address => balance
	 */
	balances: PropTypes.object,
	/**
	 * ETH to current currency conversion rate
	 */
	conversionRate: PropTypes.number,
	/**
	 * Currency code of the currently-active currency
	 */
	currentCurrency: PropTypes.string,
	/**
	 * A string that represents the selected address
	 */
	selectedAddress: PropTypes.string,
	isInPolling: PropTypes.bool,
	isInFetch: PropTypes.bool,
	quotesLastFetched: PropTypes.number,
	topAggId: PropTypes.string,
	pollingCyclesLeft: PropTypes.number,
	quotes: PropTypes.object,
	quoteValues: PropTypes.object,
	approvalTransaction: PropTypes.object,
	errorKey: PropTypes.string
};

SwapsQuotesView.navigationOptions = ({ navigation }) => getSwapsQuotesNavbar(navigation);

const mapStateToProps = state => ({
	accounts: state.engine.backgroundState.AccountTrackerController.accounts,
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	balances: state.engine.backgroundState.TokenBalancesController.contractBalances,
	conversionRate: state.engine.backgroundState.CurrencyRateController.conversionRate,
	currentCurrency: state.engine.backgroundState.CurrencyRateController.currentCurrency,
	tokens: state.engine.backgroundState.SwapsController.tokens,
	isInPolling: state.engine.backgroundState.SwapsController.isInPolling,
	isInFetch: state.engine.backgroundState.SwapsController.isInFetch,
	quotesLastFetched: state.engine.backgroundState.SwapsController.quotesLastFetched,
	pollingCyclesLeft: state.engine.backgroundState.SwapsController.pollingCyclesLeft,
	topAggId: state.engine.backgroundState.SwapsController.topAggId,
	quotes: state.engine.backgroundState.SwapsController.quotes,
	quoteValues: state.engine.backgroundState.SwapsController.quoteValues,
	approvalTransaction: state.engine.backgroundState.SwapsController.approvalTransaction,
	errorKey: state.engine.backgroundState.SwapsController.errorKey
});

export default connect(mapStateToProps)(SwapsQuotesView);
