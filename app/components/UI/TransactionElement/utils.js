import {
  hexToBN,
  weiToFiat,
  renderFromWei,
  balanceToFiat,
  isBN,
  renderFromTokenMinimalUnit,
  fromTokenMinimalUnit,
  balanceToFiatNumber,
  weiToFiatNumber,
  addCurrencySymbol,
  limitToMaximumDecimalPlaces,
} from '../../../util/number';
import { strings } from '../../../../locales/i18n';
import {
  renderFullAddress,
  areAddressesEqual,
  toFormattedAddress,
  toChecksumAddress,
} from '../../../util/address';
import {
  decodeTransferData,
  isCollectibleAddress,
  getActionKey,
  TRANSACTION_TYPES,
} from '../../../util/transactions';
import { swapsUtils } from '@metamask/swaps-controller';
import { isSwapsNativeAsset } from '../Swaps/utils';
import Engine from '../../../core/Engine';
import { TransactionType } from '@metamask/transaction-controller';
import {
  decodeBridgeTx,
  decodeSwapsTx,
} from '../Bridge/utils/transaction-history';
import { calculateTotalGas, renderGwei } from './utils-gas';

const { getSwapsContractAddress } = swapsUtils;

function getTokenTransfer(args) {
  const {
    tx: {
      txParams: { from, to, data, nonce },
    },
    txChainId,
    conversionRate,
    currentCurrency,
    tokens,
    contractExchangeRates,
    totalGas,
    actionKey,
    primaryCurrency,
    selectedAddress,
    ticker,
  } = args;

  const [, , encodedAmount] = decodeTransferData('transfer', data);
  const amount = hexToBN(encodedAmount);
  const userHasToken = toFormattedAddress(to) in tokens;
  const token = userHasToken ? tokens[toFormattedAddress(to)] : null;
  const renderActionKey = token
    ? `${strings('transactions.sent')} ${token.symbol}`
    : actionKey;
  const renderTokenAmount = token
    ? `${renderFromTokenMinimalUnit(amount, token.decimals)} ${token.symbol}`
    : undefined;
  const exchangeRate =
    token && contractExchangeRates
      ? contractExchangeRates[token.address]?.price
      : undefined;
  let renderTokenFiatAmount, renderTokenFiatNumber;
  if (exchangeRate) {
    renderTokenFiatAmount = balanceToFiat(
      fromTokenMinimalUnit(amount, token.decimals) || 0,
      conversionRate,
      exchangeRate,
      currentCurrency,
    );
    renderTokenFiatNumber = balanceToFiatNumber(
      fromTokenMinimalUnit(amount, token.decimals) || 0,
      conversionRate,
      exchangeRate,
    );
  }

  const renderToken = token
    ? `${renderFromTokenMinimalUnit(amount, token.decimals)} ${token.symbol}`
    : strings('transaction.value_not_available');
  const totalFiatNumber = renderTokenFiatNumber
    ? weiToFiatNumber(totalGas, conversionRate) + renderTokenFiatNumber
    : weiToFiatNumber(totalGas, conversionRate);

  let transactionDetails = {
    renderTotalGas: `${renderFromWei(totalGas)} ${ticker}`,
    renderValue: renderToken,
  };
  if (primaryCurrency === 'ETH') {
    transactionDetails = {
      ...transactionDetails,
      summaryAmount: renderToken,
      summaryFee: `${renderFromWei(totalGas)} ${ticker}`,
      summaryTotalAmount: `${renderToken} ${strings(
        'unit.divisor',
      )} ${renderFromWei(totalGas)} ${ticker}`,
      summarySecondaryTotalAmount: totalFiatNumber
        ? `${addCurrencySymbol(totalFiatNumber, currentCurrency)}`
        : undefined,
    };
  } else {
    transactionDetails = {
      ...transactionDetails,
      summaryAmount: renderTokenFiatAmount
        ? `${renderTokenFiatAmount}`
        : `${addCurrencySymbol(0, currentCurrency)}`,
      summaryFee: weiToFiat(totalGas, conversionRate, currentCurrency),
      summaryTotalAmount: totalFiatNumber
        ? `${addCurrencySymbol(totalFiatNumber, currentCurrency)}`
        : undefined,
      summarySecondaryTotalAmount: `${renderToken} ${strings(
        'unit.divisor',
      )} ${renderFromWei(totalGas)} ${ticker}`,
      txChainId,
    };
  }

  const { SENT_TOKEN, RECEIVED_TOKEN } = TRANSACTION_TYPES;
  const transactionType =
    renderFullAddress(from) === selectedAddress ? SENT_TOKEN : RECEIVED_TOKEN;
  const transactionElement = {
    actionKey: renderActionKey,
    value: !renderTokenAmount
      ? strings('transaction.value_not_available')
      : renderTokenAmount,
    fiatValue: !!renderTokenFiatAmount && `- ${renderTokenFiatAmount}`,
    transactionType,
    nonce,
  };

  return [transactionElement, transactionDetails];
}

