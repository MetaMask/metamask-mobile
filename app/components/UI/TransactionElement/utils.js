import {
	hexToBN,
	weiToFiat,
	renderFromWei,
	balanceToFiat,
	renderToGwei,
	isBN,
	renderFromTokenMinimalUnit,
	fromTokenMinimalUnit,
	balanceToFiatNumber,
	weiToFiatNumber,
	addCurrencySymbol,
	toBN
} from '../../../util/number';
import { strings } from '../../../../locales/i18n';
import { renderFullAddress, safeToChecksumAddress } from '../../../util/address';
import {
	decodeTransferData,
	isCollectibleAddress,
	getTicker,
	getActionKey,
	TRANSACTION_TYPES
} from '../../../util/transactions';
import contractMap from '@metamask/contract-metadata';
import { toChecksumAddress } from 'ethereumjs-util';
import { swapsUtils } from '@metamask/swaps-controller';
import { isSwapsNativeAsset } from '../Swaps/utils';
import { toLowerCaseEquals } from '../../../util/general';

const { getSwapsContractAddress } = swapsUtils;

function calculateTotalGas(gas, gasPrice) {
	const gasBN = hexToBN(gas);
	const gasPriceBN = hexToBN(gasPrice);
	return isBN(gasBN) && isBN(gasPriceBN) ? gasBN.mul(gasPriceBN) : toBN('0x0');
}

function getTokenTransfer(args) {
	const {
		tx: {
			transaction: { from, to, data, nonce }
		},
		conversionRate,
		currentCurrency,
		tokens,
		contractExchangeRates,
		totalGas,
		actionKey,
		primaryCurrency,
		selectedAddress
	} = args;

	const [, , encodedAmount] = decodeTransferData('transfer', data);
	const amount = hexToBN(encodedAmount);
	const userHasToken = safeToChecksumAddress(to) in tokens;
	const token = userHasToken ? tokens[safeToChecksumAddress(to)] : null;
	const renderActionKey = token ? `${strings('transactions.sent')} ${token.symbol}` : actionKey;
	const renderTokenAmount = token
		? `${renderFromTokenMinimalUnit(amount, token.decimals)} ${token.symbol}`
		: undefined;
	const exchangeRate = token ? contractExchangeRates[token.address] : undefined;
	let renderTokenFiatAmount, renderTokenFiatNumber;
	if (exchangeRate) {
		renderTokenFiatAmount = balanceToFiat(
			fromTokenMinimalUnit(amount, token.decimals) || 0,
			conversionRate,
			exchangeRate,
			currentCurrency
		);
		renderTokenFiatNumber = balanceToFiatNumber(
			fromTokenMinimalUnit(amount, token.decimals) || 0,
			conversionRate,
			exchangeRate
		);
	}

	const renderToken = token
		? `${renderFromTokenMinimalUnit(amount, token.decimals)} ${token.symbol}`
		: strings('transaction.value_not_available');
	const totalFiatNumber = renderTokenFiatNumber
		? weiToFiatNumber(totalGas, conversionRate) + renderTokenFiatNumber
		: weiToFiatNumber(totalGas, conversionRate);

	const ticker = getTicker(args.ticker);

	let transactionDetails = {
		renderTotalGas: `${renderFromWei(totalGas)} ${ticker}`,
		renderValue: renderToken
	};
	if (primaryCurrency === 'ETH') {
		transactionDetails = {
			...transactionDetails,
			summaryAmount: renderToken,
			summaryFee: `${renderFromWei(totalGas)} ${ticker}`,
			summaryTotalAmount: `${renderToken} ${strings('unit.divisor')} ${renderFromWei(totalGas)} ${ticker}`,
			summarySecondaryTotalAmount: totalFiatNumber
				? `${addCurrencySymbol(totalFiatNumber, currentCurrency)}`
				: undefined
		};
	} else {
		transactionDetails = {
			...transactionDetails,
			summaryAmount: renderTokenFiatAmount
				? `${renderTokenFiatAmount}`
				: `${addCurrencySymbol(0, currentCurrency)}`,
			summaryFee: weiToFiat(totalGas, conversionRate, currentCurrency),
			summaryTotalAmount: totalFiatNumber ? `${addCurrencySymbol(totalFiatNumber, currentCurrency)}` : undefined,
			summarySecondaryTotalAmount: `${renderToken} ${strings('unit.divisor')} ${renderFromWei(
				totalGas
			)} ${ticker}`
		};
	}

	const { SENT_TOKEN, RECEIVED_TOKEN } = TRANSACTION_TYPES;
	const transactionType = renderFullAddress(from) === selectedAddress ? SENT_TOKEN : RECEIVED_TOKEN;
	const transactionElement = {
		actionKey: renderActionKey,
		value: !renderTokenAmount ? strings('transaction.value_not_available') : renderTokenAmount,
		fiatValue: !!renderTokenFiatAmount && `- ${renderTokenFiatAmount}`,
		transactionType,
		nonce
	};

	return [transactionElement, transactionDetails];
}

