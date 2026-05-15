import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { debounce } from 'lodash';
import BigNumber from 'bignumber.js';
import {
  formatAddressToCaipReference,
  type GenericQuoteRequest,
} from '@metamask/bridge-controller';

import Engine from '../../../../../core/Engine';
import {
  selectBatchSellDestToken,
  selectBatchSellSlippages,
  selectBatchSellSourceTokenAmounts,
  selectBatchSellSourceTokens,
} from '../../../../../core/redux/slices/bridge';
import {
  selectGasIncludedQuoteParams,
  selectSourceWalletAddress,
} from '../../../../../selectors/bridge';
import { selectShouldUseSmartTransaction } from '../../../../../selectors/smartTransactionsController';
import { getDecimalChainId } from '../../../../../util/networks';
import type { BridgeToken } from '../../types';
import { getBatchSellSlippage } from '../../components/SlippageModal/utils';
import { getBridgeTokenAssetId } from '../../utils/tokenUtils';
import { getSecurityWarnings } from '../../utils/tokenSecurityUtils';

export const BATCH_SELL_QUOTE_DEBOUNCE_MS = 300;

interface BuildBatchSellQuoteRequestsParams {
  batchSellSlippages: ReturnType<typeof selectBatchSellSlippages>;
  batchSellSourceTokenAmounts: ReturnType<
    typeof selectBatchSellSourceTokenAmounts
  >;
  destToken: BridgeToken | undefined;
  gasIncluded: boolean;
  gasIncluded7702: boolean;
  selectedTokens: BridgeToken[];
  walletAddress: string | undefined;
}

type BatchSellQuoteContext = Parameters<
  typeof Engine.context.BridgeController.updateBridgeQuoteRequestParams
>[1];

export function getBatchSellTokenKey(token: BridgeToken) {
  return `${token.chainId}:${token.address}`;
}

export function getBatchSellSourceTokenAmount(
  token: BridgeToken,
  percent: number,
) {
  if (percent <= 0) return '0';
  if (!token.balance) return undefined;

  const sourceAmount = new BigNumber(token.balance).times(percent).div(100);

  if (!sourceAmount.isFinite()) return undefined;

  return sourceAmount.toFixed();
}

export function getBatchSellAtomicSourceAmount(
  token: BridgeToken,
  sourceAmount: string | undefined,
) {
  if (!sourceAmount) return undefined;

  const atomicAmount = new BigNumber(sourceAmount)
    .times(new BigNumber(10).pow(token.decimals))
    .integerValue(BigNumber.ROUND_DOWN);

  if (!atomicAmount.isFinite() || atomicAmount.lte(0)) return undefined;

  return atomicAmount.toFixed(0);
}

export function buildBatchSellQuoteRequests({
  batchSellSlippages,
  batchSellSourceTokenAmounts,
  destToken,
  gasIncluded,
  gasIncluded7702,
  selectedTokens,
  walletAddress,
}: BuildBatchSellQuoteRequestsParams) {
  if (!destToken || !walletAddress) return [];

  return selectedTokens.reduce<GenericQuoteRequest[]>(
    (quoteRequests, token) => {
      const assetId = getBridgeTokenAssetId(token);
      const sourceAmount = assetId
        ? batchSellSourceTokenAmounts[assetId]
        : undefined;
      const srcTokenAmount = getBatchSellAtomicSourceAmount(
        token,
        sourceAmount,
      );

      if (!assetId || !srcTokenAmount) return quoteRequests;

      const slippage = getBatchSellSlippage(batchSellSlippages, assetId);
      const slippageNumber =
        slippage === undefined ? undefined : Number(slippage);

      quoteRequests.push({
        srcChainId: getDecimalChainId(token.chainId),
        srcTokenAddress: formatAddressToCaipReference(token.address),
        destChainId: getDecimalChainId(destToken.chainId),
        destTokenAddress: formatAddressToCaipReference(destToken.address),
        srcTokenAmount,
        slippage:
          slippageNumber === undefined || Number.isNaN(slippageNumber)
            ? undefined
            : slippageNumber,
        walletAddress,
        destWalletAddress: walletAddress,
        gasIncluded,
        gasIncluded7702,
      });

      return quoteRequests;
    },
    [],
  );
}

async function updateBatchSellQuoteRequests(
  quoteRequests: GenericQuoteRequest[],
  context: BatchSellQuoteContext,
) {
  if (quoteRequests.length === 0) return;

  for (let index = 0; index < quoteRequests.length; index += 1) {
    await Engine.context.BridgeController.updateBridgeQuoteRequestParams(
      quoteRequests[index],
      context,
      index,
      quoteRequests.length,
    );
  }
}

export function useBatchSellQuoteRequest() {
  const selectedTokens = useSelector(selectBatchSellSourceTokens);
  const batchSellSourceTokenAmounts = useSelector(
    selectBatchSellSourceTokenAmounts,
  );
  const destToken = useSelector(selectBatchSellDestToken);
  const batchSellSlippages = useSelector(selectBatchSellSlippages);
  const walletAddress = useSelector(selectSourceWalletAddress);
  const { gasIncluded, gasIncluded7702 } = useSelector(
    selectGasIncludedQuoteParams,
  );
  const smartTransactionsEnabled = useSelector(selectShouldUseSmartTransaction);

  const quoteRequests = useMemo(
    () =>
      buildBatchSellQuoteRequests({
        batchSellSlippages,
        batchSellSourceTokenAmounts,
        destToken,
        gasIncluded,
        gasIncluded7702,
        selectedTokens,
        walletAddress,
      }),
    [
      batchSellSlippages,
      batchSellSourceTokenAmounts,
      destToken,
      gasIncluded,
      gasIncluded7702,
      selectedTokens,
      walletAddress,
    ],
  );

  const context = useMemo<BatchSellQuoteContext>(() => {
    const usdAmountSource = selectedTokens.reduce((totalUsdValue, token) => {
      const assetId = getBridgeTokenAssetId(token);
      const sourceAmount = assetId
        ? batchSellSourceTokenAmounts[assetId]
        : undefined;
      const balance = token.balance ? Number(token.balance) : 0;

      if (!sourceAmount || balance <= 0) return totalUsdValue;

      return (
        totalUsdValue +
        ((token.tokenFiatAmount ?? 0) * Number(sourceAmount)) / balance
      );
    }, 0);

    return {
      stx_enabled: smartTransactionsEnabled,
      token_symbol_source: selectedTokens
        .map((token) => token.symbol)
        .join(','),
      token_symbol_destination: destToken?.symbol ?? '',
      token_security_type_destination: destToken?.securityData?.type ?? null,
      security_warnings: getSecurityWarnings(destToken),
      usd_amount_source: usdAmountSource,
    };
  }, [
    batchSellSourceTokenAmounts,
    destToken,
    selectedTokens,
    smartTransactionsEnabled,
  ]);

  const updateQuoteParams = useCallback(
    () => updateBatchSellQuoteRequests(quoteRequests, context),
    [context, quoteRequests],
  );

  return useMemo(
    () => debounce(updateQuoteParams, BATCH_SELL_QUOTE_DEBOUNCE_MS),
    [updateQuoteParams],
  );
}
