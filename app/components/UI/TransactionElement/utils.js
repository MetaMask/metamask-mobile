import BN from 'bnjs4';
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
  isTransactionIncomplete,
} from '../../../util/transactions';
import Engine from '../../../core/Engine';
import { TransactionType } from '@metamask/transaction-controller';
import {
  decodeBridgeTx,
  decodeSwapsTx,
} from '../Bridge/utils/transaction-history';
import { calculateTotalGas, renderGwei } from './utils-gas';
import { getTokenTransferData } from '../../Views/confirmations/utils/transaction-pay';
import { hasTransactionType } from '../../Views/confirmations/utils/transaction';

const POSITIVE_TRANSFER_TRANSACTION_TYPES = [
  TransactionType.perpsDeposit,
  TransactionType.predictDeposit,
  TransactionType.predictWithdraw,
];

function getTokenTransfer(args) {
  const {
    tx: {
      txParams: { from, nonce },
      status,
    },
    tx,
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

  const { data, to } = getTokenTransferData(tx) ?? {};

  // Try to decode amount from transaction data
  const [, , encodedAmount] = decodeTransferData('transfer', data);
  let amount = hexToBN(encodedAmount);

  // If data is incomplete/truncated, use transferInformation if available
  if ((!encodedAmount || amount.isZero()) && tx.transferInformation?.amount) {
    // transferInformation.amount is a decimal string, not hex
    amount = new BN(tx.transferInformation.amount, 10);
  }

  const userHasToken = toFormattedAddress(to) in tokens;
  let token = userHasToken ? tokens[toFormattedAddress(to)] : null;

  // If token not in user's list but transferInformation exists, use that
  if (!token && tx.transferInformation) {
    token = {
      symbol: tx.transferInformation.symbol,
      decimals: tx.transferInformation.decimals,
      address: tx.transferInformation.contractAddress,
    };
  }

  const isIncomplete = isTransactionIncomplete(status);
  const isSent = from?.toLowerCase() === selectedAddress?.toLowerCase();

  let actionVerb;
  if (isSent) {
    actionVerb = isIncomplete
      ? strings('transactions.send')
      : strings('transactions.sent');
  } else {
    actionVerb = isIncomplete
      ? strings('transactions.receive')
      : strings('transactions.received');
  }

  const renderActionKey = token ? `${actionVerb} ${token.symbol}` : actionKey;
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
  const transactionType = isSent ? SENT_TOKEN : RECEIVED_TOKEN;

  const isPositive = hasTransactionType(
    tx,
    POSITIVE_TRANSFER_TRANSACTION_TYPES,
  );

  const signPrefix = isPositive ? '' : '- ';

  const transactionElement = {
    actionKey: renderActionKey,
    value: !renderTokenAmount
      ? strings('transaction.value_not_available')
      : renderTokenAmount,
    fiatValue:
      !!renderTokenFiatAmount && `${signPrefix}${renderTokenFiatAmount}`,
    transactionType,
    nonce,
  };

  return [transactionElement, transactionDetails];
}

function getCollectibleTransfer(args) {
  const {
    tx: {
      txParams: { from, to, data },
      status,
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

  const isIncomplete = isTransactionIncomplete(status);
  const isSent = from?.toLowerCase() === selectedAddress?.toLowerCase();

  let actionVerb;
  if (isSent) {
    actionVerb = isIncomplete
      ? strings('transactions.send')
      : strings('transactions.sent');
  } else {
    actionVerb = isIncomplete
      ? strings('transactions.receive')
      : strings('transactions.received');
  }

  let actionKey;
  const [, tokenId] = decodeTransferData('transfer', data);
  const collectible = collectibleContracts.find((collectible) =>
    areAddressesEqual(collectible.address, to),
  );
  if (collectible) {
    actionKey = `${actionVerb} ${collectible.name}`;
  } else if (isSent) {
    actionKey = isIncomplete
      ? strings('transactions.send_collectible')
      : strings('transactions.sent_collectible');
  } else {
    actionKey = isIncomplete
      ? strings('transactions.receive_collectible')
      : strings('transactions.received_collectible');
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

  const transactionType = isSent
    ? TRANSACTION_TYPES.SENT_COLLECTIBLE
    : TRANSACTION_TYPES.RECEIVED_COLLECTIBLE;

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
      transferInformation,
      hash,
    },
    tx,
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

  const { symbol, decimals, contractAddress } = transferInformation;

  // For ERC20 transfers, decode the actual recipient from the data field
  // The "to" in txParams is the token contract address, not the final recipient
  const data = tx.txParams?.data;
  const decodedData =
    data && data.length > 138 ? decodeTransferData('transfer', data) : [];

  // Determine the actual recipient:
  // 1. If we can decode from data, use that
  // 2. If transaction is incoming (from !== selectedAddress), recipient is selectedAddress
  // 3. If transaction is outgoing but data is incomplete, we fall back to txParams.to (contract address) - this is the bug!
  const isIncoming = from?.toLowerCase() !== selectedAddress?.toLowerCase();
  const actualRecipient = decodedData[0] || (isIncoming ? selectedAddress : to);

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
  const transactionType = !isIncoming ? SENT_TOKEN : RECEIVED_TOKEN;

  let transactionDetails = {
    renderTotalGas: `${renderFromWei(totalGas)} ${ticker}`,
    renderValue: renderToken,
    renderFrom: renderFullAddress(from),
    renderTo: renderFullAddress(actualRecipient),
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
    renderTo: renderFullAddress(actualRecipient),
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
    actionKey: originalActionKey,
    tx: {
      txParams,
      txParams: { from, gas },
      hash,
    },
    tx,
    txChainId,
    useOriginalActionKey,
  } = args;

  const { data, to } = getTokenTransferData(tx) ?? {};
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
  const actionKey = useOriginalActionKey
    ? originalActionKey
    : transactionElement.actionKey;
  transactionElement = {
    ...transactionElement,
    renderTo: addressTo,
    actionKey,
  };
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
      transferInformation,
    },
    txChainId,
    collectibleContracts,
    conversionRate,
    currentCurrency,
    primaryCurrency,
    selectedAddress,
    ticker,
  } = args;

  // For transferFrom transactions, prioritize decoding from data when available
  // transferInformation is used as fallback since the data may only contain the function signature
  let addressFrom, addressTo, tokenId;

  // Try to decode from data first if it's complete (4 bytes selector + 3×32 bytes params = 202 chars)
  if (data && data.length < 202 && transferInformation) {
    // Data is truncated, use transferInformation as fallback
    tokenId =
      transferInformation.tokenId ||
      transferInformation.tokenAmount ||
      transferInformation.value;
    // For direction, use txParams.from as the sender
    // Note: txParams.to is the contract, not the recipient, so we can't reliably set addressTo
    addressFrom = txParams.from;
    // We can't determine the actual recipient from truncated data
    // Use txParams for direction logic, but this won't show the correct recipient in UI
    addressTo = txParams.to;
  } else {
    // Data is complete or no transferInformation available - decode from data
    [addressFrom, addressTo, tokenId] = decodeTransferData(
      'transferFrom',
      data,
    );
  }
  const collectible = collectibleContracts?.find((collectible) =>
    areAddressesEqual(collectible.address, to),
  );
  let actionKey = args.actionKey;
  if (collectible) {
    actionKey = `${strings('transactions.sent')} ${collectible.name}`;
  }

  const totalGas = calculateTotalGas(txParams);

  // Handle cases where tokenId might be undefined or NaN
  let renderCollectible;
  if (collectible?.symbol) {
    renderCollectible =
      tokenId != null && !isNaN(Number(tokenId))
        ? `${strings('unit.token_id')}${tokenId} ${collectible.symbol}`
        : collectible.symbol;
  } else if (collectible?.name) {
    renderCollectible =
      tokenId != null && !isNaN(Number(tokenId))
        ? `${strings('unit.token_id')}${tokenId} ${collectible.name}`
        : collectible.name;
  } else {
    // Fallback: show just the contract address or generic label
    renderCollectible =
      tokenId != null && !isNaN(Number(tokenId))
        ? `${strings('unit.token_id')}${tokenId}`
        : strings('wallet.collectible');
  }

  const renderFrom = renderFullAddress(addressFrom);
  const renderTo = renderFullAddress(addressTo);

  const { SENT_COLLECTIBLE, RECEIVED_COLLECTIBLE } = TRANSACTION_TYPES;
  const transactionType =
    (addressFrom?.toLowerCase() ?? txParams.from?.toLowerCase()) ===
    selectedAddress?.toLowerCase()
      ? SENT_COLLECTIBLE
      : RECEIVED_COLLECTIBLE;

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

  // Handle value display - avoid showing #undefined or #NaN
  let displayValue;
  let displayFiatValue;

  if (tokenId != null && !isNaN(Number(tokenId))) {
    // We have a valid tokenId - show it
    displayValue = `${strings('unit.token_id')}${tokenId}`;
    displayFiatValue = collectible ? collectible.symbol : undefined;
  } else if (collectible?.name) {
    // Show collectible name
    displayValue = collectible.name;
    displayFiatValue = collectible.symbol;
  } else if (collectible?.symbol) {
    // Show collectible symbol
    displayValue = collectible.symbol;
    displayFiatValue = undefined;
  } else {
    // No tokenId or collectible info - show transaction fee
    const totalGasFee = renderFromWei(totalGas);
    displayValue =
      totalGasFee === '0' ? `0 ${ticker}` : `${totalGasFee} ${ticker}`;
    displayFiatValue = weiToFiat(totalGas, conversionRate, currentCurrency);
  }

  const transactionElement = {
    renderTo,
    renderFrom,
    actionKey,
    value: displayValue,
    fiatValue: displayFiatValue,
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
      !actionKey.includes(strings('transactions.send')) &&
      !actionKey.includes(strings('transactions.received')) &&
      !actionKey.includes(strings('transactions.receive')))
  )
    transactionType = TRANSACTION_TYPES.SITE_INTERACTION;
  else if (renderFrom?.toLowerCase() === selectedAddress?.toLowerCase())
    transactionType = TRANSACTION_TYPES.SENT;
  else if (renderTo?.toLowerCase() === selectedAddress?.toLowerCase())
    transactionType = TRANSACTION_TYPES.RECEIVED;
  else transactionType = TRANSACTION_TYPES.SITE_INTERACTION;

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

/**
 * Parse transaction with wallet information to render
 *
 * @param {*} args - Should contain tx, selectedAddress, ticker, conversionRate,
 * currentCurrency, exchangeRate, contractExchangeRates, collectibleContracts, tokens
 */
export default async function decodeTransaction(args) {
  const { tx, selectedAddress, chainId, ticker } = args;
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

  if (isTransfer) {
    [transactionElement, transactionDetails] = decodeIncomingTransfer({
      ...args,
      actionKey,
    });
  } else {
    switch (actionKey) {
      case strings('transactions.tx_review_perps_deposit'):
      case strings('transactions.tx_review_predict_deposit'):
      case strings('transactions.tx_review_predict_withdraw'):
        [transactionElement, transactionDetails] = await decodeTransferTx({
          ...args,
          actionKey,
          useOriginalActionKey: true,
        });
        break;
      case strings('transactions.sent_collectible'):
      case strings('transactions.received_collectible'):
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
      default: {
        // Check if it's a token transfer transaction (has token transfer data)
        const tokenTransferData = getTokenTransferData(tx);
        const hasTokenTransferData = !!tokenTransferData?.data;

        // Covers: "Sent {{unit}}", "Sent Ether", "Send {{unit}}", "Send Ether", "Received {{unit}}", "Received Ether", "Receive {{unit}}", "Receive Ether"
        if (
          hasTokenTransferData &&
          (actionKey.startsWith(strings('transactions.sent')) ||
            actionKey.startsWith(strings('transactions.send')) ||
            actionKey.startsWith(strings('transactions.received')) ||
            actionKey.startsWith(strings('transactions.receive')))
        ) {
          [transactionElement, transactionDetails] = await decodeTransferTx({
            ...args,
            actionKey,
            useOriginalActionKey: false,
          });
        } else {
          [transactionElement, transactionDetails] = decodeConfirmTx({
            ...args,
            actionKey,
          });
        }
        break;
      }
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
