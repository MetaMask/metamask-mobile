import AppConstants from '../../../core/AppConstants';
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
import { decodeTransferData, isCollectibleAddress, getTicker, getActionKey } from '../../../util/transactions';
import contractMap from 'eth-contract-metadata';

const {
	CONNEXT: { CONTRACTS }
} = AppConstants;

function decodePaymentChannelTx(args) {
	const {
		tx: {
			networkID,
			transactionHash,
			transaction: { value, gas, gasPrice, from, to }
		},
		conversionRate,
		currentCurrency,
		exchangeRate,
		actionKey
	} = args;
	const contract = CONTRACTS[networkID];
	const isDeposit = contract && to.toLowerCase() === contract.toLowerCase();
	const totalEth = hexToBN(value);
	const totalEthFiat = weiToFiat(totalEth, conversionRate, currentCurrency);
	const readableTotalEth = renderFromWei(totalEth);
	const renderTotalEth = `${readableTotalEth} ${isDeposit ? strings('unit.eth') : strings('unit.sai')}`;
	const renderTotalEthFiat = isDeposit
		? totalEthFiat
		: balanceToFiat(parseFloat(readableTotalEth), conversionRate, exchangeRate, currentCurrency);

	const renderFrom = renderFullAddress(from);
	const renderTo = renderFullAddress(to);

	const transactionDetails = {
		renderFrom,
		renderTo,
		transactionHash,
		renderGas: gas ? parseInt(gas, 16).toString() : strings('transactions.tx_details_not_available'),
		renderGasPrice: gasPrice ? renderToGwei(gasPrice) : strings('transactions.tx_details_not_available'),
		renderValue: renderTotalEth,
		summaryAmount: weiToFiat(totalEth, conversionRate, currentCurrency),
		summarySecondaryTotalAmount: renderTotalEth,
		summaryTotalAmount: isDeposit && totalEthFiat
	};

	const transactionElement = {
		renderFrom,
		renderTo,
		actionKey,
		value: renderTotalEth,
		fiatValue: renderTotalEthFiat,
		paymentChannelTransaction: true
	};

	return [transactionElement, transactionDetails];
}

function getTokenTransfer(args) {
	const {
		tx: {
			transaction: { to, data }
		},
		conversionRate,
		currentCurrency,
		tokens,
		contractExchangeRates,
		totalGas,
		actionKey
	} = args;

	const [, encodedAmount] = decodeTransferData('transfer', data);

	const amount = toBN(encodedAmount);

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

	const transactionDetails = {
		renderTotalGas: `${renderFromWei(totalGas)} ${ticker}`,
		summaryFee: weiToFiat(totalGas, conversionRate, currentCurrency),
		renderValue: renderToken,
		summaryAmount: renderTokenFiatAmount ? `${renderTokenFiatAmount}` : `${addCurrencySymbol(0, currentCurrency)}`,
		summarySecondaryTotalAmount: `${renderToken} ${strings('unit.divisor')} ${renderFromWei(totalGas)} ${ticker}`,
		summaryTotalAmount: totalFiatNumber ? `${addCurrencySymbol(totalFiatNumber, currentCurrency)}` : undefined
	};

	const transactionElement = {
		actionKey: renderActionKey,
		value: !renderTokenAmount ? strings('transaction.value_not_available') : renderTokenAmount,
		fiatValue: `- ${renderTokenFiatAmount}`
	};

	return [transactionElement, transactionDetails];
}