function getCollectibleTransfer(args) {
  const {
    tx: {
      txParams: { from, to, data },
    },
    txChainId,
    collectibleContracts,
    totalGas,
    conversionRate,
    currentCurrency,
    primaryCurrency,
    selectedAddress,
    ticker,
  } = args;
  let actionKey;
  const [, tokenId] = decodeTransferData('transfer', data);
  const collectible = collectibleContracts.find((collectible) =>
    areAddressesEqual(collectible.address, to),
  );
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
      summaryTotalAmount: `${renderCollectible} ${strings(
        'unit.divisor',
      )} ${renderFromWei(totalGas)} ${strings('unit.eth')}`,
      summarySecondaryTotalAmount: weiToFiat(
        totalGas,
        conversionRate,
        currentCurrency,
      ),
      txChainId,
    };
  } else {
    transactionDetails = {
      ...transactionDetails,
      summaryAmount: renderCollectible,
      summaryFee: weiToFiat(totalGas, conversionRate, currentCurrency),
      summaryTotalAmount: weiToFiat(totalGas, conversionRate, currentCurrency),
      summarySecondaryTotalAmount: `${renderCollectible} ${strings(
        'unit.divisor',
      )} ${renderFromWei(totalGas)} ${strings('unit.eth')}`,
      txChainId,
    };
  }

  let transactionType;
  if (renderFullAddress(from) === selectedAddress)
    transactionType = TRANSACTION_TYPES.SENT_COLLECTIBLE;
  else transactionType = TRANSACTION_TYPES.RECEIVED_COLLECTIBLE;

  const transactionElement = {
    actionKey,
    value: `${strings('unit.token_id')}${tokenId}`,
    fiatValue: collectible ? collectible.symbol : undefined,
    transactionType,
  };

  return [transactionElement, transactionDetails];
}

