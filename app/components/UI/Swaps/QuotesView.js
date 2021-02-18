import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { View, StyleSheet, ActivityIndicator, TouchableOpacity, InteractionManager } from 'react-native';
import { connect } from 'react-redux';
import IonicIcon from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import FAIcon from 'react-native-vector-icons/FontAwesome';
import BigNumber from 'bignumber.js';
import { toChecksumAddress } from 'ethereumjs-util';
import { NavigationContext } from 'react-navigation';
import { swapsUtils } from '@estebanmino/controllers';
import { calcTokenAmount } from '@estebanmino/controllers/dist/util';

import {
	BNToHex,
	fromTokenMinimalUnit,
	renderFromTokenMinimalUnit,
	renderFromWei,
	toWei,
	weiToFiat
} from '../../../util/number';
import { apiEstimateModifiedToWEI } from '../../../util/custom-gas';
import { getErrorMessage, getFetchParams, getQuotesNavigationsParams } from './utils';
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
import { decodeApproveData } from '../../../util/transactions';

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
		marginHorizontal: 55,
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
	}
});

async function resetAndStartPolling({ slippage, sourceToken, destinationToken, sourceAmount, walletAddress }) {
	if (!sourceToken || !destinationToken) {
		return;
	}
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

/**
 * Multiplies gasLimit by multiplier if both defined
 * @param {string} gasLimit
 * @param {number} multiplier
 */
const gasLimitWithMultiplier = (gasLimit, multiplier) => {
	if (!gasLimit || !multiplier) return;
	return new BigNumber(gasLimit).times(multiplier).toString(16);
};

function SwapsQuotesView({
	swapsTokens,
	accounts,
	balances,
	selectedAddress,
	currentCurrency,
	conversionRate,
	isInPolling,
	quotesLastFetched,
	pollingCyclesLeft,
	approvalTransaction: originalApprovalTransaction,
	topAggId,
	aggregatorMetadata,
	quotes,
	quoteValues,
	errorKey,
	quoteRefreshSeconds
}) {
	const navigation = useContext(NavigationContext);
	/* Get params from navigation */
	const { sourceTokenAddress, destinationTokenAddress, sourceAmount, slippage } = useMemo(
		() => getQuotesNavigationsParams(navigation),
		[navigation]
	);

	/* Get tokens from the tokens list */
	const sourceToken = swapsTokens?.find(token => token.address?.toLowerCase() === sourceTokenAddress.toLowerCase());
	const destinationToken = swapsTokens?.find(
		token => token.address?.toLowerCase() === destinationTokenAddress.toLowerCase()
	);

	/* State */
	const [firstLoadTime, setFirstLoadTime] = useState(Date.now());
	const [isFirstLoad, setIsFirstLoad] = useState(true);
	const [shouldFinishFirstLoad, setShouldFinishFirstLoad] = useState(false);
	const [remainingTime, setRemainingTime] = useState(POLLING_INTERVAL);

	const [allQuotesFetchTime, setAllQuotesFetchTime] = useState(null);
	const [trackedRequestedQuotes, setTrackedRequestedQuotes] = useState(false);
	const [trackedReceivedQuotes, setTrackedReceivedQuotes] = useState(false);
	const [trackedError, setTrackedError] = useState(false);

	/* Selected quote, initially topAggId (see effects) */
	const [selectedQuoteId, setSelectedQuoteId] = useState(null);

	/* Slippage alert dismissed, values: false, 'high', medium, 'low' */
	const [hasDismissedSlippageAlert, setHasDismissedSlippageAlert] = useState(false);

	const [editQuoteTransactionsVisible, setEditQuoteTransactionsVisible] = useState(false);

	const [apiGasPrice] = useGasPrice();
	const [customGasPrice, setCustomGasPrice] = useState(null);
	const [customGasLimit, setCustomGasLimit] = useState(null);
	// TODO: use this variable in the future when calculating savings
	const [isSaving] = useState(false);
	const [isInFetch, setIsInFetch] = useState(false);

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

	/* gas estimations */
	const gasPrice = useMemo(
		() =>
			customGasPrice
				? customGasPrice.toString(16)
				: !!apiGasPrice && apiEstimateModifiedToWEI(apiGasPrice?.averageGwei).toString(16),
		[customGasPrice, apiGasPrice]
	);

	const gasLimit = useMemo(
		() =>
			(Boolean(customGasLimit) && BNToHex(customGasLimit)) ||
			gasLimitWithMultiplier(selectedQuote?.trade?.gasEstimate, selectedQuote?.gasMultiplier) ||
			selectedQuote?.maxGas?.toString(16),
		[customGasLimit, selectedQuote]
	);

	/* Total gas fee in decimal */
	const gasFee = useMemo(() => {
		if (customGasPrice) {
			return calcTokenAmount(customGasPrice * gasLimit, 18);
		}
		return selectedQuoteValue?.ethFee;
	}, [selectedQuoteValue, customGasPrice, gasLimit]);

	/* Maximum gas fee in decimal */
	const maxGasFee = useMemo(() => {
		if (customGasPrice && selectedQuote?.maxGas) {
			return calcTokenAmount(customGasPrice * selectedQuote?.maxGas, 18);
		}
		return selectedQuoteValue?.maxEthFee;
	}, [selectedQuote, selectedQuoteValue, customGasPrice]);

	/* Balance */
	const balance = useBalance(accounts, balances, selectedAddress, sourceToken, { asUnits: true });
	const [hasEnoughTokenBalance, missingTokenBalance, hasEnoughEthBalance, missingEthBalance] = useMemo(() => {
		// Token
		const sourceBN = new BigNumber(sourceAmount);
		const tokenBalanceBN = new BigNumber(balance.toString());
		const hasEnoughTokenBalance = tokenBalanceBN.gte(sourceBN);
		const missingTokenBalance = hasEnoughTokenBalance ? null : sourceBN.minus(tokenBalanceBN);

		const ethAmountBN = sourceToken.address === swapsUtils.ETH_SWAPS_TOKEN_ADDRESS ? sourceBN : new BigNumber(0);
		const ethBalanceBN = new BigNumber(accounts[selectedAddress].balance);
		const gasBN = new BigNumber((maxGasFee && toWei(maxGasFee)) || 0);
		const hasEnoughEthBalance = ethBalanceBN.gte(gasBN.plus(ethAmountBN));
		const missingEthBalance = hasEnoughEthBalance ? null : gasBN.plus(ethAmountBN).minus(ethBalanceBN);

		return [hasEnoughTokenBalance, missingTokenBalance, hasEnoughEthBalance, missingEthBalance];
	}, [accounts, balance, maxGasFee, selectedAddress, sourceAmount, sourceToken.address]);

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
		if (!approvalTransaction) return 0;
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

	/* Handlers */
	const handleAnimationEnd = useCallback(() => {
		setIsFirstLoad(false);
		if (!errorKey) {
			navigation.setParams({ leftAction: strings('swaps.edit') });
		}
	}, [errorKey, navigation]);

	const handleRetryFetchQuotes = useCallback(() => {
		if (errorKey === swapsUtils.SwapsError.QUOTES_EXPIRED_ERROR) {
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

		InteractionManager.runAfterInteractions(() => {
			Analytics.trackEventWithParameters(ANALYTICS_EVENT_OPTS.SWAP_STARTED, {
				token_from: sourceToken.address,
				token_from_amount: sourceAmount,
				token_to: destinationToken.address,
				token_to_amount: selectedQuote.destinationAmount,
				request_type: hasEnoughTokenBalance ? 'Order' : 'Quote',
				slippage,
				custom_slippage: slippage !== AppConstants.SWAPS.DEFAULT_SLIPPAGE,
				best_quote_source: selectedQuote.aggregator,
				available_quotes: allQuotes,
				other_quote_selected: allQuotes[selectedQuoteId] === selectedQuote,
				network_fees_USD: weiToFiat(toWei(selectedQuoteValue.ethFee), conversionRate, 'usd'),
				network_fees_ETH: renderFromWei(toWei(selectedQuoteValue.ethFee))
			});
		});

		const { TransactionController } = Engine.context;

		const newSwapsTransactions = TransactionController.state.swapsTransactions || {};

		if (approvalTransaction) {
			approvalTransaction.gasPrice = gasPrice;
			try {
				const { transactionMeta } = await TransactionController.addTransaction(
					approvalTransaction,
					process.env.MM_FOX_CODE
				);
				newSwapsTransactions[transactionMeta.id] = {
					action: 'approval',
					sourceToken: sourceToken.address,
					destinationToken: { swaps: 'swaps' },
					upTo: decodeApproveData(approvalTransaction.data).encodedAmount
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
				process.env.MM_FOX_CODE
			);
			newSwapsTransactions[transactionMeta.id] = {
				action: 'swap',
				sourceToken: sourceToken.address,
				sourceAmount: renderFromTokenMinimalUnit(sourceAmount, sourceToken.decimals),
				destinationToken: destinationToken.address,
				destinationAmount: renderFromTokenMinimalUnit(
					selectedQuote.destinationAmount,
					destinationToken.decimals
				),
				sourceAmountInFiat: weiToFiat(
					toWei(selectedQuote.priceSlippage?.sourceAmountInETH),
					conversionRate,
					currentCurrency
				)
			};
		} catch (e) {
			// send analytics
		}

		TransactionController.update({ swapsTransactions: newSwapsTransactions });
		navigation.dismiss();
	}, [
		currentCurrency,
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
		gasLimit
	]);

	const onEditQuoteTransactionsGas = useCallback(() => {
		setEditQuoteTransactionsMode(EDIT_MODE_GAS);
		setEditQuoteTransactionsVisible(true);
	}, []);
	const onEditQuoteTransactionsApproveAmount = useCallback(() => {
		setEditQuoteTransactionsMode(EDIT_MODE_APPROVE_AMOUNT);
		setEditQuoteTransactionsVisible(true);
	}, []);

	const onHandleGasFeeSelection = useCallback(
		(gas, gasPrice, details) => {
			setCustomGasPrice(gasPrice);
			setCustomGasLimit(gas);
			InteractionManager.runAfterInteractions(() => {
				Analytics.trackEventWithParameters(ANALYTICS_EVENT_OPTS.GAS_FEES_CHANGED, {
					speed_set: details.mode === 'advanced' ? undefined : details.mode,
					gas_mode: details.mode === 'advanced' ? 'Advanced' : 'Basic',
					gas_fees: weiToFiat(toWei(calcTokenAmount(gasPrice * gas, 18)), conversionRate, currentCurrency)
				});
			});
		},
		[conversionRate, currentCurrency]
	);

	const handleQuotesReceivedMetric = useCallback(() => {
		if (!selectedQuote || !selectedQuoteValue) return;
		InteractionManager.runAfterInteractions(() => {
			Analytics.trackEventWithParameters(ANALYTICS_EVENT_OPTS.QUOTES_RECEIVED, {
				token_from: sourceToken.address,
				token_from_amount: sourceAmount,
				token_to: destinationToken.address,
				token_to_amount: selectedQuote.destinationAmount,
				request_type: hasEnoughTokenBalance ? 'Order' : 'Quote',
				slippage,
				custom_slippage: slippage !== AppConstants.SWAPS.DEFAULT_SLIPPAGE,
				response_time: allQuotesFetchTime,
				best_quote_source: selectedQuote.aggregator,
				network_fees_USD: weiToFiat(toWei(selectedQuoteValue.ethFee), conversionRate, 'usd'),
				network_fees_ETH: renderFromWei(toWei(selectedQuoteValue.ethFee)),
				available_quotes: allQuotes.length
			});
		});
	}, [
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
			Analytics.trackEventWithParameters(ANALYTICS_EVENT_OPTS.ALL_AVAILABLE_QUOTES_OPENED, {
				token_from: sourceToken.address,
				token_from_amount: sourceAmount,
				token_to: destinationToken.address,
				token_to_amount: selectedQuote.destinationAmount,
				request_type: hasEnoughTokenBalance ? 'Order' : 'Quote',
				slippage,
				custom_slippage: slippage !== AppConstants.SWAPS.DEFAULT_SLIPPAGE,
				response_time: allQuotesFetchTime,
				best_quote_source: selectedQuote.aggregator,
				network_fees_USD: weiToFiat(toWei(selectedQuoteValue.ethFee), conversionRate, 'usd'),
				network_fees_ETH: renderFromWei(toWei(selectedQuoteValue.ethFee)),
				available_quotes: allQuotes.length
			});
		});
	}, [
		selectedQuote,
		selectedQuoteValue,
		toggleQuotesModal,
		sourceToken.address,
		sourceAmount,
		destinationToken.address,
		hasEnoughTokenBalance,
		slippage,
		allQuotesFetchTime,
		conversionRate,
		allQuotes.length
	]);

	const handleQuotesErrorMetric = useCallback(
		errorKey => {
			const data = {
				token_from: sourceToken.address,
				token_from_amount: sourceAmount,
				token_to: destinationToken.address,
				request_type: hasEnoughTokenBalance ? 'Order' : 'Quote',
				slippage,
				custom_slippage: slippage !== AppConstants.SWAPS.DEFAULT_SLIPPAGE
			};
			if (errorKey === swapsUtils.SwapsError.QUOTES_EXPIRED_ERROR) {
				InteractionManager.runAfterInteractions(() => {
					Analytics.trackEventWithParameters(ANALYTICS_EVENT_OPTS.QUOTES_TIMED_OUT, {
						...data,
						gas_fees: ''
					});
				});
			} else if (errorKey === swapsUtils.SwapsError.QUOTES_NOT_AVAILABLE_ERROR) {
				InteractionManager.runAfterInteractions(() => {
					Analytics.trackEventWithParameters(ANALYTICS_EVENT_OPTS.NO_QUOTES_AVAILABLE, { data });
				});
			}
		},
		[sourceToken, sourceAmount, destinationToken, hasEnoughTokenBalance, slippage]
	);

	const handleSlippageAlertPress = useCallback(() => {
		if (!selectedQuote) {
			return;
		}
		setHasDismissedSlippageAlert(selectedQuote.priceSlippage?.bucket ?? false);
	}, [selectedQuote]);

	const buyEth = useCallback(() => {
		navigation.navigate('PaymentMethodSelector');
		InteractionManager.runAfterInteractions(() => {
			Analytics.trackEvent(ANALYTICS_EVENT_OPTS.RECEIVE_OPTIONS_PAYMENT_REQUEST);
		});
	}, [navigation]);

	const handleTermsPress = useCallback(
		() =>
			navigation.navigate('Webview', {
				url: 'https://metamask.io/terms.html'
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
	}, [destinationToken, selectedAddress, slippage, sourceAmount, sourceToken]);

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
			if (firstLoadTime < quotesLastFetched || errorKey) {
				setShouldFinishFirstLoad(true);
				if (!errorKey) {
					navigation.setParams({ leftAction: strings('swaps.edit') });
				}
			}
		}
	}, [errorKey, firstLoadTime, isFirstLoad, navigation, quotesLastFetched, shouldFinishFirstLoad]);

	useEffect(() => {
		let maxFetchTime = 0;
		allQuotes.forEach(quote => {
			maxFetchTime = Math.max(maxFetchTime, quote.fetchTime);
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
		hidePriceDifferenceModal
	]);

	/* errorKey effect: hide every modal */
	useEffect(() => {
		if (errorKey) {
			hideFeeModal();
			hideQuotesModal();
			hideUpdateModal();
			hidePriceDifferenceModal();
			onCancelEditQuoteTransactions();
		}
	}, [
		errorKey,
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
			token_from: sourceToken.address,
			token_from_amount: sourceAmount,
			token_to: destinationToken.address,
			request_type: hasEnoughTokenBalance ? 'Order' : 'Quote',
			custom_slippage: slippage !== AppConstants.SWAPS.DEFAULT_SLIPPAGE
		};
		navigation.setParams({ requestedTrade: data });
		navigation.setParams({ selectedQuote: undefined });
		navigation.setParams({ quoteBegin: Date.now() });
		InteractionManager.runAfterInteractions(() => {
			Analytics.trackEventWithParameters(ANALYTICS_EVENT_OPTS.QUOTES_REQUESTED, data);
		});
	}, [
		destinationToken.address,
		hasEnoughTokenBalance,
		isInFetch,
		navigation,
		slippage,
		sourceAmount,
		sourceToken.address,
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
		if (!errorKey || trackedError) return;
		setTrackedError(true);
		handleQuotesErrorMetric(errorKey);
	}, [errorKey, handleQuotesErrorMetric, trackedError]);

	/* Rendering */
	if (isFirstLoad || (!errorKey && !selectedQuote)) {
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

	if (!isInPolling && errorKey) {
		const [errorTitle, errorMessage, errorAction] = getErrorMessage(errorKey);
		const errorIcon =
			errorKey === swapsUtils.SwapsError.QUOTES_EXPIRED_ERROR ? (
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

	const disabledView = shouldDisplaySlippage && !hasDismissedSlippageAlert;

	return (
		<ScreenView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
			<View style={styles.topBar}>
				{(!hasEnoughTokenBalance || !hasEnoughEthBalance) && (
					<View style={styles.alertBar}>
						<Alert small type="info">
							{`${strings('swaps.you_need')} `}
							<Text reset bold>
								{!hasEnoughTokenBalance && sourceToken.address !== swapsUtils.ETH_SWAPS_TOKEN_ADDRESS
									? `${renderFromTokenMinimalUnit(missingTokenBalance, sourceToken.decimals)} ${
											sourceToken.symbol
											// eslint-disable-next-line no-mixed-spaces-and-tabs
									  } `
									: `${renderFromWei(missingEthBalance)} ETH `}
							</Text>
							{!hasEnoughTokenBalance
								? `${strings('swaps.more_to_complete')} `
								: `${strings('swaps.more_gas_to_complete')} `}
							{(sourceToken.address === swapsUtils.ETH_SWAPS_TOKEN_ADDRESS ||
								(hasEnoughTokenBalance && !hasEnoughEthBalance)) && (
								<TouchableOpacity onPress={buyEth}>
									<Text reset link underline small>
										{strings('swaps.buy_more_eth')}
									</Text>
								</TouchableOpacity>
							)}
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
									? undefined
									: togglePriceDifferenceModal
							}
						>
							{textStyle =>
								selectedQuote.priceSlippage?.calculationError?.length > 0 ? (
									<Text style={textStyle} small centered>
										{strings('swaps.market_price_unavailable')}
									</Text>
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
									</View>
									<Text primary bold>
										{renderFromWei(toWei(gasFee))} ETH
									</Text>
								</View>
								<View style={styles.quotesFiatColumn}>
									<Text primary bold upper>
										{weiToFiat(toWei(gasFee), conversionRate, currentCurrency)}
									</Text>
								</View>
							</View>

							<View style={styles.quotesRow}>
								<View style={styles.quotesDescription}>
									<View style={styles.quotesLegend}>
										<Text>{strings('swaps.max_gas_fee')} </Text>
										{!unableToSwap && (
											<TouchableOpacity onPress={onEditQuoteTransactionsGas}>
												<Text link>{strings('swaps.edit')}</Text>
											</TouchableOpacity>
										)}
									</View>
									<Text>{renderFromWei(toWei(maxGasFee))} ETH</Text>
								</View>
								<View style={styles.quotesFiatColumn}>
									<Text upper>{weiToFiat(toWei(maxGasFee), conversionRate, currentCurrency)}</Text>
								</View>
							</View>

							{!!approvalTransaction && !unableToSwap && (
								<View style={styles.quotesRow}>
									<View style={styles.quotesRow}>
										<Text>{`${strings('swaps.enable.this_will')} `}</Text>
										<Text bold>
											{`${strings('swaps.enable.enable_asset', {
												asset: sourceToken.symbol
											})} `}
										</Text>
										<Text>{`${strings('swaps.enable.for_swapping')}`}</Text>
										<TouchableOpacity onPress={onEditQuoteTransactionsApproveAmount}>
											<Text link>{` ${strings('swaps.enable.edit_limit')}`}</Text>
										</TouchableOpacity>
									</View>
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
				body={<Text>{strings('swaps.quotes_update_often_text')}</Text>}
			/>
			<InfoModal
				isVisible={isPriceDifferenceModalVisible}
				toggleModal={togglePriceDifferenceModal}
				title={strings('swaps.price_difference_title')}
				body={<Text>{strings('swaps.price_difference_body')}</Text>}
			/>
			<InfoModal
				isVisible={isFeeModalVisible}
				toggleModal={toggleFeeModal}
				title={strings('swaps.metamask_swap_fee')}
				body={
					<Text>
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
				selectedQuote={selectedQuote}
				sourceToken={sourceToken}
			/>
		</ScreenView>
	);
}

SwapsQuotesView.navigationOptions = ({ navigation }) => getSwapsQuotesNavbar(navigation);

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
	errorKey: PropTypes.string,
	quoteRefreshSeconds: PropTypes.number
};

const mapStateToProps = state => ({
	accounts: state.engine.backgroundState.AccountTrackerController.accounts,
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	balances: state.engine.backgroundState.TokenBalancesController.contractBalances,
	conversionRate: state.engine.backgroundState.CurrencyRateController.conversionRate,
	currentCurrency: state.engine.backgroundState.CurrencyRateController.currentCurrency,
	swapsTokens: state.engine.backgroundState.SwapsController.tokens,
	isInPolling: state.engine.backgroundState.SwapsController.isInPolling,
	quotesLastFetched: state.engine.backgroundState.SwapsController.quotesLastFetched,
	pollingCyclesLeft: state.engine.backgroundState.SwapsController.pollingCyclesLeft,
	topAggId: state.engine.backgroundState.SwapsController.topAggId,
	aggregatorMetadata: state.engine.backgroundState.SwapsController.aggregatorMetadata,
	quotes: state.engine.backgroundState.SwapsController.quotes,
	quoteValues: state.engine.backgroundState.SwapsController.quoteValues,
	approvalTransaction: state.engine.backgroundState.SwapsController.approvalTransaction,
	errorKey: state.engine.backgroundState.SwapsController.errorKey,
	quoteRefreshSeconds: state.engine.backgroundState.SwapsController.quoteRefreshSeconds
});

export default connect(mapStateToProps)(SwapsQuotesView);