function getCollectibleTransfer(args) {
	const {
		tx: {
			transaction: { to, data }
		},
		collectibleContracts,
		totalGas,
		conversionRate,
		currentCurrency
	} = args;
	let actionKey;
	const [, tokenId] = decodeTransferData('transfer', data);
	const collectible = collectibleContracts.find(
		collectible => collectible.address.toLowerCase() === to.toLowerCase()
	);
	if (collectible) {
		actionKey = `${strings('transactions.sent')} ${collectible.name}`;
	} else {
		actionKey = strings('transactions.sent_collectible');
	}

	const renderCollectible = collectible
		? `${strings('unit.token_id')} ${tokenId} ${collectible.symbol}`
		: `${strings('unit.token_id')} ${tokenId}`;

	const transactionDetails = {
		renderValue: renderCollectible,
		summarySecondaryTotalAmount: `${renderCollectible} ${strings('unit.divisor')} ${renderFromWei(
			totalGas
		)} ${strings('unit.eth')}`,
		summaryTotalAmount: weiToFiat(totalGas, conversionRate, currentCurrency)
	};

	const transactionElement = {
		actionKey,
		value: `${strings('unit.token_id')}${tokenId}`,
		fiatValue: collectible ? collectible.symbol : undefined
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
	const isCollectible = await isCollectibleAddress(to, decodedData[1]);

	const gasBN = hexToBN(gas);
	const gasPriceBN = hexToBN(gasPrice);
	const totalGas = isBN(gasBN) && isBN(gasPriceBN) ? gasBN.mul(gasPriceBN) : toBN('0x0');
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
		currentCurrency
	} = args;
	const [addressFrom, addressTo, tokenId] = decodeTransferData('transferFrom', data);
	const collectible = collectibleContracts.find(
		collectible => collectible.address.toLowerCase() === to.toLowerCase()
	);
	let actionKey = args.actionKey;
	if (collectible) {
		actionKey = `${strings('transactions.sent')} ${collectible.name}`;
	}

	const gasBN = hexToBN(gas);
	const gasPriceBN = hexToBN(gasPrice);
	const totalGas = isBN(gasBN) && isBN(gasPriceBN) ? gasBN.mul(gasPriceBN) : toBN('0x0');
	const renderCollectible = collectible
		? `${strings('unit.token_id')}${tokenId} ${collectible.symbol}`
		: `${strings('unit.token_id')}${tokenId}`;

	const renderFrom = renderFullAddress(addressFrom);
	const renderTo = renderFullAddress(addressTo);
	const ticker = getTicker(args.ticker);

	const transactionDetails = {
		renderFrom,
		renderTo,
		transactionHash,
		renderValue: renderCollectible,
		summaryAmount: renderCollectible,
		renderGas: parseInt(gas, 16).toString(),
		renderGasPrice: renderToGwei(gasPrice),
		renderTotalGas: `${renderFromWei(totalGas)} ${ticker}`,
		summaryFee: weiToFiat(totalGas, conversionRate, currentCurrency),
		summarySecondaryTotalAmount: `${renderCollectible} ${strings('unit.divisor')} ${renderFromWei(
			totalGas
		)} ${ticker}`,
		summaryTotalAmount: weiToFiat(totalGas, conversionRate, currentCurrency)
	};

	const transactionElement = {
		renderTo,
		renderFrom,
		actionKey,
		value: `${strings('unit.token_id')}${tokenId}`,
		fiatValue: collectible ? collectible.symbol : undefined
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
		actionKey
	} = args;
	const ticker = getTicker(args.ticker);
	const gasBN = hexToBN(gas);
	const gasPriceBN = hexToBN(gasPrice);
	const totalGas = isBN(gasBN) && isBN(gasPriceBN) ? gasBN.mul(gasPriceBN) : toBN('0x0');

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
		contractDeployment: true
	};
	const transactionDetails = {
		renderFrom,
		renderTo,
		transactionHash,
		renderValue: `${renderFromWei(value)} ${ticker}`,
		summaryAmount: weiToFiat(value, conversionRate, currentCurrency),
		renderGas: parseInt(gas, 16).toString(),
		renderGasPrice: renderToGwei(gasPrice),
		renderTotalGas: `${renderFromWei(totalGas)} ${ticker}`,
		summaryFee: weiToFiat(totalGas, conversionRate, currentCurrency),
		summarySecondaryTotalAmount: `${renderFromWei(totalEth)} ${ticker}`,
		summaryTotalAmount: weiToFiat(totalEth, conversionRate, currentCurrency)
	};

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
		actionKey
	} = args;
	const ticker = getTicker(args.ticker);
	const totalEth = hexToBN(value);
	const renderTotalEth = `${renderFromWei(totalEth)} ${ticker}`;
	const renderTotalEthFiat = weiToFiat(totalEth, conversionRate, currentCurrency);

	const gasBN = hexToBN(gas);
	const gasPriceBN = hexToBN(gasPrice);
	const totalGas = isBN(gasBN) && isBN(gasPriceBN) ? gasBN.mul(gasPriceBN) : toBN('0x0');
	const totalValue = isBN(totalEth) ? totalEth.add(totalGas) : totalGas;

	const renderFrom = renderFullAddress(from);
	const renderTo = renderFullAddress(to);
	const transactionDetails = {
		renderFrom,
		renderTo,
		transactionHash,
		renderValue: `${renderFromWei(value)} ${ticker}`,
		summaryAmount: weiToFiat(totalEth, conversionRate, currentCurrency),
		renderGas: parseInt(gas, 16).toString(),
		renderGasPrice: renderToGwei(gasPrice),
		renderTotalGas: `${renderFromWei(totalGas)} ${ticker}`,
		summaryFee: weiToFiat(totalGas, conversionRate, currentCurrency),
		summarySecondaryTotalAmount: `${renderFromWei(totalValue)} ${ticker}`,
		summaryTotalAmount: weiToFiat(totalValue, conversionRate, currentCurrency)
	};

	let symbol;
	if (renderTo in contractMap) {
		symbol = contractMap[renderTo].symbol;
	}

	const transactionElement = {
		renderTo,
		renderFrom,
		actionKey: symbol ? `${symbol} ${actionKey}` : actionKey,
		value: renderTotalEth,
		fiatValue: renderTotalEthFiat
	};

	return [transactionElement, transactionDetails];
}

/**
 * Parse transaction with wallet information to render
 *
 * @param {*} args - Should contain tx, selectedAddress, ticker, conversionRate,
 * currentCurrency, exchangeRate, contractExchangeRates, collectibleContracts, tokens
 */
export default async function decodeTransaction(args) {
	const {
		tx,
		tx: { paymentChannelTransaction },
		selectedAddress,
		ticker
	} = args;
	const actionKey = tx.actionKey || (await getActionKey(tx, selectedAddress, ticker, paymentChannelTransaction));
	let transactionElement, transactionDetails;
	if (paymentChannelTransaction) {
		[transactionElement, transactionDetails] = decodePaymentChannelTx({ ...args, actionKey });
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