function decodeIncomingTransfer(args) {
  const {
    tx: {
      txParams: { to, from, value },
      transferInformation: { symbol, decimals, contractAddress },
      hash,
    },
    txChainId,
    conversionRate,
    currentCurrency,
    contractExchangeRates,
    totalGas,
    actionKey,
    primaryCurrency,
    selectedAddress,
    ticker,
  } = args;

  const amount = hexToBN(value);
  const token = { symbol, decimals, address: contractAddress };

  const renderTokenAmount = token
    ? `${renderFromTokenMinimalUnit(amount, token.decimals)} ${token.symbol}`
    : undefined;
  const exchangeRate =
    token && contractExchangeRates
      ? contractExchangeRates[toChecksumAddress(token.address)]?.price
      : undefined;

  let renderTokenFiatAmount, renderTokenFiatNumber;
  if (exchangeRate) {
    renderTokenFiatAmount = balanceToFiat(
      fromTokenMinimalUnit(amount, token.decimals) || 0,
      conversionRate,
      exchangeRate,
      currentCurrency,
    );

    renderTokenFiatNumber = balanceToFiatNumber(
      fromTokenMinimalUnit(amount, token.decimals) || 0,
      conversionRate,
      exchangeRate,
    );
  }

  const renderToken = token
    ? `${renderFromTokenMinimalUnit(amount, token.decimals)} ${token.symbol}`
    : strings('transaction.value_not_available');
  const totalFiatNumber = renderTokenFiatNumber
    ? weiToFiatNumber(totalGas, conversionRate) + renderTokenFiatNumber
    : weiToFiatNumber(totalGas, conversionRate);

  const { SENT_TOKEN, RECEIVED_TOKEN } = TRANSACTION_TYPES;
  const transactionType =
    renderFullAddress(from) === selectedAddress ? SENT_TOKEN : RECEIVED_TOKEN;

  let transactionDetails = {
    renderTotalGas: `${renderFromWei(totalGas)} ${ticker}`,
    renderValue: renderToken,
    renderFrom: renderFullAddress(from),
    renderTo: renderFullAddress(to),
    hash,
    transactionType,
    txChainId,
  };
  if (primaryCurrency === 'ETH') {
    transactionDetails = {
      ...transactionDetails,
      summaryAmount: renderToken,
      summaryFee: `${renderFromWei(totalGas)} ${ticker}`,
      summaryTotalAmount: `${renderToken} ${strings(
        'unit.divisor',
      )} ${renderFromWei(totalGas)} ${ticker}`,
      summarySecondaryTotalAmount: totalFiatNumber
        ? `${addCurrencySymbol(totalFiatNumber, currentCurrency)}`
        : undefined,
    };
  } else {
    transactionDetails = {
      ...transactionDetails,
      summaryAmount: renderTokenFiatAmount
        ? `${renderTokenFiatAmount}`
        : `${addCurrencySymbol(0, currentCurrency)}`,
      summaryFee: weiToFiat(totalGas, conversionRate, currentCurrency),
      summaryTotalAmount: totalFiatNumber
        ? `${addCurrencySymbol(totalFiatNumber, currentCurrency)}`
        : undefined,
      summarySecondaryTotalAmount: `${renderToken} ${strings(
        'unit.divisor',
      )} ${renderFromWei(totalGas)} ${ticker}`,
    };
  }

  const transactionElement = {
    actionKey,
    renderFrom: renderFullAddress(from),
    renderTo: renderFullAddress(to),
    value: !renderTokenAmount
      ? strings('transaction.value_not_available')
      : renderTokenAmount,
    fiatValue: renderTokenFiatAmount
      ? `${renderTokenFiatAmount}`
      : renderTokenFiatAmount,
    isIncomingTransfer: true,
    transactionType,
  };

  return [transactionElement, transactionDetails];
}

async function decodeTransferTx(args) {
  const {
    tx: {
      txParams,
      txParams: { from, gas, data, to },
      hash,
    },
    txChainId,
  } = args;

  const decodedData = decodeTransferData('transfer', data);
  const addressTo = decodedData[0];
  let isCollectible = false;
  try {
    isCollectible = await isCollectibleAddress(to, decodedData[1]);
  } catch (e) {
    //
  }

  const totalGas = calculateTotalGas(txParams);
  const renderGas = parseInt(gas, 16).toString();
  const renderGasPrice = renderGwei(txParams);
  let [transactionElement, transactionDetails] = isCollectible
    ? getCollectibleTransfer({ ...args, totalGas })
    : getTokenTransfer({ ...args, totalGas });
  transactionElement = { ...transactionElement, renderTo: addressTo };
  transactionDetails = {
    ...transactionDetails,
    ...{
      renderFrom: renderFullAddress(from),
      renderTo: renderFullAddress(addressTo),
      hash,
      renderGas,
      renderGasPrice,
      txChainId,
    },
  };
  return [transactionElement, transactionDetails];
}