function getCollectibleTransfer(args) {
	const {
		tx: {
			transaction: { from, to, data }
		},
		collectibleContracts,
		totalGas,
		conversionRate,
		currentCurrency,
		primaryCurrency,
		selectedAddress
	} = args;
	let actionKey;
	const [, tokenId] = decodeTransferData('transfer', data);
	const ticker = getTicker(args.ticker);
	const collectible = collectibleContracts.find(collectible => toLowerCaseEquals(collectible.address, to));
	if (collectible) {
		actionKey = `${strings('transactions.sent')} ${collectible.name}`;
	} else {
		actionKey = strings('transactions.sent_collectible');
	}

	const renderCollectible = collectible
		? `${strings('unit.token_id')} ${tokenId} ${collectible.symbol}`
		: `${strings('unit.token_id')} ${tokenId}`;

	let transactionDetails = { renderValue: renderCollectible };

	if (primaryCurrency === 'ETH') {
		transactionDetails = {
			...transactionDetails,
			summaryAmount: renderCollectible,
			summaryFee: `${renderFromWei(totalGas)} ${ticker}`,
			summaryTotalAmount: `${renderCollectible} ${strings('unit.divisor')} ${renderFromWei(totalGas)} ${strings(
				'unit.eth'
			)}`,
			summarySecondaryTotalAmount: weiToFiat(totalGas, conversionRate, currentCurrency)
		};
	} else {
		transactionDetails = {
			...transactionDetails,
			summaryAmount: renderCollectible,
			summaryFee: weiToFiat(totalGas, conversionRate, currentCurrency),
			summaryTotalAmount: weiToFiat(totalGas, conversionRate, currentCurrency),
			summarySecondaryTotalAmount: `${renderCollectible} ${strings('unit.divisor')} ${renderFromWei(
				totalGas
			)} ${strings('unit.eth')}`
		};
	}

	let transactionType;
	if (renderFullAddress(from) === selectedAddress) transactionType = TRANSACTION_TYPES.SENT_COLLECTIBLE;
	else transactionType = TRANSACTION_TYPES.RECEIVED_COLLECTIBLE;

	const transactionElement = {
		actionKey,
		value: `${strings('unit.token_id')}${tokenId}`,
		fiatValue: collectible ? collectible.symbol : undefined,
		transactionType
	};

	return [transactionElement, transactionDetails];
}

