import React, { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { View, StyleSheet, ActivityIndicator, TouchableOpacity, InteractionManager, Linking } from 'react-native';
import { connect } from 'react-redux';
import IonicIcon from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import FAIcon from 'react-native-vector-icons/FontAwesome';
import BigNumber from 'bignumber.js';
import { useNavigation, useRoute } from '@react-navigation/native';
import { swapsUtils } from '@metamask/swaps-controller';
import { WalletDevice, util } from '@metamask/controllers/';

import {
	BNToHex,
	fromTokenMinimalUnit,
	fromTokenMinimalUnitString,
	hexToBN,
	renderFromTokenMinimalUnit,
	renderFromWei,
	toWei,
	weiToFiat
} from '../../../util/number';
import { isMainNet, isMainnetByChainId } from '../../../util/networks';
import { getErrorMessage, getFetchParams, getQuotesNavigationsParams, isSwapsNativeAsset } from './utils';
import { colors } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';

import Engine from '../../../core/Engine';
import AppConstants from '../../../core/AppConstants';
import Analytics from '../../../core/Analytics';
import Device from '../../../util/Device';
import { ANALYTICS_EVENT_OPTS } from '../../../util/analytics';

import { getSwapsQuotesNavbar } from '../Navbar';
import ScreenView from '../FiatOrders/components/ScreenView';
import Text from '../../Base/Text';
import Alert from '../../Base/Alert';
import StyledButton from '../StyledButton';
import SliderButton from '../SliderButton';

import LoadingAnimation from './components/LoadingAnimation';
import TokenIcon from './components/TokenIcon';
import QuotesSummary from './components/QuotesSummary';
import QuotesModal from './components/QuotesModal';
import Ratio from './components/Ratio';
import ActionAlert from './components/ActionAlert';
import TransactionsEditionModal from './components/TransactionsEditionModal';
import InfoModal from './components/InfoModal';
import useModalHandler from '../../Base/hooks/useModalHandler';
import useBalance from './utils/useBalance';
import useGasPrice from './utils/useGasPrice';
import { trackErrorAsAnalytics } from '../../../util/analyticsV2';
import { decodeApproveData, getTicker } from '../../../util/transactions';
import { toLowerCaseEquals } from '../../../util/general';
import { swapsTokensSelector } from '../../../reducers/swaps';

const POLLING_INTERVAL = AppConstants.SWAPS.POLLING_INTERVAL;
const EDIT_MODE_GAS = 'EDIT_MODE_GAS';
const EDIT_MODE_APPROVE_AMOUNT = 'EDIT_MODE_APPROVE_AMOUNT';
const SLIPPAGE_BUCKETS = {
	MEDIUM: 'medium',
	HIGH: 'high'
};

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
		marginHorizontal: Device.isSmallDevice() ? 20 : 55,
		justifyContent: 'center'
	},
	errorTitle: {
		fontSize: 24,
		marginVertical: 10
	},
	errorText: {
		fontSize: 14
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
		marginBottom: 6,
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
		flexDirection: 'row',
		flexWrap: 'wrap'
	},
	quotesDescription: {
		flex: 1,
		flexWrap: 'wrap',
		flexDirection: 'row',
		marginRight: 3
	},
	quotesLegend: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		marginRight: 2,
		alignItems: 'center'
	},
	quotesFiatColumn: {
		flex: 1,
		marginLeft: 3,
		flexWrap: 'wrap',
		flexDirection: 'row',
		justifyContent: 'flex-end'
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
		fontSize: 46,
		marginVertical: 4,
		color: colors.red
	},
	expiredIcon: {
		color: colors.blue
	},
	disabled: {
		opacity: 0.4
	},
	termsButton: {
		marginTop: 10,
		marginBottom: 6
	},
	gasInfoContainer: {
		paddingHorizontal: 2
	},
	gasInfoIcon: {
		color: colors.blue
	},
	hitSlop: {
		top: 10,
		left: 10,
		bottom: 10,
		right: 10
	},
	text: {
		lineHeight: 20
	}
});

async function resetAndStartPolling({ slippage, sourceToken, destinationToken, sourceAmount, walletAddress }) {
	if (!sourceToken || !destinationToken) {
		return;
	}
	const { SwapsController } = Engine.context;

	const fetchParams = getFetchParams({
		slippage,
		sourceToken,
		destinationToken,
		sourceAmount,
		walletAddress
	});
	await SwapsController.stopPollingAndResetState();
	await SwapsController.startFetchAndSetQuotes(fetchParams, fetchParams.metaData);
}

/**
 * Multiplies gasLimit by multiplier if both defined
 * @param {string} gasLimit
 * @param {number} multiplier
 */
const gasLimitWithMultiplier = (gasLimit, multiplier) => {
	if (!gasLimit || !multiplier) return;
	return new BigNumber(gasLimit).times(multiplier).integerValue();
};

async function addTokenToAssetsController(newToken) {
	const { AssetsController } = Engine.context;
	if (
		!isSwapsNativeAsset(newToken) &&
		!AssetsController.state.tokens.includes(token => toLowerCaseEquals(token.address, newToken.address))
	) {
		const { address, symbol, decimals } = newToken;
		await AssetsController.addToken(address, symbol, decimals);
	}
}