function decodeTransferFromTx(args) {
  const {
    tx: {
      txParams,
      txParams: { gas, data, to },
      hash,
    },
    txChainId,
    collectibleContracts,
    conversionRate,
    currentCurrency,
    primaryCurrency,
    selectedAddress,
    ticker,
  } = args;
  const [addressFrom, addressTo, tokenId] = decodeTransferData(
    'transferFrom',
    data,
  );
  const collectible = collectibleContracts.find((collectible) =>
    areAddressesEqual(collectible.address, to),
  );
  let actionKey = args.actionKey;
  if (collectible) {
    actionKey = `${strings('transactions.sent')} ${collectible.name}`;
  }

  const totalGas = calculateTotalGas(txParams);
  const renderCollectible = collectible?.symbol
    ? `${strings('unit.token_id')}${tokenId} ${collectible?.symbol}`
    : `${strings('unit.token_id')}${tokenId}`;

  const renderFrom = renderFullAddress(addressFrom);
  const renderTo = renderFullAddress(addressTo);

  const { SENT_COLLECTIBLE, RECEIVED_COLLECTIBLE } = TRANSACTION_TYPES;
  const transactionType =
    renderFrom === selectedAddress ? SENT_COLLECTIBLE : RECEIVED_COLLECTIBLE;

  let transactionDetails = {
    renderFrom,
    renderTo,
    hash,
    renderValue: renderCollectible,
    renderGas: parseInt(gas, 16).toString(),
    renderGasPrice: renderGwei(txParams),
    renderTotalGas: `${renderFromWei(totalGas)} ${ticker}`,
    txChainId,
  };

  if (primaryCurrency === 'ETH') {
    transactionDetails = {
      ...transactionDetails,
      summaryAmount: renderCollectible,
      summaryFee: `${renderFromWei(totalGas)} ${ticker}`,
      summarySecondaryTotalAmount: weiToFiat(
        totalGas,
        conversionRate,
        currentCurrency,
      ),
      summaryTotalAmount: `${renderCollectible} ${strings(
        'unit.divisor',
      )} ${renderFromWei(totalGas)} ${ticker}`,
      transactionType,
    };
  } else {
    transactionDetails = {
      ...transactionDetails,
      summaryAmount: renderCollectible,
      summaryFee: weiToFiat(totalGas, conversionRate, currentCurrency),
      summarySecondaryTotalAmount: `${renderCollectible} ${strings(
        'unit.divisor',
      )} ${renderFromWei(totalGas)} ${ticker}`,
      summaryTotalAmount: weiToFiat(totalGas, conversionRate, currentCurrency),
      transactionType,
    };
  }

  const transactionElement = {
    renderTo,
    renderFrom,
    actionKey,
    value: `${strings('unit.token_id')}${tokenId}`,
    fiatValue: collectible ? collectible.symbol : undefined,
    transactionType,
  };

  return [transactionElement, transactionDetails];
}

function decodeDeploymentTx(args) {
  const {
    tx: {
      txParams,
      txParams: { value, gas, from },
      hash,
    },
    txChainId,
    conversionRate,
    currentCurrency,
    actionKey,
    primaryCurrency,
    ticker,
  } = args;

  const totalGas = calculateTotalGas(txParams);
  const renderTotalEth = `${renderFromWei(totalGas)} ${ticker}`;
  const renderTotalEthFiat = weiToFiat(
    totalGas,
    conversionRate,
    currentCurrency,
  );
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
    transactionType: TRANSACTION_TYPES.SITE_INTERACTION,
  };
  let transactionDetails = {
    renderFrom,
    renderTo,
    hash,
    renderValue: `${renderFromWei(value)} ${ticker}`,
    renderGas: parseInt(gas, 16).toString(),
    renderGasPrice: renderGwei(txParams),
    renderTotalGas: `${renderFromWei(totalGas)} ${ticker}`,
    txChainId,
  };

  if (primaryCurrency === 'ETH') {
    transactionDetails = {
      ...transactionDetails,
      summaryAmount: `${renderFromWei(value)} ${ticker}`,
      summaryFee: `${renderFromWei(totalGas)} ${ticker}`,
      summarySecondaryTotalAmount: weiToFiat(
        totalEth,
        conversionRate,
        currentCurrency,
      ),
      summaryTotalAmount: `${renderFromWei(totalEth)} ${ticker}`,
    };
  } else {
    transactionDetails = {
      ...transactionDetails,
      summaryAmount: weiToFiat(value, conversionRate, currentCurrency),
      summaryFee: weiToFiat(totalGas, conversionRate, currentCurrency),
      summarySecondaryTotalAmount: `${renderFromWei(totalEth)} ${ticker}`,
      summaryTotalAmount: weiToFiat(totalEth, conversionRate, currentCurrency),
    };
  }

  return [transactionElement, transactionDetails];
}