function decodeIncomingTransfer(args) {
	const {
		tx: {
			transaction: { to, from, value },
			transferInformation: { symbol, decimals, contractAddress },
			transactionHash
		},
		conversionRate,
		currentCurrency,
		contractExchangeRates,
		totalGas,
		actionKey,
		primaryCurrency,
		selectedAddress
	} = args;

	const amount = toBN(value);
	const token = { symbol, decimals, address: contractAddress };

	const renderTokenAmount = token
		? `${renderFromTokenMinimalUnit(amount, token.decimals)} ${token.symbol}`
		: undefined;
	const exchangeRate = token ? contractExchangeRates[toChecksumAddress(token.address)] : undefined;

	let renderTokenFiatAmount, renderTokenFiatNumber;
	if (exchangeRate) {
		renderTokenFiatAmount = balanceToFiat(
			fromTokenMinimalUnit(amount, token.decimals) || 0,
			conversionRate,
			exchangeRate,
			currentCurrency
		);
		renderTokenFiatNumber = balanceToFiatNumber(
			fromTokenMinimalUnit(amount, token.decimals) || 0,
			conversionRate,
			exchangeRate
		);
	}

	const renderToken = token
		? `${renderFromTokenMinimalUnit(amount, token.decimals)} ${token.symbol}`
		: strings('transaction.value_not_available');
	const totalFiatNumber = renderTokenFiatNumber
		? weiToFiatNumber(totalGas, conversionRate) + renderTokenFiatNumber
		: weiToFiatNumber(totalGas, conversionRate);

	const ticker = getTicker(args.ticker);

	const { SENT_TOKEN, RECEIVED_TOKEN } = TRANSACTION_TYPES;
	const transactionType = renderFullAddress(from) === selectedAddress ? SENT_TOKEN : RECEIVED_TOKEN;

	let transactionDetails = {
		renderTotalGas: `${renderFromWei(totalGas)} ${ticker}`,
		renderValue: renderToken,
		renderFrom: renderFullAddress(from),
		renderTo: renderFullAddress(to),
		transactionHash,
		transactionType
	};
	if (primaryCurrency === 'ETH') {
		transactionDetails = {
			...transactionDetails,
			summaryAmount: renderToken,
			summaryFee: `${renderFromWei(totalGas)} ${ticker}`,
			summaryTotalAmount: `${renderToken} ${strings('unit.divisor')} ${renderFromWei(totalGas)} ${ticker}`,
			summarySecondaryTotalAmount: totalFiatNumber
				? `${addCurrencySymbol(totalFiatNumber, currentCurrency)}`
				: undefined
		};
	} else {
		transactionDetails = {
			...transactionDetails,
			summaryAmount: renderTokenFiatAmount
				? `${renderTokenFiatAmount}`
				: `${addCurrencySymbol(0, currentCurrency)}`,
			summaryFee: weiToFiat(totalGas, conversionRate, currentCurrency),
			summaryTotalAmount: totalFiatNumber ? `${addCurrencySymbol(totalFiatNumber, currentCurrency)}` : undefined,
			summarySecondaryTotalAmount: `${renderToken} ${strings('unit.divisor')} ${renderFromWei(
				totalGas
			)} ${ticker}`
		};
	}

	const transactionElement = {
		actionKey,
		renderFrom: renderFullAddress(from),
		renderTo: renderFullAddress(to),
		value: !renderTokenAmount ? strings('transaction.value_not_available') : renderTokenAmount,
		fiatValue: renderTokenFiatAmount ? `${renderTokenFiatAmount}` : renderTokenFiatAmount,
		isIncomingTransfer: true,
		transactionType
	};

	return [transactionElement, transactionDetails];
}

async function decodeTransferTx(args) {
	const {
		tx: {
			transaction: { from, gas, gasPrice, data, to },
			transactionHash
		}
	} = args;

	const decodedData = decodeTransferData('transfer', data);
	const addressTo = decodedData[0];
	let isCollectible = false;
	try {
		isCollectible = await isCollectibleAddress(to, decodedData[1]);
	} catch (e) {
		//
	}

	const totalGas = calculateTotalGas(gas, gasPrice);
	const renderGas = parseInt(gas, 16).toString();
	const renderGasPrice = renderToGwei(gasPrice);

	let [transactionElement, transactionDetails] = isCollectible
		? getCollectibleTransfer({ ...args, totalGas })
		: getTokenTransfer({ ...args, totalGas });
	transactionElement = { ...transactionElement, renderTo: addressTo };
	transactionDetails = {
		...transactionDetails,
		...{
			renderFrom: renderFullAddress(from),
			renderTo: renderFullAddress(addressTo),
			transactionHash,
			renderGas,
			renderGasPrice
		}
	};
	return [transactionElement, transactionDetails];
}

