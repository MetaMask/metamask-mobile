import {
  formatChainIdToCaip,
  formatChainIdToHex,
  isNonEvmChainId,
} from '@metamask/bridge-controller';
import { Transaction } from '@metamask/keyring-api';
import {
  BridgeHistoryItem,
  MAX_ATTEMPTS,
} from '@metamask/bridge-status-controller';
import { NETWORK_TO_SHORT_NETWORK_NAME_MAP } from '../../../../constants/bridge';
import { strings } from '../../../../../locales/i18n';
import { TransactionMeta } from '@metamask/transaction-controller';
import { TRANSACTION_TYPES } from '../../../../util/transactions';
import { calculateTotalGas } from '../../TransactionElement/utils-gas';
import {
  renderFromWei,
  addCurrencySymbol,
  balanceToFiatNumber,
  weiToFiatNumber,
  weiToFiat,
  formatAmountWithThreshold,
} from '../../../../util/number';
import { Hex } from '@metamask/utils';
import { ethers } from 'ethers';
import { toFormattedAddress } from '../../../../util/address';
import Routes from '../../../../constants/navigation/Routes';
import { NavigationProp } from '@react-navigation/native';
import { RootParamList } from '../../../../types/navigation';
import Engine from '../../../../core/Engine';

export const getSwapBridgeTxActivityTitle = (
  bridgeTxHistoryItem: BridgeHistoryItem,
): string | undefined => {
  const { quote } = bridgeTxHistoryItem;

  // Swap
  const isSwap = quote.srcAsset.chainId === quote.destAsset.chainId;
  if (isSwap) {
    return strings('swaps.transaction_label.swap', {
      sourceToken: quote.srcAsset.symbol,
      destinationToken: quote.destAsset.symbol,
    });
  }

  // Bridge
  const destChainId = isNonEvmChainId(quote.destChainId)
    ? formatChainIdToCaip(quote.destChainId)
    : formatChainIdToHex(quote.destChainId);
  const destChainName = NETWORK_TO_SHORT_NETWORK_NAME_MAP[destChainId];
  return destChainName
    ? strings('bridge_transaction_details.bridge_to_chain', {
        chainName: destChainName,
      })
    : undefined;
};

export const decodeBridgeTx = (args: {
  tx: TransactionMeta;
  currentCurrency: string;
  conversionRate: number; // gas token to current currency rate
  bridgeTxHistoryData: { bridgeTxHistoryItem: BridgeHistoryItem };
  contractExchangeRates: Record<string, { price: number }>; // token to gas token rate
}) => {
  const {
    tx,
    currentCurrency,
    contractExchangeRates,
    conversionRate,
    bridgeTxHistoryData,
  } = args;

  const { bridgeTxHistoryItem } = bridgeTxHistoryData;
  const { quote } = bridgeTxHistoryItem;

  const sourceTokenSymbol = quote.srcAsset?.symbol;
  const rawSourceAmount = parseFloat(
    ethers.utils.formatUnits(
      bridgeTxHistoryItem.quote.srcTokenAmount,
      quote.srcAsset.decimals,
    ),
  );
  const sourceAmountSent = formatAmountWithThreshold(rawSourceAmount, 5);

  const renderTo = tx.txParams.to;
  const renderFrom = tx.txParams.from;

  const isNativeAsset = quote.srcAsset.address === ethers.constants.AddressZero;
  const sourceExchangeRate = isNativeAsset
    ? 1
    : contractExchangeRates?.[toFormattedAddress(quote.srcAsset.address)]
        ?.price;
  const sourceAmountFiatNumber = balanceToFiatNumber(
    rawSourceAmount,
    conversionRate,
    sourceExchangeRate,
  );
  const sourceAmountFiatValue = addCurrencySymbol(
    sourceAmountFiatNumber,
    currentCurrency,
  );

  const transactionElement = {
    renderTo,
    renderFrom,
    actionKey: getSwapBridgeTxActivityTitle(bridgeTxHistoryItem),
    notificationKey: undefined,
    value: `-${sourceAmountSent} ${sourceTokenSymbol}`,
    fiatValue: sourceAmountFiatValue,
    transactionType: TRANSACTION_TYPES.BRIDGE_TRANSACTION,
  };

  const transactionDetails = {};

  return [transactionElement, transactionDetails];
};