function decodeConfirmTx(args) {
  const {
    tx: {
      txParams,
      txParams: { value, gas, from, to },
      hash,
    },
    txChainId,
    conversionRate,
    currentCurrency,
    actionKey,
    primaryCurrency,
    selectedAddress,
    ticker,
  } = args;
  const totalEth = hexToBN(value);
  const renderTotalEth = `${renderFromWei(totalEth)} ${ticker}`;
  const renderTotalEthFiat = weiToFiat(
    totalEth,
    conversionRate,
    currentCurrency,
  );

  const totalGas = calculateTotalGas(txParams);
  const totalValue = isBN(totalEth) ? totalEth.add(totalGas) : totalGas;

  const renderFrom = renderFullAddress(from);
  const renderTo = renderFullAddress(to);
  const chainId = txChainId;

  const tokenList =
    Engine.context.TokenListController.state.tokensChainsCache?.[chainId]
      ?.data || [];
  let symbol;
  if (renderTo in tokenList) {
    symbol = tokenList[renderTo].symbol;
  }
  let transactionType;
  if (actionKey === strings('transactions.approve'))
    transactionType = TRANSACTION_TYPES.APPROVE;
  else if (actionKey === strings('transactions.increase_allowance'))
    transactionType = TRANSACTION_TYPES.INCREASE_ALLOWANCE;
  else if (actionKey === strings('transactions.set_approval_for_all'))
    transactionType = TRANSACTION_TYPES.SET_APPROVAL_FOR_ALL;
  else if (actionKey === strings('transactions.swaps_transaction'))
    transactionType = TRANSACTION_TYPES.SWAPS_TRANSACTION;
  else if (actionKey === strings('transactions.bridge_transaction'))
    transactionType = TRANSACTION_TYPES.BRIDGE_TRANSACTION;
  else if (
    actionKey === strings('transactions.smart_contract_interaction') ||
    (!actionKey.includes(strings('transactions.sent')) &&
      !actionKey.includes(strings('transactions.received')))
  )
    transactionType = TRANSACTION_TYPES.SITE_INTERACTION;
  else if (renderFrom === selectedAddress)
    transactionType = TRANSACTION_TYPES.SENT;
  else if (renderTo === selectedAddress)
    transactionType = TRANSACTION_TYPES.RECEIVED;
  const transactionElement = {
    renderTo,
    renderFrom,
    actionKey: symbol ? `${symbol} ${actionKey}` : actionKey,
    value: renderTotalEth,
    fiatValue: renderTotalEthFiat,
    transactionType,
  };
  let transactionDetails = {
    renderFrom,
    renderTo,
    hash,
    renderValue: `${renderFromWei(value)} ${ticker}`,
    renderGas: parseInt(gas, 16).toString(),
    renderGasPrice: renderGwei(txParams),
    renderTotalGas: `${renderFromWei(totalGas)} ${ticker}`,
    transactionType,
    txChainId,
  };

  if (primaryCurrency === 'ETH') {
    transactionDetails = {
      ...transactionDetails,
      summaryAmount: renderTotalEth,
      summaryFee: `${renderFromWei(totalGas)} ${ticker}`,
      summarySecondaryTotalAmount: weiToFiat(
        totalValue,
        conversionRate,
        currentCurrency,
      ),
      summaryTotalAmount: `${renderFromWei(totalValue)} ${ticker}`,
    };
  } else {
    transactionDetails = {
      ...transactionDetails,
      summaryAmount: weiToFiat(totalEth, conversionRate, currentCurrency),
      summaryFee: weiToFiat(totalGas, conversionRate, currentCurrency),
      summarySecondaryTotalAmount: `${renderFromWei(totalValue)} ${ticker}`,
      summaryTotalAmount: weiToFiat(
        totalValue,
        conversionRate,
        currentCurrency,
      ),
    };
  }
  return [transactionElement, transactionDetails];
}