function decodeTransferFromTx(args) {
	const {
		tx: {
			transaction: { gas, gasPrice, data, to },
			transactionHash
		},
		collectibleContracts,
		conversionRate,
		currentCurrency,
		primaryCurrency,
		selectedAddress
	} = args;
	const [addressFrom, addressTo, tokenId] = decodeTransferData('transferFrom', data);
	const collectible = collectibleContracts.find(collectible => toLowerCaseEquals(collectible.address, to));
	let actionKey = args.actionKey;
	if (collectible) {
		actionKey = `${strings('transactions.sent')} ${collectible.name}`;
	}

	const totalGas = calculateTotalGas(gas, gasPrice);
	const renderCollectible = collectible?.symbol
		? `${strings('unit.token_id')}${tokenId} ${collectible?.symbol}`
		: `${strings('unit.token_id')}${tokenId}`;

	const renderFrom = renderFullAddress(addressFrom);
	const renderTo = renderFullAddress(addressTo);
	const ticker = getTicker(args.ticker);

	const { SENT_COLLECTIBLE, RECEIVED_COLLECTIBLE } = TRANSACTION_TYPES;
	const transactionType = renderFrom === selectedAddress ? SENT_COLLECTIBLE : RECEIVED_COLLECTIBLE;

	let transactionDetails = {
		renderFrom,
		renderTo,
		transactionHash,
		renderValue: renderCollectible,
		renderGas: parseInt(gas, 16).toString(),
		renderGasPrice: renderToGwei(gasPrice),
		renderTotalGas: `${renderFromWei(totalGas)} ${ticker}`
	};

	if (primaryCurrency === 'ETH') {
		transactionDetails = {
			...transactionDetails,
			summaryAmount: renderCollectible,
			summaryFee: `${renderFromWei(totalGas)} ${ticker}`,
			summarySecondaryTotalAmount: weiToFiat(totalGas, conversionRate, currentCurrency),
			summaryTotalAmount: `${renderCollectible} ${strings('unit.divisor')} ${renderFromWei(totalGas)} ${ticker}`
		};
	} else {
		transactionDetails = {
			...transactionDetails,
			summaryAmount: renderCollectible,
			summaryFee: weiToFiat(totalGas, conversionRate, currentCurrency),
			summarySecondaryTotalAmount: `${renderCollectible} ${strings('unit.divisor')} ${renderFromWei(
				totalGas
			)} ${ticker}`,
			summaryTotalAmount: weiToFiat(totalGas, conversionRate, currentCurrency)
		};
	}

	const transactionElement = {
		renderTo,
		renderFrom,
		actionKey,
		value: `${strings('unit.token_id')}${tokenId}`,
		fiatValue: collectible ? collectible.symbol : undefined,
		transactionType
	};

	return [transactionElement, transactionDetails];
}