function SwapsQuotesView({
	swapsTokens,
	accounts,
	balances,
	selectedAddress,
	currentCurrency,
	conversionRate,
	chainId,
	ticker,
	isInPolling,
	quotesLastFetched,
	pollingCyclesLeft,
	approvalTransaction: originalApprovalTransaction,
	topAggId,
	aggregatorMetadata,
	quotes,
	quoteValues,
	error,
	quoteRefreshSeconds,
	usedGasPrice
}) {
	const navigation = useNavigation();
	const route = useRoute();
	/* Get params from navigation */
	const { sourceTokenAddress, destinationTokenAddress, sourceAmount, slippage } = useMemo(
		() => getQuotesNavigationsParams(route),
		[route]
	);

	/* Get tokens from the tokens list */
	const sourceToken = swapsTokens?.find(token => toLowerCaseEquals(token.address, sourceTokenAddress));
	const destinationToken = swapsTokens?.find(token => toLowerCaseEquals(token.address, destinationTokenAddress));

	/* State */
	const [firstLoadTime, setFirstLoadTime] = useState(Date.now());
	const [isFirstLoad, setIsFirstLoad] = useState(true);
	const [shouldFinishFirstLoad, setShouldFinishFirstLoad] = useState(false);
	const [remainingTime, setRemainingTime] = useState(POLLING_INTERVAL);

	const [allQuotesFetchTime, setAllQuotesFetchTime] = useState(null);
	const [trackedRequestedQuotes, setTrackedRequestedQuotes] = useState(false);
	const [trackedReceivedQuotes, setTrackedReceivedQuotes] = useState(false);
	const [trackedError, setTrackedError] = useState(false);
	const [showGasTooltip, setShowGasTooltip] = useState(false);

	/* Selected quote, initially topAggId (see effects) */
	const [selectedQuoteId, setSelectedQuoteId] = useState(null);

	/* Slippage alert dismissed, values: false, 'high', medium, 'low' */
	const [hasDismissedSlippageAlert, setHasDismissedSlippageAlert] = useState(false);

	const [editQuoteTransactionsVisible, setEditQuoteTransactionsVisible] = useState(false);

	const [apiGasPrice] = useGasPrice();
	const [customGasPrice, setCustomGasPrice] = useState(null);
	const [customGasLimit, setCustomGasLimit] = useState(null);
	const [warningGasPriceHigh, setWarningGasPriceHigh] = useState(null);

	// TODO: use this variable in the future when calculating savings
	const [isSaving] = useState(false);
	const [isInFetch, setIsInFetch] = useState(false);

	const hasConversionRate = useMemo(
		() =>
			Boolean(destinationToken) &&
			(isSwapsNativeAsset(destinationToken) ||
				(Object.keys(quotes).length > 0 && (Object.values(quotes)[0]?.destinationTokenRate ?? null) !== null)),
		[destinationToken, quotes]
	);

	/* Get quotes as an array sorted by overallValue */
	const allQuotes = useMemo(() => {
		if (!quotes || !quoteValues || Object.keys(quotes).length === 0 || Object.keys(quoteValues).length === 0) {
			return [];
		}

		const orderedAggregators = hasConversionRate
			? Object.values(quoteValues).sort((a, b) => Number(b.overallValueOfQuote) - Number(a.overallValueOfQuote))
			: Object.values(quotes).sort((a, b) => {
					const comparison = new BigNumber(b.destinationAmount).comparedTo(a.destinationAmount);
					if (comparison === 0) {
						// If the  destination amount is the same, we sort by fees ascending
						return (
							Number(quoteValues[a.aggregator]?.ethFee) - Number(quoteValues[b.aggregator]?.ethFee) || 0
						);
					}
					return comparison;
					// eslint-disable-next-line no-mixed-spaces-and-tabs
			  });

		return orderedAggregators.map(quoteValue => quotes[quoteValue.aggregator]);
	}, [hasConversionRate, quoteValues, quotes]);

	/* Get the selected quote, by default is topAggId */
	const selectedQuote = useMemo(() => allQuotes.find(quote => quote?.aggregator === selectedQuoteId), [
		allQuotes,
		selectedQuoteId
	]);
	const selectedQuoteValue = useMemo(() => quoteValues[selectedQuoteId], [
		// eslint-disable-next-line react-hooks/exhaustive-deps
		quoteValues[selectedQuoteId],
		quoteValues,
		selectedQuoteId
	]);

	/* gas estimations */
	const gasPrice = useMemo(() => customGasPrice?.toString(16) || usedGasPrice?.toString(16), [
		customGasPrice,
		usedGasPrice
	]);

	const gasLimit = useMemo(
		() =>
			(Boolean(customGasLimit) && BNToHex(customGasLimit)) ||
			gasLimitWithMultiplier(selectedQuote?.gasEstimate, selectedQuote?.gasMultiplier)?.toString(16) ||
			selectedQuote?.maxGas?.toString(16),
		[customGasLimit, selectedQuote]
	);

	/* Balance */
	const balance = useBalance(accounts, balances, selectedAddress, sourceToken, { asUnits: true });
	const [hasEnoughTokenBalance, missingTokenBalance, hasEnoughEthBalance, missingEthBalance] = useMemo(() => {
		// Token
		const sourceBN = new BigNumber(sourceAmount);
		const tokenBalanceBN = new BigNumber(balance.toString(10));
		const hasEnoughTokenBalance = tokenBalanceBN.gte(sourceBN);
		const missingTokenBalance = hasEnoughTokenBalance ? null : sourceBN.minus(tokenBalanceBN);

		const ethAmountBN = isSwapsNativeAsset(sourceToken) ? sourceBN : new BigNumber(0);
		const ethBalanceBN = new BigNumber(accounts[selectedAddress].balance);
		const gasBN = toWei(selectedQuoteValue?.maxEthFee || '0');
		const hasEnoughEthBalance = ethBalanceBN.gte(ethAmountBN.plus(gasBN));
		const missingEthBalance = hasEnoughEthBalance ? null : ethAmountBN.plus(gasBN).minus(ethBalanceBN);

		return [hasEnoughTokenBalance, missingTokenBalance, hasEnoughEthBalance, missingEthBalance];
	}, [accounts, balance, selectedQuoteValue, selectedAddress, sourceAmount, sourceToken]);

	/* Selected quote slippage */
	const shouldDisplaySlippage = useMemo(
		() =>
			(selectedQuote &&
				[SLIPPAGE_BUCKETS.MEDIUM, SLIPPAGE_BUCKETS.HIGH].includes(selectedQuote?.priceSlippage?.bucket)) ||
			selectedQuote?.priceSlippage?.calculationError?.length > 0,
		[selectedQuote]
	);

	const slippageRatio = useMemo(
		() =>
			parseFloat(
				new BigNumber(selectedQuote?.priceSlippage?.ratio || 0, 10)
					.minus(1, 10)
					.times(100, 10)
					.toFixed(2),
				10
			),
		[selectedQuote]
	);

	const unableToSwap = useMemo(
		() => !isInPolling || isInFetch || !selectedQuote || !hasEnoughTokenBalance || !hasEnoughEthBalance,
		[isInPolling, isInFetch, selectedQuote, hasEnoughTokenBalance, hasEnoughEthBalance]
	);

	/* Approval transaction if any */
	const [approvalTransaction, setApprovalTransaction] = useState(originalApprovalTransaction);
	const [editQuoteTransactionsMode, setEditQuoteTransactionsMode] = useState(EDIT_MODE_GAS);

	const approvalMinimumSpendLimit = useMemo(() => {
		if (!approvalTransaction) return '0';
		return fromTokenMinimalUnit(sourceAmount, sourceToken.decimals);
	}, [approvalTransaction, sourceAmount, sourceToken.decimals]);

	const onCancelEditQuoteTransactions = useCallback(() => setEditQuoteTransactionsVisible(false), []);

	useEffect(() => {
		setApprovalTransaction(originalApprovalTransaction);
	}, [originalApprovalTransaction]);

	/* Modals, state and handlers */
	const [isFeeModalVisible, toggleFeeModal, , hideFeeModal] = useModalHandler(false);
	const [isQuotesModalVisible, toggleQuotesModal, , hideQuotesModal] = useModalHandler(false);
	const [isUpdateModalVisible, toggleUpdateModal, , hideUpdateModal] = useModalHandler(false);
	const [isPriceDifferenceModalVisible, togglePriceDifferenceModal, , hidePriceDifferenceModal] = useModalHandler(
		false
	);
	const [isPriceImpactModalVisible, togglePriceImpactModal, , hidePriceImpactModal] = useModalHandler(false);

	/* Handlers */
	const handleAnimationEnd = useCallback(() => {
		setIsFirstLoad(false);
		if (!error?.key) {
			navigation.setParams({ leftAction: strings('swaps.edit') });
		}
	}, [error, navigation]);

	const handleRetryFetchQuotes = useCallback(() => {
		if (error?.key === swapsUtils.SwapsError.QUOTES_EXPIRED_ERROR) {
			navigation.setParams({ leftAction: strings('navigation.back') });
			setFirstLoadTime(Date.now());
			setIsFirstLoad(true);
			setTrackedRequestedQuotes(false);
			setTrackedReceivedQuotes(false);
			setTrackedError(false);
			resetAndStartPolling({
				slippage,
				sourceToken,
				destinationToken,
				sourceAmount,
				walletAddress: selectedAddress
			});
		} else {
			navigation.pop();
		}
	}, [error, slippage, sourceToken, destinationToken, sourceAmount, selectedAddress, navigation]);

	const updateSwapsTransactions = useCallback(
		async (transactionMeta, approvalTransactionMetaId, newSwapsTransactions) => {
			const { TransactionController } = Engine.context;
			const blockNumber = await util.query(TransactionController.ethQuery, 'blockNumber', []);
			const currentBlock = await util.query(TransactionController.ethQuery, 'getBlockByNumber', [
				blockNumber,
				false
			]);
			newSwapsTransactions[transactionMeta.id] = {
				action: 'swap',
				sourceToken: { address: sourceToken.address, decimals: sourceToken.decimals },
				destinationToken: { address: destinationToken.address, decimals: destinationToken.decimals },
				sourceAmount,
				destinationAmount: selectedQuote.destinationAmount,
				sourceAmountInFiat: weiToFiat(
					toWei(selectedQuote.priceSlippage?.sourceAmountInETH),
					conversionRate,
					currentCurrency
				),
				analytics: {
					token_from: sourceToken.symbol,
					token_from_amount: fromTokenMinimalUnitString(sourceAmount, sourceToken.decimals),
					token_to: destinationToken.symbol,
					token_to_amount: fromTokenMinimalUnitString(
						selectedQuote.destinationAmount,
						destinationToken.decimals
					),
					request_type: hasEnoughTokenBalance ? 'Order' : 'Quote',
					custom_slippage: slippage !== AppConstants.SWAPS.DEFAULT_SLIPPAGE,
					best_quote_source: selectedQuote.aggregator,
					available_quotes: allQuotes.length,
					network_fees_USD: weiToFiat(toWei(selectedQuoteValue?.ethFee), conversionRate, currentCurrency),
					network_fees_ETH: renderFromWei(toWei(selectedQuoteValue?.ethFee)),
					other_quote_selected: allQuotes[selectedQuoteId] === selectedQuote,
					chain_id: chainId
				},
				paramsForAnalytics: {
					sentAt: currentBlock.timestamp,
					gasEstimate: selectedQuote?.gasEstimate || selectedQuote?.maxGas,
					ethAccountBalance: accounts[selectedAddress].balance,
					approvalTransactionMetaId
				}
			};
			TransactionController.update({ swapsTransactions: newSwapsTransactions });
		},
		[
			chainId,
			accounts,
			selectedAddress,
			currentCurrency,
			selectedQuote,
			sourceToken,
			sourceAmount,
			destinationToken,
			hasEnoughTokenBalance,
			slippage,
			allQuotes,
			selectedQuoteId,
			conversionRate,
			selectedQuoteValue
		]
	);

	const handleCompleteSwap = useCallback(async () => {
		if (!selectedQuote) {
			return;
		}

		InteractionManager.runAfterInteractions(() => {
			const parameters = {
				token_from: sourceToken.symbol,
				token_from_amount: fromTokenMinimalUnitString(sourceAmount, sourceToken.decimals),
				token_to: destinationToken.symbol,
				token_to_amount: fromTokenMinimalUnitString(selectedQuote.destinationAmount, destinationToken.decimals),
				request_type: hasEnoughTokenBalance ? 'Order' : 'Quote',
				slippage,
				custom_slippage: slippage !== AppConstants.SWAPS.DEFAULT_SLIPPAGE,
				best_quote_source: selectedQuote.aggregator,
				available_quotes: allQuotes,
				other_quote_selected: allQuotes[selectedQuoteId] === selectedQuote,
				network_fees_USD: weiToFiat(toWei(selectedQuoteValue?.ethFee), conversionRate, 'usd'),
				network_fees_ETH: renderFromWei(toWei(selectedQuoteValue?.ethFee)),
				chain_id: chainId
			};
			Analytics.trackEventWithParameters(ANALYTICS_EVENT_OPTS.SWAP_STARTED, {});
			Analytics.trackEventWithParameters(ANALYTICS_EVENT_OPTS.SWAP_STARTED, parameters, true);
		});

		const { TransactionController } = Engine.context;
		const newSwapsTransactions = TransactionController.state.swapsTransactions || {};
		let approvalTransactionMetaId;
		if (approvalTransaction) {
			approvalTransaction.gasPrice = gasPrice;
			try {
				const { transactionMeta } = await TransactionController.addTransaction(
					approvalTransaction,
					process.env.MM_FOX_CODE,
					WalletDevice.MM_MOBILE
				);
				approvalTransactionMetaId = transactionMeta.id;
				newSwapsTransactions[transactionMeta.id] = {
					action: 'approval',
					sourceToken: { address: sourceToken.address, decimals: sourceToken.decimals },
					destinationToken: { swaps: 'swaps' },
					upTo: new BigNumber(decodeApproveData(approvalTransaction.data).encodedAmount, 16).toString(10)
				};
			} catch (e) {
				// send analytics
			}
		}
		// Modify gas limit for trade transaction only
		selectedQuote.trade.gasPrice = gasPrice;
		selectedQuote.trade.gas = gasLimit;
		try {
			const { transactionMeta } = await TransactionController.addTransaction(
				selectedQuote.trade,
				process.env.MM_FOX_CODE,
				WalletDevice.MM_MOBILE
			);
			updateSwapsTransactions(transactionMeta, approvalTransactionMetaId, newSwapsTransactions);
			await addTokenToAssetsController(destinationToken);
			await addTokenToAssetsController(sourceToken);
		} catch (e) {
			// send analytics
		}

		navigation.dangerouslyGetParent()?.pop();
	}, [
		chainId,
		navigation,
		selectedQuote,
		approvalTransaction,
		sourceToken,
		sourceAmount,
		destinationToken,
		hasEnoughTokenBalance,
		slippage,
		allQuotes,
		selectedQuoteValue,
		selectedQuoteId,
		conversionRate,
		gasPrice,
		gasLimit,
		updateSwapsTransactions
	]);

	const onEditQuoteTransactionsGas = useCallback(() => {
		setEditQuoteTransactionsMode(EDIT_MODE_GAS);
		setEditQuoteTransactionsVisible(true);
	}, []);

	const onEditQuoteTransactionsApproveAmount = useCallback(() => {
		if (!approvalTransaction || !originalApprovalTransaction) {
			return;
		}
		const originalApprovalTransactionEncodedAmount = decodeApproveData(originalApprovalTransaction.data)
			.encodedAmount;
		const originalAmount = fromTokenMinimalUnitString(
			hexToBN(originalApprovalTransactionEncodedAmount).toString(10),
			sourceToken.decimals
		);
		const currentApprovalTransactionEncodedAmount = approvalTransaction
			? decodeApproveData(approvalTransaction.data).encodedAmount
			: '0';
		const currentAmount = fromTokenMinimalUnitString(
			hexToBN(currentApprovalTransactionEncodedAmount).toString(10),
			sourceToken.decimals
		);

		setEditQuoteTransactionsMode(EDIT_MODE_APPROVE_AMOUNT);
		setEditQuoteTransactionsVisible(true);

		InteractionManager.runAfterInteractions(() => {
			const parameters = {
				token_from: sourceToken.symbol,
				token_from_amount: fromTokenMinimalUnitString(sourceAmount, sourceToken.decimals),
				token_to: destinationToken.symbol,
				token_to_amount: fromTokenMinimalUnitString(selectedQuote.destinationAmount, destinationToken.decimals),
				request_type: hasEnoughTokenBalance ? 'Order' : 'Quote',
				slippage,
				custom_slippage: slippage !== AppConstants.SWAPS.DEFAULT_SLIPPAGE,
				available_quotes: allQuotes.length,
				best_quote_source: selectedQuote.aggregator,
				other_quote_selected: allQuotes[selectedQuoteId] === selectedQuote,
				gas_fees: weiToFiat(toWei(selectedQuoteValue?.ethFee), conversionRate, currentCurrency),
				custom_spend_limit_set: originalAmount !== currentAmount,
				custom_spend_limit_amount: currentAmount,
				chain_id: chainId
			};
			Analytics.trackEventWithParameters(ANALYTICS_EVENT_OPTS.EDIT_SPEND_LIMIT_OPENED, {});
			Analytics.trackEventWithParameters(ANALYTICS_EVENT_OPTS.EDIT_SPEND_LIMIT_OPENED, parameters, true);
		});
	}, [
		chainId,
		allQuotes,
		approvalTransaction,
		conversionRate,
		currentCurrency,
		destinationToken,
		selectedQuoteValue,
		hasEnoughTokenBalance,
		originalApprovalTransaction,
		selectedQuote,
		selectedQuoteId,
		slippage,
		sourceAmount,
		sourceToken
	]);

	const onHandleGasFeeSelection = useCallback(
		(customGasLimit, customGasPrice, warningGasPriceHigh, details) => {
			const { SwapsController } = Engine.context;
			const newGasLimit = new BigNumber(customGasLimit);
			const newGasPrice = new BigNumber(customGasPrice);
			setWarningGasPriceHigh(warningGasPriceHigh);
			if (newGasPrice.toString(16) !== gasPrice) {
				setCustomGasPrice(newGasPrice);
				SwapsController.updateQuotesWithGasPrice(newGasPrice.toString(16));
			}
			if (newGasLimit.toString(16) !== gasLimit) {
				setCustomGasLimit(newGasLimit);
				SwapsController.updateSelectedQuoteWithGasLimit(newGasLimit.toString(16));
			}
			if (newGasLimit?.toString(16) !== gasLimit || newGasPrice?.toString(16) !== gasPrice) {
				InteractionManager.runAfterInteractions(() => {
					const parameters = {
						speed_set: details.mode === 'advanced' ? undefined : details.mode,
						gas_mode: details.mode === 'advanced' ? 'Advanced' : 'Basic',
						gas_fees: weiToFiat(
							toWei(swapsUtils.calcTokenAmount(newGasLimit.times(newGasPrice), 18)),
							conversionRate,
							currentCurrency
						),
						chain_id: chainId
					};
					Analytics.trackEventWithParameters(ANALYTICS_EVENT_OPTS.GAS_FEES_CHANGED, {});
					Analytics.trackEventWithParameters(ANALYTICS_EVENT_OPTS.GAS_FEES_CHANGED, parameters, true);
				});
			}
		},
		[chainId, conversionRate, currentCurrency, gasLimit, gasPrice]
	);

	const handleQuotesReceivedMetric = useCallback(() => {
		if (!selectedQuote || !selectedQuoteValue) return;
		InteractionManager.runAfterInteractions(() => {
			const parameters = {
				token_from: sourceToken.symbol,
				token_from_amount: fromTokenMinimalUnitString(sourceAmount, sourceToken.decimals),
				token_to: destinationToken.symbol,
				token_to_amount: fromTokenMinimalUnitString(selectedQuote.destinationAmount, destinationToken.decimals),
				request_type: hasEnoughTokenBalance ? 'Order' : 'Quote',
				slippage,
				custom_slippage: slippage !== AppConstants.SWAPS.DEFAULT_SLIPPAGE,
				response_time: allQuotesFetchTime,
				best_quote_source: selectedQuote.aggregator,
				network_fees_USD: weiToFiat(toWei(selectedQuoteValue.ethFee), conversionRate, 'usd'),
				network_fees_ETH: renderFromWei(toWei(selectedQuoteValue.ethFee)),
				available_quotes: allQuotes.length,
				chain_id: chainId
			};
			Analytics.trackEventWithParameters(ANALYTICS_EVENT_OPTS.QUOTES_RECEIVED, {});
			Analytics.trackEventWithParameters(ANALYTICS_EVENT_OPTS.QUOTES_RECEIVED, parameters, true);
		});
	}, [
		chainId,
		sourceToken,
		sourceAmount,
		destinationToken,
		selectedQuote,
		hasEnoughTokenBalance,
		slippage,
		allQuotesFetchTime,
		selectedQuoteValue,
		allQuotes,
		conversionRate
	]);

	const handleOpenQuotesModal = useCallback(() => {
		if (!selectedQuote || !selectedQuoteValue) return;
		toggleQuotesModal();
		InteractionManager.runAfterInteractions(() => {
			const parameters = {
				token_from: sourceToken.symbol,
				token_from_amount: fromTokenMinimalUnitString(sourceAmount, sourceToken.decimals),
				token_to: destinationToken.symbol,
				token_to_amount: fromTokenMinimalUnitString(selectedQuote.destinationAmount, destinationToken.decimals),
				request_type: hasEnoughTokenBalance ? 'Order' : 'Quote',
				slippage,
				custom_slippage: slippage !== AppConstants.SWAPS.DEFAULT_SLIPPAGE,
				response_time: allQuotesFetchTime,
				best_quote_source: selectedQuote.aggregator,
				network_fees_USD: weiToFiat(toWei(selectedQuoteValue.ethFee), conversionRate, 'usd'),
				network_fees_ETH: renderFromWei(toWei(selectedQuoteValue.ethFee)),
				available_quotes: allQuotes.length,
				chain_id: chainId
			};
			Analytics.trackEventWithParameters(ANALYTICS_EVENT_OPTS.ALL_AVAILABLE_QUOTES_OPENED, {});
			Analytics.trackEventWithParameters(ANALYTICS_EVENT_OPTS.ALL_AVAILABLE_QUOTES_OPENED, parameters, true);
		});
	}, [
		chainId,
		selectedQuote,
		selectedQuoteValue,
		toggleQuotesModal,
		sourceToken,
		sourceAmount,
		destinationToken,
		hasEnoughTokenBalance,
		slippage,
		allQuotesFetchTime,
		conversionRate,
		allQuotes.length
	]);

	const handleQuotesErrorMetric = useCallback(
		error => {
			const data = {
				token_from: sourceToken.symbol,
				token_from_amount: fromTokenMinimalUnitString(sourceAmount, sourceToken.decimals),
				token_to: destinationToken.symbol,
				request_type: hasEnoughTokenBalance ? 'Order' : 'Quote',
				slippage,
				custom_slippage: slippage !== AppConstants.SWAPS.DEFAULT_SLIPPAGE,
				chain_id: chainId
			};
			if (error?.key === swapsUtils.SwapsError.QUOTES_EXPIRED_ERROR) {
				InteractionManager.runAfterInteractions(() => {
					const parameters = {
						...data,
						gas_fees: ''
					};
					Analytics.trackEventWithParameters(ANALYTICS_EVENT_OPTS.QUOTES_TIMED_OUT, {});
					Analytics.trackEventWithParameters(ANALYTICS_EVENT_OPTS.QUOTES_TIMED_OUT, parameters, true);
				});
			} else if (error?.key === swapsUtils.SwapsError.QUOTES_NOT_AVAILABLE_ERROR) {
				InteractionManager.runAfterInteractions(() => {
					const parameters = { ...data };
					Analytics.trackEventWithParameters(ANALYTICS_EVENT_OPTS.NO_QUOTES_AVAILABLE, {});
					Analytics.trackEventWithParameters(ANALYTICS_EVENT_OPTS.NO_QUOTES_AVAILABLE, parameters, true);
				});
			} else {
				trackErrorAsAnalytics(`Swaps: ${error?.key}`, error?.description);
			}
		},
		[chainId, sourceToken, sourceAmount, destinationToken, hasEnoughTokenBalance, slippage]
	);

	const handleSlippageAlertPress = useCallback(() => {
		if (!selectedQuote) {
			return;
		}
		setHasDismissedSlippageAlert(selectedQuote.priceSlippage?.bucket ?? false);
	}, [selectedQuote]);

	const buyEth = useCallback(() => {
		navigation.navigate('FiatOnRamp');
		InteractionManager.runAfterInteractions(() => {
			Analytics.trackEvent(ANALYTICS_EVENT_OPTS.RECEIVE_OPTIONS_PAYMENT_REQUEST);
		});
	}, [navigation]);

	const handleTermsPress = useCallback(
		() =>
			navigation.navigate('Webview', {
				screen: 'SimpleWebview',
				params: {
					url: AppConstants.URLS.TERMS_AND_CONDITIONS
				}
			}),
		[navigation]
	);

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
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [destinationToken.address, selectedAddress, slippage, sourceAmount, sourceToken.address]);

	/** selectedQuote alert effect */
	useEffect(() => {
		if (!selectedQuote) {
			return setHasDismissedSlippageAlert(false);
		}
		if (Boolean(hasDismissedSlippageAlert) && selectedQuote?.priceSlippage?.bucket !== hasDismissedSlippageAlert) {
			return setHasDismissedSlippageAlert(false);
		}
	}, [hasDismissedSlippageAlert, selectedQuote]);

	/* First load effect: handle initial animation */
	useEffect(() => {
		if (isFirstLoad && !shouldFinishFirstLoad) {
			if (firstLoadTime < quotesLastFetched || error) {
				setShouldFinishFirstLoad(true);
				if (!error) {
					navigation.setParams({ leftAction: strings('swaps.edit') });
				}
			}
		}
	}, [error, firstLoadTime, isFirstLoad, navigation, quotesLastFetched, shouldFinishFirstLoad]);

	useEffect(() => {
		let maxFetchTime = 0;
		allQuotes.forEach(quote => {
			maxFetchTime = Math.max(maxFetchTime, quote?.fetchTime);
		});
		setAllQuotesFetchTime(maxFetchTime);
	}, [allQuotes]);

	/* selectedQuoteId effect: when topAggId changes make it selected by default */
	useEffect(() => setSelectedQuoteId(topAggId), [topAggId]);

	/* IsInFetch effect: hide every modal, handle countdown */
	useEffect(() => {
		const tick = setInterval(() => {
			const newRemainingTime = quotesLastFetched + quoteRefreshSeconds * 1000 - Date.now() + 1000;
			// If newRemainingTime > remainingTime means that a new set of quotes were fetched
			if (newRemainingTime > remainingTime) {
				hideFeeModal();
				hideQuotesModal();
				hidePriceDifferenceModal();
				hidePriceImpactModal();
				onCancelEditQuoteTransactions();
			}

			// If newRemainingTime < 0 means that quotes are still being fetched
			// then we show a loader
			if (!isInFetch && newRemainingTime < 0) {
				setIsInFetch(true);
			} else if (isInFetch && newRemainingTime > 0) {
				setIsInFetch(false);
			}

			setRemainingTime(newRemainingTime);
		}, 1000);
		return () => {
			clearInterval(tick);
		};
	}, [
		hideFeeModal,
		hideQuotesModal,
		onCancelEditQuoteTransactions,
		isInFetch,
		quotesLastFetched,
		quoteRefreshSeconds,
		remainingTime,
		hidePriceDifferenceModal,
		hidePriceImpactModal
	]);

	/* errorKey effect: hide every modal */
	useEffect(() => {
		if (error) {
			hideFeeModal();
			hideQuotesModal();
			hideUpdateModal();
			hidePriceDifferenceModal();
			onCancelEditQuoteTransactions();
		}
	}, [
		error,
		hideFeeModal,
		hideQuotesModal,
		handleQuotesErrorMetric,
		onCancelEditQuoteTransactions,
		hidePriceDifferenceModal,
		hideUpdateModal
	]);

	/** Metrics Effects */
	/* Metrics: Quotes requested */
	useEffect(() => {
		if (!isInFetch) return;
		if (trackedRequestedQuotes) return;
		setTrackedRequestedQuotes(true);
		const data = {
			token_from: sourceToken.symbol,
			token_from_amount: fromTokenMinimalUnitString(sourceAmount, sourceToken.decimals),
			token_to: destinationToken.symbol,
			request_type: hasEnoughTokenBalance ? 'Order' : 'Quote',
			custom_slippage: slippage !== AppConstants.SWAPS.DEFAULT_SLIPPAGE,
			chain_id: chainId
		};
		navigation.setParams({ requestedTrade: data });
		navigation.setParams({ selectedQuote: undefined });
		navigation.setParams({ quoteBegin: Date.now() });
		InteractionManager.runAfterInteractions(() => {
			Analytics.trackEventWithParameters(ANALYTICS_EVENT_OPTS.QUOTES_REQUESTED, {});
			Analytics.trackEventWithParameters(ANALYTICS_EVENT_OPTS.QUOTES_REQUESTED, data, true);
		});
	}, [
		chainId,
		destinationToken,
		hasEnoughTokenBalance,
		isInFetch,
		navigation,
		slippage,
		sourceAmount,
		sourceToken,
		trackedRequestedQuotes
	]);

	/* Metrics: Quotes received */
	useEffect(() => {
		if (isInFetch) return;
		if (!selectedQuote) return;
		if (trackedReceivedQuotes) return;
		setTrackedReceivedQuotes(true);
		navigation.setParams({ selectedQuote });
		handleQuotesReceivedMetric();
	}, [isInFetch, navigation, selectedQuote, quotesLastFetched, handleQuotesReceivedMetric, trackedReceivedQuotes]);

	/* Metrics: Quotes error */
	useEffect(() => {
		if (!error?.key || trackedError) return;
		setTrackedError(true);
		handleQuotesErrorMetric(error);
	}, [error, handleQuotesErrorMetric, trackedError]);

	const openLinkAboutGas = () =>
		Linking.openURL('https://community.metamask.io/t/what-is-gas-why-do-transactions-take-so-long/3172');

	const toggleGasTooltip = () => setShowGasTooltip(showGasTooltip => !showGasTooltip);

	const renderGasTooltip = () => {
		const isMainnet = isMainnetByChainId(chainId);
		return (
			<InfoModal
				isVisible={showGasTooltip}
				title={strings(`swaps.gas_education_title`)}
				toggleModal={toggleGasTooltip}
				body={
					<View>
						<Text grey infoModal>
							{strings('swaps.gas_education_1')}
							{strings(`swaps.gas_education_2${isMainnet ? '_ethereum' : ''}`)}{' '}
							<Text bold>{strings('swaps.gas_education_3')}</Text>
						</Text>
						<Text grey infoModal>
							{strings('swaps.gas_education_4')} <Text bold>{strings('swaps.gas_education_5')} </Text>
							{strings('swaps.gas_education_6')}
						</Text>
						<Text grey infoModal>
							<Text bold>{strings('swaps.gas_education_7')} </Text>
							{strings('swaps.gas_education_8')}
						</Text>
						<TouchableOpacity onPress={openLinkAboutGas}>
							<Text grey link infoModal>
								{strings('swaps.gas_education_learn_more')}
							</Text>
						</TouchableOpacity>
					</View>
				}
			/>
		);
	};

	/* Rendering */
	if (isFirstLoad || (!error?.key && !selectedQuote)) {
		return (
			<ScreenView contentContainerStyle={styles.screen} scrollEnabled={false}>
				<LoadingAnimation
					finish={shouldFinishFirstLoad}
					onAnimationEnd={handleAnimationEnd}
					aggregatorMetadata={aggregatorMetadata}
				/>
			</ScreenView>
		);
	}

	if (!isInPolling && error?.key) {
		const [errorTitle, errorMessage, errorAction] = getErrorMessage(error?.key);
		const errorIcon =
			error?.key === swapsUtils.SwapsError.QUOTES_EXPIRED_ERROR ? (
				<MaterialCommunityIcons name="clock-outline" style={[styles.errorIcon, styles.expiredIcon]} />
			) : (
				<MaterialCommunityIcons name="alert-outline" style={[styles.errorIcon]} />
			);

		return (
			<ScreenView contentContainerStyle={styles.screen}>
				<View style={[styles.content, styles.errorViewContent]}>
					{errorIcon}
					<Text primary centered style={styles.errorTitle}>
						{errorTitle}
					</Text>
					<Text centered style={styles.errorText}>
						{errorMessage}
					</Text>
				</View>
				<View style={styles.bottomSection}>
					<StyledButton type="blue" containerStyle={styles.ctaButton} onPress={handleRetryFetchQuotes}>
						{errorAction}
					</StyledButton>
				</View>
			</ScreenView>
		);
	}

	const disabledView =
		shouldDisplaySlippage && !hasDismissedSlippageAlert && hasEnoughTokenBalance && hasEnoughEthBalance;

	return (
		<ScreenView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
			<View style={styles.topBar}>
				{(!hasEnoughTokenBalance || !hasEnoughEthBalance) && (
					<View style={styles.alertBar}>
						<Alert small type="info">
							{`${strings('swaps.you_need')} `}
							<Text reset bold>
								{!hasEnoughTokenBalance && !isSwapsNativeAsset(sourceToken)
									? `${renderFromTokenMinimalUnit(missingTokenBalance, sourceToken.decimals)} ${
											sourceToken.symbol
											// eslint-disable-next-line no-mixed-spaces-and-tabs
									  } `
									: `${renderFromWei(missingEthBalance)} ${getTicker(ticker)} `}
							</Text>
							{!hasEnoughTokenBalance
								? `${strings('swaps.more_to_complete')} `
								: `${strings('swaps.more_gas_to_complete')} `}
							{isMainNet(chainId) &&
								(isSwapsNativeAsset(sourceToken) ||
									(hasEnoughTokenBalance && !hasEnoughEthBalance)) && (
									<Text link underline small onPress={buyEth}>
										{strings('swaps.buy_more_eth')}
									</Text>
								)}
						</Alert>
					</View>
				)}
				{!!warningGasPriceHigh && !(!hasEnoughTokenBalance || !hasEnoughEthBalance) && (
					<View style={styles.alertBar}>
						<Alert small type="error">
							<Text reset>{warningGasPriceHigh}</Text>
						</Alert>
					</View>
				)}
				{!!selectedQuote && hasEnoughTokenBalance && hasEnoughEthBalance && shouldDisplaySlippage && (
					<View style={styles.alertBar}>
						<ActionAlert
							type={selectedQuote.priceSlippage?.bucket === SLIPPAGE_BUCKETS.HIGH ? 'error' : 'warning'}
							action={hasDismissedSlippageAlert ? undefined : strings('swaps.i_understand')}
							onPress={handleSlippageAlertPress}
							onInfoPress={
								selectedQuote.priceSlippage?.calculationError?.length > 0
									? togglePriceImpactModal
									: togglePriceDifferenceModal
							}
						>
							{textStyle =>
								selectedQuote.priceSlippage?.calculationError?.length > 0 ? (
									<>
										<Text style={textStyle} bold centered>
											{strings('swaps.market_price_unavailable_title')}
										</Text>
										<Text style={textStyle} small centered>
											{strings('swaps.market_price_unavailable')}
										</Text>
									</>
								) : (
									<>
										<Text style={textStyle} bold centered>
											{strings('swaps.price_difference', { amount: `~${slippageRatio}%` })}
										</Text>
										<Text style={textStyle} centered>
											{strings('swaps.about_to_swap')}{' '}
											{renderFromTokenMinimalUnit(
												selectedQuote.sourceAmount,
												sourceToken.decimals
											)}{' '}
											{sourceToken.symbol} (~
											<Text reset upper>
												{weiToFiat(
													toWei(selectedQuote.priceSlippage?.sourceAmountInETH || 0),
													conversionRate,
													currentCurrency
												)}
											</Text>
											) {strings('swaps.for')}{' '}
											{renderFromTokenMinimalUnit(
												selectedQuote.destinationAmount,
												destinationToken.decimals
											)}{' '}
											{destinationToken.symbol} (~
											<Text reset upper>
												{weiToFiat(
													toWei(selectedQuote.priceSlippage?.destinationAmountInETH || 0),
													conversionRate,
													currentCurrency
												)}
											</Text>
											).
										</Text>
									</>
								)
							}
						</ActionAlert>
					</View>
				)}
				{isInPolling && (
					<TouchableOpacity
						onPress={toggleUpdateModal}
						disabled={disabledView}
						style={[styles.timerWrapper, disabledView && styles.disabled]}
					>
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
					</TouchableOpacity>
				)}
				{!isInPolling && (
					<View style={[styles.timerWrapper, disabledView && styles.disabled]}>
						<Text>...</Text>
					</View>
				)}
			</View>

			<View
				style={[styles.content, disabledView && styles.disabled]}
				pointerEvents={disabledView ? 'none' : 'auto'}
			>
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
							<Ratio
								sourceAmount={selectedQuote.sourceAmount}
								sourceToken={sourceToken}
								destinationAmount={selectedQuote.destinationAmount}
								destinationToken={destinationToken}
							/>
						</View>
					</>
				)}
			</View>

			<View
				style={[styles.bottomSection, disabledView && styles.disabled]}
				pointerEvents={disabledView ? 'none' : 'auto'}
			>
				{selectedQuote && (
					<QuotesSummary style={styles.quotesSummary}>
						<QuotesSummary.Header style={styles.quotesSummaryHeader} savings={isSaving}>
							<QuotesSummary.HeaderText bold>
								{isSaving ? strings('swaps.savings') : strings('swaps.using_best_quote')}
							</QuotesSummary.HeaderText>
							<TouchableOpacity onPress={handleOpenQuotesModal} disabled={isInFetch}>
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
										<TouchableOpacity
											style={styles.gasInfoContainer}
											onPress={toggleGasTooltip}
											hitSlop={styles.hitSlop}
										>
											<MaterialCommunityIcons
												name="information"
												size={13}
												style={styles.gasInfoIcon}
											/>
										</TouchableOpacity>
									</View>
								</View>
								<View style={styles.quotesFiatColumn}>
									<Text primary bold>
										{renderFromWei(toWei(selectedQuoteValue?.ethFee))} {getTicker(ticker)}
									</Text>
									<Text primary bold upper>
										{`  ${weiToFiat(
											toWei(selectedQuoteValue?.ethFee),
											conversionRate,
											currentCurrency
										) || ''}`}
									</Text>
								</View>
							</View>

							<View style={styles.quotesRow}>
								<View style={styles.quotesDescription}>
									<View style={styles.quotesLegend}>
										<Text>{strings('swaps.max_gas_fee')} </Text>
									</View>
								</View>
								<View style={styles.quotesFiatColumn}>
									<TouchableOpacity
										disabled={unableToSwap}
										onPress={unableToSwap ? undefined : onEditQuoteTransactionsGas}
									>
										<Text link={!unableToSwap} underline={!unableToSwap}>
											{renderFromWei(toWei(selectedQuoteValue?.maxEthFee || '0x0'))}{' '}
											{getTicker(ticker)}
										</Text>
									</TouchableOpacity>
									<Text upper>
										{`  ${weiToFiat(
											toWei(selectedQuoteValue?.maxEthFee),
											conversionRate,
											currentCurrency
										) || ''}`}
									</Text>
								</View>
							</View>

							{!!approvalTransaction && !unableToSwap && (
								<View style={styles.quotesRow}>
									<Text>
										<Text>{`${strings('swaps.enable.this_will')} `}</Text>
										<Text bold>
											{`${strings('swaps.enable.enable_asset', {
												asset: sourceToken.symbol
											})} `}
										</Text>
										<Text>{`${strings('swaps.enable.for_swapping')} `}</Text>
									</Text>
									<TouchableOpacity onPress={onEditQuoteTransactionsApproveAmount}>
										<Text link>{`${strings('swaps.enable.edit_limit')}`}</Text>
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
							{`${strings('swaps.swipe_to')} `}
							<Text reset bold>
								{strings('swaps.swap')}
							</Text>
						</Text>
					}
					completeText={<Text style={styles.sliderButtonText}>{strings('swaps.completed_swap')}</Text>}
					disabled={unableToSwap}
					onComplete={handleCompleteSwap}
				/>
				<TouchableOpacity onPress={handleTermsPress} style={styles.termsButton}>
					<Text link centered>
						{strings('swaps.terms_of_service')}
					</Text>
				</TouchableOpacity>
			</View>

			<InfoModal
				isVisible={isUpdateModalVisible}
				toggleModal={toggleUpdateModal}
				title={strings('swaps.quotes_update_often')}
				body={<Text style={styles.text}>{strings('swaps.quotes_update_often_text')}</Text>}
			/>
			<InfoModal
				isVisible={isPriceDifferenceModalVisible}
				toggleModal={togglePriceDifferenceModal}
				title={strings('swaps.price_difference_title')}
				body={<Text style={styles.text}>{strings('swaps.price_difference_body')}</Text>}
			/>
			<InfoModal
				isVisible={isPriceImpactModalVisible}
				toggleModal={togglePriceImpactModal}
				title={strings('swaps.price_impact_title')}
				body={<Text style={styles.text}>{strings('swaps.price_impact_body')}</Text>}
			/>
			<InfoModal
				isVisible={isFeeModalVisible}
				toggleModal={toggleFeeModal}
				title={strings('swaps.metamask_swap_fee')}
				body={
					<Text style={styles.text}>
						{strings('swaps.fee_text.get_the')} <Text bold>{strings('swaps.fee_text.best_price')}</Text>{' '}
						{strings('swaps.fee_text.from_the')} <Text bold>{strings('swaps.fee_text.top_liquidity')}</Text>{' '}
						{strings('swaps.fee_text.fee_is_applied', {
							fee: selectedQuote && selectedQuote?.fee ? `${selectedQuote.fee}%` : '0.875%'
						})}
					</Text>
				}
			/>
			<QuotesModal
				isVisible={isQuotesModalVisible}
				toggleModal={toggleQuotesModal}
				quotes={allQuotes}
				sourceToken={sourceToken}
				destinationToken={destinationToken}
				selectedQuote={selectedQuoteId}
				showOverallValue={hasConversionRate}
				ticker={getTicker(ticker)}
			/>

			<TransactionsEditionModal
				apiGasPrice={apiGasPrice}
				approvalTransaction={approvalTransaction}
				editQuoteTransactionsMode={editQuoteTransactionsMode}
				editQuoteTransactionsVisible={editQuoteTransactionsVisible}
				gasLimit={gasLimit}
				gasPrice={gasPrice}
				onCancelEditQuoteTransactions={onCancelEditQuoteTransactions}
				onHandleGasFeeSelection={onHandleGasFeeSelection}
				setApprovalTransaction={setApprovalTransaction}
				minimumSpendLimit={approvalMinimumSpendLimit}
				minimumGasLimit={gasLimitWithMultiplier(
					selectedQuote?.gasEstimate,
					selectedQuote?.gasMultiplier
				)?.toString(10)}
				selectedQuote={selectedQuote}
				sourceToken={sourceToken}
				chainId={chainId}
			/>
			{renderGasTooltip()}
		</ScreenView>
	);
}

SwapsQuotesView.navigationOptions = ({ navigation, route }) => getSwapsQuotesNavbar(navigation, route);

SwapsQuotesView.propTypes = {
	swapsTokens: PropTypes.arrayOf(PropTypes.object),
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
	/**
	 * Chain Id
	 */
	chainId: PropTypes.string,
	/**
	 * Native asset ticker
	 */
	ticker: PropTypes.string,
	isInPolling: PropTypes.bool,
	quotesLastFetched: PropTypes.number,
	topAggId: PropTypes.string,
	/**
	 * Aggregator metada from Swaps controller API
	 */
	aggregatorMetadata: PropTypes.object,
	pollingCyclesLeft: PropTypes.number,
	quotes: PropTypes.object,
	quoteValues: PropTypes.object,
	approvalTransaction: PropTypes.object,
	error: PropTypes.object,
	quoteRefreshSeconds: PropTypes.number,
	usedGasPrice: PropTypes.string
};

const mapStateToProps = state => ({
	accounts: state.engine.backgroundState.AccountTrackerController.accounts,
	chainId: state.engine.backgroundState.NetworkController.provider.chainId,
	ticker: state.engine.backgroundState.NetworkController.provider.ticker,
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	balances: state.engine.backgroundState.TokenBalancesController.contractBalances,
	conversionRate: state.engine.backgroundState.CurrencyRateController.conversionRate,
	currentCurrency: state.engine.backgroundState.CurrencyRateController.currentCurrency,
	isInPolling: state.engine.backgroundState.SwapsController.isInPolling,
	quotesLastFetched: state.engine.backgroundState.SwapsController.quotesLastFetched,
	pollingCyclesLeft: state.engine.backgroundState.SwapsController.pollingCyclesLeft,
	topAggId: state.engine.backgroundState.SwapsController.topAggId,
	aggregatorMetadata: state.engine.backgroundState.SwapsController.aggregatorMetadata,
	quotes: state.engine.backgroundState.SwapsController.quotes,
	quoteValues: state.engine.backgroundState.SwapsController.quoteValues,
	approvalTransaction: state.engine.backgroundState.SwapsController.approvalTransaction,
	error: state.engine.backgroundState.SwapsController.error,
	quoteRefreshSeconds: state.engine.backgroundState.SwapsController.quoteRefreshSeconds,
	usedGasPrice: state.engine.backgroundState.SwapsController.usedGasPrice,
	swapsTokens: swapsTokensSelector(state)
});

export default connect(mapStateToProps)(SwapsQuotesView);