function decodeLegacySwapsTx(args) {
  const {
    swapsTransactions,
    swapsTokens,
    conversionRate,
    currentCurrency,
    primaryCurrency,
    txChainId,
    tx: {
      id,
      txParams,
      txParams: { gas, from, to },
      hash,
    },
    tx,
    contractExchangeRates,
    assetSymbol,
    chainId,
    ticker,
  } = args;
  // If the tx was a swaps smart transaction, the swapsTransactions id is the stx.uuid, rather than tx.id
  // We need use the tx.hash and look up the stx with the same hash
  const smartTransaction =
    Engine.context.SmartTransactionsController.state.smartTransactionsState.smartTransactions[
      chainId
    ]?.find((stx) => stx.txHash === hash);

  const swapTransaction =
    swapsTransactions?.[id] ||
    swapsTransactions?.[smartTransaction?.uuid] ||
    {};

  const totalGas = calculateTotalGas({
    ...txParams,
    gas: swapTransaction.gasUsed || gas,
  });
  const sourceToken = swapsTokens?.find(
    ({ address }) => address === swapTransaction?.sourceToken?.address,
  );
  const destinationToken =
    swapTransaction?.destinationToken?.swaps ||
    swapsTokens?.find(
      ({ address }) => address === swapTransaction?.destinationToken?.address,
    );
  if (!sourceToken || !destinationToken) return [undefined, undefined];

  const renderFrom = renderFullAddress(from);
  const renderTo = renderFullAddress(to);
  const totalEthGas = renderFromWei(totalGas);
  const decimalSourceAmount =
    swapTransaction.sourceAmount &&
    renderFromTokenMinimalUnit(
      swapTransaction.sourceAmount,
      swapTransaction.sourceToken.decimals,
    );
  const decimalDestinationAmount =
    swapTransaction.destinationToken.decimals &&
    renderFromTokenMinimalUnit(
      !!swapTransaction?.receivedDestinationAmount &&
        swapTransaction?.receivedDestinationAmount > 0
        ? swapTransaction.receivedDestinationAmount
        : swapTransaction.destinationAmount,
      swapTransaction.destinationToken.decimals,
    );
  let totalAmountForEthSourceTokenFormatted;
  if (sourceToken.symbol === 'ETH') {
    const totalAmountForEthSourceToken =
      Number(!isNaN(totalEthGas) ? totalEthGas : 0) +
      Number(decimalSourceAmount);
    totalAmountForEthSourceTokenFormatted = `${limitToMaximumDecimalPlaces(
      totalAmountForEthSourceToken,
    )} ${ticker}`;
  }
  const cryptoSummaryTotalAmount =
    sourceToken.symbol === 'ETH'
      ? totalAmountForEthSourceTokenFormatted
      : decimalSourceAmount
      ? `${decimalSourceAmount} ${sourceToken.symbol} + ${totalEthGas} ${ticker}`
      : `${totalEthGas} ${ticker}`;

  const isSwap = swapTransaction.action === 'swap';
  let notificationKey, actionKey, value, fiatValue;
  if (isSwap) {
    actionKey = strings('swaps.transaction_label.swap', {
      sourceToken: sourceToken.symbol,
      destinationToken: destinationToken.symbol,
    });
    notificationKey = strings(
      `swaps.notification_label.${
        tx.status === 'submitted' ? 'swap_pending' : 'swap_confirmed'
      }`,
      {
        sourceToken: sourceToken.symbol,
        destinationToken: destinationToken.symbol,
      },
    );
  } else {
    actionKey = strings('swaps.transaction_label.approve', {
      sourceToken: sourceToken.symbol,
      upTo: renderFromTokenMinimalUnit(
        swapTransaction.upTo,
        sourceToken.decimals,
      ),
    });
    notificationKey = strings(
      `swaps.notification_label.${
        tx.status === 'submitted' ? 'approve_pending' : 'approve_confirmed'
      }`,
      { sourceToken: sourceToken.symbol },
    );
  }

  const sourceExchangeRate = isSwapsNativeAsset(sourceToken)
    ? 1
    : contractExchangeRates?.[toFormattedAddress(sourceToken.address)]?.price;
  const renderSourceTokenFiatNumber = balanceToFiatNumber(
    decimalSourceAmount,
    conversionRate,
    sourceExchangeRate,
  );

  const destinationExchangeRate = isSwapsNativeAsset(destinationToken)
    ? 1
    : contractExchangeRates?.[toFormattedAddress(destinationToken.address)]
        ?.price;
  const renderDestinationTokenFiatNumber = balanceToFiatNumber(
    decimalDestinationAmount,
    conversionRate,
    destinationExchangeRate,
  );

  if (isSwap) {
    if (!assetSymbol || sourceToken.symbol === assetSymbol) {
      value = `-${decimalSourceAmount} ${sourceToken.symbol}`;
      fiatValue = addCurrencySymbol(
        renderSourceTokenFiatNumber,
        currentCurrency,
      );
    } else {
      value = `+${decimalDestinationAmount} ${destinationToken.symbol}`;
      fiatValue = addCurrencySymbol(
        renderDestinationTokenFiatNumber,
        currentCurrency,
      );
    }
  }
  const transactionElement = {
    renderTo,
    renderFrom,
    actionKey,
    notificationKey,
    value,
    fiatValue,
    transactionType: isSwap
      ? TRANSACTION_TYPES.SITE_INTERACTION
      : TRANSACTION_TYPES.APPROVE,
  };

  let transactionDetails = {
    renderFrom,
    renderTo,
    hash,
    renderValue: decimalSourceAmount
      ? `${decimalSourceAmount} ${sourceToken.symbol}`
      : `0 ${ticker}`,
    renderGas: parseInt(gas, 16),
    renderGasPrice: renderGwei(txParams),
    renderTotalGas: `${totalEthGas} ${ticker}`,
    txChainId,
  };

  if (primaryCurrency === 'ETH') {
    transactionDetails = {
      ...transactionDetails,
      summaryAmount: isSwap
        ? `${decimalSourceAmount} ${sourceToken.symbol}`
        : `0 ${ticker}`,
      summaryFee: `${totalEthGas} ${ticker}`,
      summaryTotalAmount: cryptoSummaryTotalAmount,
      summarySecondaryTotalAmount: addCurrencySymbol(
        renderSourceTokenFiatNumber + weiToFiatNumber(totalGas, conversionRate),
        currentCurrency,
      ),
    };
  } else {
    transactionDetails = {
      ...transactionDetails,
      summaryAmount: addCurrencySymbol(
        renderSourceTokenFiatNumber,
        currentCurrency,
      ),
      summaryFee: weiToFiat(totalGas, conversionRate, currentCurrency),
      summaryTotalAmount: addCurrencySymbol(
        renderSourceTokenFiatNumber + weiToFiatNumber(totalGas, conversionRate),
        currentCurrency,
      ),
      summarySecondaryTotalAmount: cryptoSummaryTotalAmount,
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
  const { tx, selectedAddress, chainId, swapsTransactions = {}, ticker } = args;
  const chainIdToUse = tx.chainId || chainId;
  const { isTransfer } = tx || {};

  const actionKey = await getActionKey(
    tx,
    selectedAddress,
    ticker,
    chainIdToUse,
  );
  let transactionElement, transactionDetails;

  if (args.bridgeTxHistoryData?.bridgeTxHistoryItem) {
    // Unified Swaps, reads tx data from BridgeStatusController
    if (tx.type === TransactionType.swap) {
      const [transactionElement, transactionDetails] = decodeSwapsTx({
        ...args,
        actionKey,
      });
      return [transactionElement, transactionDetails];
    }
    if (tx.type === TransactionType.bridge) {
      const [transactionElement, transactionDetails] = decodeBridgeTx({
        ...args,
        actionKey,
      });
      return [transactionElement, transactionDetails];
    }
  }

  if (
    tx.txParams.to?.toLowerCase() === getSwapsContractAddress(chainIdToUse) ||
    swapsTransactions[tx.id]
  ) {
    // Legacy Swaps, reads tx data from SwapsController
    const [transactionElement, transactionDetails] = decodeLegacySwapsTx({
      ...args,
      actionKey,
    });

    if (transactionElement && transactionDetails)
      return [transactionElement, transactionDetails];
  }
  if (isTransfer) {
    [transactionElement, transactionDetails] = decodeIncomingTransfer({
      ...args,
      actionKey,
    });
  } else {
    switch (actionKey) {
      case strings('transactions.sent_tokens'):
        [transactionElement, transactionDetails] = await decodeTransferTx({
          ...args,
          actionKey,
        });
        break;
      case strings('transactions.sent_collectible'):
        [transactionElement, transactionDetails] = decodeTransferFromTx({
          ...args,
          actionKey,
        });
        break;
      case strings('transactions.contract_deploy'):
        [transactionElement, transactionDetails] = decodeDeploymentTx({
          ...args,
          actionKey,
        });
        break;
      default:
        [transactionElement, transactionDetails] = decodeConfirmTx({
          ...args,
          actionKey,
        });
    }
  }
  return [transactionElement, transactionDetails];
}

export const TOKEN_CATEGORY_HASH = {
  [TransactionType.tokenMethodApprove]: true,
  [TransactionType.tokenMethodSetApprovalForAll]: true,
  [TransactionType.tokenMethodTransfer]: true,
  [TransactionType.tokenMethodTransferFrom]: true,
  [TransactionType.tokenMethodIncreaseAllowance]: true,
};