function decodeDeploymentTx(args) {
	const {
		tx: {
			transaction: { value, gas, gasPrice, from },
			transactionHash
		},
		conversionRate,
		currentCurrency,
		actionKey,
		primaryCurrency
	} = args;
	const ticker = getTicker(args.ticker);

	const totalGas = calculateTotalGas(gas, gasPrice);
	const renderTotalEth = `${renderFromWei(totalGas)} ${ticker}`;
	const renderTotalEthFiat = weiToFiat(totalGas, conversionRate, currentCurrency);
	const totalEth = isBN(value) ? value.add(totalGas) : totalGas;

	const renderFrom = renderFullAddress(from);
	const renderTo = strings('transactions.to_contract');

	const transactionElement = {
		renderTo,
		renderFrom,
		actionKey,
		value: renderTotalEth,
		fiatValue: renderTotalEthFiat,
		contractDeployment: true,
		transactionType: TRANSACTION_TYPES.SITE_INTERACTION
	};
	let transactionDetails = {
		renderFrom,
		renderTo,
		transactionHash,
		renderValue: `${renderFromWei(value)} ${ticker}`,
		renderGas: parseInt(gas, 16).toString(),
		renderGasPrice: renderToGwei(gasPrice),
		renderTotalGas: `${renderFromWei(totalGas)} ${ticker}`
	};

	if (primaryCurrency === 'ETH') {
		transactionDetails = {
			...transactionDetails,
			summaryAmount: `${renderFromWei(value)} ${ticker}`,
			summaryFee: `${renderFromWei(totalGas)} ${ticker}`,
			summarySecondaryTotalAmount: weiToFiat(totalEth, conversionRate, currentCurrency),
			summaryTotalAmount: `${renderFromWei(totalEth)} ${ticker}`
		};
	} else {
		transactionDetails = {
			...transactionDetails,
			summaryAmount: weiToFiat(value, conversionRate, currentCurrency),
			summaryFee: weiToFiat(totalGas, conversionRate, currentCurrency),
			summarySecondaryTotalAmount: `${renderFromWei(totalEth)} ${ticker}`,
			summaryTotalAmount: weiToFiat(totalEth, conversionRate, currentCurrency)
		};
	}

	return [transactionElement, transactionDetails];
}

function decodeConfirmTx(args) {
	const {
		tx: {
			transaction: { value, gas, gasPrice, from, to },
			transactionHash
		},
		conversionRate,
		currentCurrency,
		actionKey,
		primaryCurrency,
		selectedAddress
	} = args;

	const ticker = getTicker(args.ticker);
	const totalEth = hexToBN(value);
	const renderTotalEth = `${renderFromWei(totalEth)} ${ticker}`;
	const renderTotalEthFiat = weiToFiat(totalEth, conversionRate, currentCurrency);

	const totalGas = calculateTotalGas(gas, gasPrice);
	const totalValue = isBN(totalEth) ? totalEth.add(totalGas) : totalGas;

	const renderFrom = renderFullAddress(from);
	const renderTo = renderFullAddress(to);

	let symbol;
	if (renderTo in contractMap) {
		symbol = contractMap[renderTo].symbol;
	}
	let transactionType;
	if (actionKey === strings('transactions.approve')) transactionType = TRANSACTION_TYPES.APPROVE;
	else if (actionKey === strings('transactions.swaps_transaction'))
		transactionType = TRANSACTION_TYPES.SITE_INTERACTION;
	else if (
		actionKey === strings('transactions.smart_contract_interaction') ||
		(!actionKey.includes(strings('transactions.sent')) && !actionKey.includes(strings('transactions.received')))
	)
		transactionType = TRANSACTION_TYPES.SITE_INTERACTION;
	else if (renderFrom === selectedAddress) transactionType = TRANSACTION_TYPES.SENT;
	else if (renderTo === selectedAddress) transactionType = TRANSACTION_TYPES.RECEIVED;
	const transactionElement = {
		renderTo,
		renderFrom,
		actionKey: symbol ? `${symbol} ${actionKey}` : actionKey,
		value: renderTotalEth,
		fiatValue: renderTotalEthFiat,
		transactionType
	};
	let transactionDetails = {
		renderFrom,
		renderTo,
		transactionHash,
		renderValue: `${renderFromWei(value)} ${ticker}`,
		renderGas: parseInt(gas, 16).toString(),
		renderGasPrice: renderToGwei(gasPrice),
		renderTotalGas: `${renderFromWei(totalGas)} ${ticker}`,
		transactionType
	};

	if (primaryCurrency === 'ETH') {
		transactionDetails = {
			...transactionDetails,
			summaryAmount: renderTotalEth,
			summaryFee: `${renderFromWei(totalGas)} ${ticker}`,
			summarySecondaryTotalAmount: weiToFiat(totalValue, conversionRate, currentCurrency),
			summaryTotalAmount: `${renderFromWei(totalValue)} ${ticker}`
		};
	} else {
		transactionDetails = {
			...transactionDetails,
			summaryAmount: weiToFiat(totalEth, conversionRate, currentCurrency),
			summaryFee: weiToFiat(totalGas, conversionRate, currentCurrency),
			summarySecondaryTotalAmount: `${renderFromWei(totalValue)} ${ticker}`,
			summaryTotalAmount: weiToFiat(totalValue, conversionRate, currentCurrency)
		};
	}
	return [transactionElement, transactionDetails];
}