export const decodeSwapsTx = (args: {
  tx: TransactionMeta;
  currentCurrency: string;
  conversionRate: number; // gas token to current currency rate
  bridgeTxHistoryData: { bridgeTxHistoryItem: BridgeHistoryItem };
  txChainId: Hex;
  ticker: string; // the gas token symbol
  contractExchangeRates: Record<string, { price: number }>; // token to gas token rate
  primaryCurrency: string; // Settings > General > Primary Currency
}) => {
  const {
    tx,
    txChainId,
    ticker: gasTokenSymbol,
    currentCurrency,
    contractExchangeRates,
    conversionRate,
    primaryCurrency,
    bridgeTxHistoryData,
  } = args;

  const { bridgeTxHistoryItem } = bridgeTxHistoryData;
  const { quote } = bridgeTxHistoryItem;

  const sourceTokenSymbol = quote.srcAsset?.symbol;
  const destTokenSymbol = quote.destAsset?.symbol;
  const rawSourceAmount = parseFloat(
    ethers.utils.formatUnits(
      bridgeTxHistoryItem.quote.srcTokenAmount,
      quote.srcAsset.decimals,
    ),
  );
  const sourceAmountSent = formatAmountWithThreshold(rawSourceAmount, 5);

  const renderTo = tx.txParams.to;
  const renderFrom = tx.txParams.from;

  const totalGas = calculateTotalGas({
    ...tx.txParams,
    gas: tx.txParams.gas || '0x0',
  });
  const totalGasDecimalAmount = renderFromWei(totalGas);

  const isNativeAsset = quote.srcAsset.address === ethers.constants.AddressZero;
  const sourceExchangeRate = isNativeAsset
    ? 1
    : contractExchangeRates?.[toFormattedAddress(quote.srcAsset.address)]
        ?.price;
  const sourceAmountFiatNumber = balanceToFiatNumber(
    rawSourceAmount,
    conversionRate,
    sourceExchangeRate,
  );
  const sourceAmountFiatValue = addCurrencySymbol(
    sourceAmountFiatNumber,
    currentCurrency,
  );

  const transactionElement = {
    renderTo,
    renderFrom,
    actionKey: strings('swaps.transaction_label.swap', {
      sourceToken: sourceTokenSymbol,
      destinationToken: destTokenSymbol,
    }),
    notificationKey: strings(
      `swaps.notification_label.${
        tx.status === 'submitted' ? 'swap_pending' : 'swap_confirmed'
      }`,
      {
        sourceToken: sourceTokenSymbol,
        destinationToken: destTokenSymbol,
      },
    ),
    value: `${sourceAmountSent} ${sourceTokenSymbol}`,
    fiatValue: sourceAmountFiatValue,
    transactionType: TRANSACTION_TYPES.SWAPS_TRANSACTION,
  };

  const summaryTotalAmountNativeToken = `${
    rawSourceAmount + Number(totalGasDecimalAmount)
  } ${gasTokenSymbol}`;
  const summaryTotalAmountNativeTokenFiat = addCurrencySymbol(
    sourceAmountFiatNumber + weiToFiatNumber(totalGas, conversionRate),
    currentCurrency,
  );

  const summary =
    primaryCurrency === 'ETH'
      ? {
          summaryAmount: `${sourceAmountSent} ${sourceTokenSymbol}`,
          summaryFee: `${totalGasDecimalAmount} ${gasTokenSymbol}`,
          summaryTotalAmount: summaryTotalAmountNativeToken,
          summarySecondaryTotalAmount: summaryTotalAmountNativeTokenFiat,
        }
      : {
          summaryAmount: addCurrencySymbol(
            sourceAmountFiatNumber,
            currentCurrency,
          ),
          summaryFee: weiToFiat(totalGas, conversionRate, currentCurrency),
          summaryTotalAmount: summaryTotalAmountNativeTokenFiat,
          summarySecondaryTotalAmount: summaryTotalAmountNativeToken,
        };

  const transactionDetails = {
    renderFrom,
    renderTo,
    hash: tx.hash,
    renderValue: `${sourceAmountSent} ${sourceTokenSymbol}`,
    renderGas: parseInt(tx.txParams.gas || '0', 16),
    renderGasPrice: tx.txParams.gasPrice,
    renderTotalGas: `${totalGasDecimalAmount} ${gasTokenSymbol}`,
    txChainId,
    ...summary,
  };

  return [transactionElement, transactionDetails];
};

export const handleUnifiedSwapsTxHistoryItemClick = ({
  navigation,
  evmTxMeta,
  multiChainTx,
  bridgeTxHistoryItem,
}: {
  navigation: NavigationProp<RootParamList>;
  evmTxMeta?: TransactionMeta;
  multiChainTx?: Transaction;
  bridgeTxHistoryItem?: BridgeHistoryItem;
}) => {
  navigation.navigate(Routes.BRIDGE.BRIDGE_TRANSACTION_DETAILS, {
    evmTxMeta,
    multiChainTx,
  });

  // Reset attempts if the bridge transaction has reached the max attempts and user has clicked on the transaction
  if (bridgeTxHistoryItem) {
    const { quote, attempts } = bridgeTxHistoryItem;
    const isBridge = quote.srcAsset.chainId !== quote.destAsset.chainId;

    if (isBridge && attempts && attempts.counter >= MAX_ATTEMPTS) {
      Engine.context.BridgeStatusController.restartPollingForFailedAttempts({
        txMetaId: bridgeTxHistoryItem.txMetaId,
      });
    }
  }
};