function decodeSwapsTx(args) {
	const {
		swapsTransactions,
		swapsTokens,
		conversionRate,
		currentCurrency,
		primaryCurrency,
		tx: {
			id,
			transaction: { gas, gasPrice, from, to },
			transactionHash
		},
		tx,
		contractExchangeRates,
		assetSymbol
	} = args;
	const swapTransaction = (swapsTransactions && swapsTransactions[id]) || {};
	const totalGas = calculateTotalGas(swapTransaction.gasUsed || gas, gasPrice);
	const sourceToken = swapsTokens?.find(({ address }) => address === swapTransaction?.sourceToken?.address);
	const destinationToken =
		swapTransaction?.destinationToken?.swaps ||
		swapsTokens?.find(({ address }) => address === swapTransaction?.destinationToken?.address);
	if (!sourceToken || !destinationToken) return [undefined, undefined];

	const renderFrom = renderFullAddress(from);
	const renderTo = renderFullAddress(to);
	const ticker = getTicker(args.ticker);
	const totalEthGas = renderFromWei(totalGas);
	const decimalSourceAmount =
		swapTransaction.sourceAmount &&
		renderFromTokenMinimalUnit(swapTransaction.sourceAmount, swapTransaction.sourceToken.decimals);
	const decimalDestinationAmount =
		swapTransaction.destinationToken.decimals &&
		renderFromTokenMinimalUnit(
			!!swapTransaction?.receivedDestinationAmount && swapTransaction?.receivedDestinationAmount > 0
				? swapTransaction.receivedDestinationAmount
				: swapTransaction.destinationAmount,
			swapTransaction.destinationToken.decimals
		);
	const cryptoSummaryTotalAmount =
		sourceToken.symbol === 'ETH'
			? `${Number(totalEthGas) + Number(decimalSourceAmount)} ${ticker}`
			: decimalSourceAmount
			? `${decimalSourceAmount} ${sourceToken.symbol} + ${totalEthGas} ${ticker}`
			: `${totalEthGas} ${ticker}`;

	const isSwap = swapTransaction.action === 'swap';
	let notificationKey, actionKey, value, fiatValue;
	if (isSwap) {
		actionKey = strings('swaps.transaction_label.swap', {
			sourceToken: sourceToken.symbol,
			destinationToken: destinationToken.symbol
		});
		notificationKey = strings(
			`swaps.notification_label.${tx.status === 'submitted' ? 'swap_pending' : 'swap_confirmed'}`,
			{ sourceToken: sourceToken.symbol, destinationToken: destinationToken.symbol }
		);
	} else {
		actionKey = strings('swaps.transaction_label.approve', {
			sourceToken: sourceToken.symbol,
			upTo: renderFromTokenMinimalUnit(swapTransaction.upTo, sourceToken.decimals)
		});
		notificationKey = strings(
			`swaps.notification_label.${tx.status === 'submitted' ? 'approve_pending' : 'approve_confirmed'}`,
			{ sourceToken: sourceToken.symbol }
		);
	}

	const sourceExchangeRate = isSwapsNativeAsset(sourceToken)
		? 1
		: contractExchangeRates[safeToChecksumAddress(sourceToken.address)];
	const renderSourceTokenFiatNumber = balanceToFiatNumber(decimalSourceAmount, conversionRate, sourceExchangeRate);

	const destinationExchangeRate = isSwapsNativeAsset(destinationToken)
		? 1
		: contractExchangeRates[safeToChecksumAddress(destinationToken.address)];
	const renderDestinationTokenFiatNumber = balanceToFiatNumber(
		decimalDestinationAmount,
		conversionRate,
		destinationExchangeRate
	);

	if (isSwap) {
		if (!assetSymbol || sourceToken.symbol === assetSymbol) {
			value = `-${decimalSourceAmount} ${sourceToken.symbol}`;
			fiatValue = addCurrencySymbol(renderSourceTokenFiatNumber, currentCurrency);
		} else {
			value = `+${decimalDestinationAmount} ${destinationToken.symbol}`;
			fiatValue = addCurrencySymbol(renderDestinationTokenFiatNumber, currentCurrency);
		}
	}
	const transactionElement = {
		renderTo,
		renderFrom,
		actionKey,
		notificationKey,
		value,
		fiatValue,
		transactionType: isSwap ? TRANSACTION_TYPES.SITE_INTERACTION : TRANSACTION_TYPES.APPROVE
	};

	let transactionDetails = {
		renderFrom,
		renderTo,
		transactionHash,
		renderValue: decimalSourceAmount ? `${decimalSourceAmount} ${sourceToken.symbol}` : `0 ${ticker}`,
		renderGas: parseInt(gas, 16),
		renderGasPrice: renderToGwei(gasPrice),
		renderTotalGas: `${totalEthGas} ${ticker}`
	};

	if (primaryCurrency === 'ETH') {
		transactionDetails = {
			...transactionDetails,
			summaryAmount: isSwap ? `${decimalSourceAmount} ${sourceToken.symbol}` : `0 ${ticker}`,
			summaryFee: `${totalEthGas} ${ticker}`,
			summaryTotalAmount: cryptoSummaryTotalAmount,
			summarySecondaryTotalAmount: addCurrencySymbol(
				renderSourceTokenFiatNumber + weiToFiatNumber(totalGas, conversionRate),
				currentCurrency
			)
		};
	} else {
		transactionDetails = {
			...transactionDetails,
			summaryAmount: addCurrencySymbol(renderSourceTokenFiatNumber, currentCurrency),
			summaryFee: weiToFiat(totalGas, conversionRate, currentCurrency),
			summaryTotalAmount: addCurrencySymbol(
				renderSourceTokenFiatNumber + weiToFiatNumber(totalGas, conversionRate),
				currentCurrency
			),
			summarySecondaryTotalAmount: cryptoSummaryTotalAmount
		};
	}
	return [transactionElement, transactionDetails];
}

/**
 * Parse transaction with wallet information to render
 *
 * @param {*} args - Should contain tx, selectedAddress, ticker, conversionRate,
 * currentCurrency, exchangeRate, contractExchangeRates, collectibleContracts, tokens
 */
export default async function decodeTransaction(args) {
	const { tx, selectedAddress, ticker, chainId, swapsTransactions = {} } = args;
	const { isTransfer } = tx || {};

	const actionKey = await getActionKey(tx, selectedAddress, ticker, chainId);
	let transactionElement, transactionDetails;

	if (tx.transaction.to?.toLowerCase() === getSwapsContractAddress(chainId) || swapsTransactions[tx.id]) {
		const [transactionElement, transactionDetails] = decodeSwapsTx({ ...args, actionKey });
		if (transactionElement && transactionDetails) return [transactionElement, transactionDetails];
	}
	if (isTransfer) {
		[transactionElement, transactionDetails] = decodeIncomingTransfer({ ...args, actionKey });
	} else {
		switch (actionKey) {
			case strings('transactions.sent_tokens'):
				[transactionElement, transactionDetails] = await decodeTransferTx({ ...args, actionKey });
				break;
			case strings('transactions.sent_collectible'):
				[transactionElement, transactionDetails] = decodeTransferFromTx({ ...args, actionKey });
				break;
			case strings('transactions.contract_deploy'):
				[transactionElement, transactionDetails] = decodeDeploymentTx({ ...args, actionKey });
				break;
			default:
				[transactionElement, transactionDetails] = decodeConfirmTx({ ...args, actionKey });
		}
	}
	return [transactionElement, transactionDetails];
}
