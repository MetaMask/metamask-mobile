import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { debounce } from 'lodash';
import BigNumber from 'bignumber.js';
import {
  FeatureId,
  formatAddressToAssetId,
  formatAddressToCaipReference,
} from '@metamask/bridge-controller';

import Engine from '../../../../../core/Engine';
import {
  selectBatchSellDestToken,
  selectBatchSellSlippages,
  selectBatchSellSourceTokenAmounts,
  selectBatchSellSourceTokens,
} from '../../../../../core/redux/slices/bridge';
import { selectBatchSellSourceWalletAddress } from '../../../../../selectors/bridge';
import { selectShouldUseSmartTransaction } from '../../../../../selectors/smartTransactionsController';
import { getDecimalChainId } from '../../../../../util/networks';
import type { BridgeToken } from '../../types';
import { getBatchSellSlippage } from '../../components/SlippageModal/utils';
import { getSecurityWarnings } from '../../utils/tokenSecurityUtils';
import { RootState } from '../../../../../reducers';
import { getMaybeHexChainId } from '../../../../../util/bridge';

export const BATCH_SELL_QUOTE_DEBOUNCE_MS = 300;

interface BuildBatchSellQuoteRequestDataParams {
  batchSellSlippages: ReturnType<typeof selectBatchSellSlippages>;
  batchSellSourceTokenAmounts: ReturnType<
    typeof selectBatchSellSourceTokenAmounts
  >;
  destToken: BridgeToken | undefined;
  smartTransactionsEnabled: boolean;
  sourceTokens: BridgeToken[];
  walletAddress: string | undefined;
}

type BatchSellQuoteContext = Parameters<
  typeof Engine.context.BridgeController.updateBridgeQuoteRequestParams
>[1];
type BatchSellQuoteRequest = Parameters<
  typeof Engine.context.BridgeController.updateBridgeQuoteRequestParams
>[0];

interface BatchSellQuoteRequestData {
  quoteRequest: BatchSellQuoteRequest;
  context: BatchSellQuoteContext;
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

export function hasValidBatchSellSourceAmounts(
  sourceTokens: BridgeToken[],
  batchSellSourceTokenAmounts: Record<string, string | undefined>,
  destToken: BridgeToken | undefined,
) {
  if (!destToken) return false;

  return sourceTokens.some((token) => {
    const assetId = formatAddressToAssetId(token.address, token.chainId);

    if (!assetId) return false;

    return (
      getBatchSellAtomicSourceAmount(
        token,
        batchSellSourceTokenAmounts[assetId],
      ) !== undefined
    );
  });
}

function getBatchSellUsdAmountSource(token: BridgeToken, sourceAmount: string) {
  const balance = token.balance ? Number(token.balance) : 0;
  const numericSourceAmount = Number(sourceAmount);

  if (!Number.isFinite(numericSourceAmount) || balance <= 0) return 0;

  return ((token.tokenFiatAmount ?? 0) * numericSourceAmount) / balance;
}

export function buildBatchSellQuoteRequestData({
  batchSellSlippages,
  batchSellSourceTokenAmounts,
  destToken,
  smartTransactionsEnabled,
  sourceTokens,
  walletAddress,
}: BuildBatchSellQuoteRequestDataParams): BatchSellQuoteRequestData[] {
  if (!destToken || !walletAddress) return [];

  const securityWarnings = getSecurityWarnings(destToken);

  return sourceTokens.reduce<BatchSellQuoteRequestData[]>(
    (quoteRequestData, sourceToken) => {
      const assetId = formatAddressToAssetId(
        sourceToken.address,
        sourceToken.chainId,
      );
      const sourceAmount = assetId
        ? batchSellSourceTokenAmounts[assetId]
        : undefined;
      const srcTokenAmount = getBatchSellAtomicSourceAmount(
        sourceToken,
        sourceAmount,
      );

      if (!assetId || !sourceAmount || !srcTokenAmount) return quoteRequestData;

      const slippage = getBatchSellSlippage(batchSellSlippages, assetId);
      const slippageNumber =
        slippage === undefined ? undefined : Number(slippage);

      quoteRequestData.push({
        // The backend decides what kind of quote to return, so gasIncluded
        // and gasIncluded7702 values are ignored. No need to include them.
        quoteRequest: {
          srcChainId: getDecimalChainId(sourceToken.chainId),
          srcTokenAddress: formatAddressToCaipReference(sourceToken.address),
          destChainId: getDecimalChainId(destToken.chainId),
          destTokenAddress: formatAddressToCaipReference(destToken.address),
          srcTokenAmount,
          slippage:
            slippageNumber === undefined || Number.isNaN(slippageNumber)
              ? undefined
              : slippageNumber,
          walletAddress,
          destWalletAddress: walletAddress,
        },
        context: {
          stx_enabled: smartTransactionsEnabled,
          token_symbol_source: sourceToken.symbol,
          token_symbol_destination: destToken.symbol,
          token_security_type_destination: destToken.securityData?.type ?? null,
          security_warnings: securityWarnings,
          usd_amount_source: getBatchSellUsdAmountSource(
            sourceToken,
            sourceAmount,
          ),
          feature_id: FeatureId.BATCH_SELL,
        },
      });

      return quoteRequestData;
    },
    [],
  );
}

async function updateBatchSellQuoteRequests(
  quoteRequestData: BatchSellQuoteRequestData[],
) {
  if (quoteRequestData.length === 0) return;

  for (let index = 0; index < quoteRequestData.length; index += 1) {
    const { quoteRequest, context } = quoteRequestData[index];

    await Engine.context.BridgeController.updateBridgeQuoteRequestParams(
      quoteRequest,
      context,
      index,
      quoteRequestData.length,
    );
  }
}

export function useBatchSellQuoteRequest() {
  const sourceTokens = useSelector(selectBatchSellSourceTokens);
  const batchSellSourceTokenAmounts = useSelector(
    selectBatchSellSourceTokenAmounts,
  );
  const destToken = useSelector(selectBatchSellDestToken);
  const batchSellSlippages = useSelector(selectBatchSellSlippages);
  const walletAddress = useSelector(selectBatchSellSourceWalletAddress);
  const batchSellChainId = getMaybeHexChainId(sourceTokens[0]?.chainId);
  const smartTransactionsEnabled = useSelector((state: RootState) =>
    selectShouldUseSmartTransaction(state, batchSellChainId),
  );

  const quoteRequestData = useMemo(
    () =>
      buildBatchSellQuoteRequestData({
        batchSellSlippages,
        batchSellSourceTokenAmounts,
        destToken,
        smartTransactionsEnabled,
        sourceTokens,
        walletAddress,
      }),
    [
      batchSellSlippages,
      batchSellSourceTokenAmounts,
      destToken,
      sourceTokens,
      walletAddress,
      smartTransactionsEnabled,
    ],
  );

  const updateQuoteParams = useCallback(
    () => updateBatchSellQuoteRequests(quoteRequestData),
    [quoteRequestData],
  );

  const updateBatchSellQuoteParams = useMemo(
    () => debounce(updateQuoteParams, BATCH_SELL_QUOTE_DEBOUNCE_MS),
    [updateQuoteParams],
  );

  const getNewQuote = useCallback(() => {
    Engine.context.BridgeController?.resetState?.();
    updateBatchSellQuoteParams();
  }, [updateBatchSellQuoteParams]);

  return useMemo(
    () => ({
      updateBatchSellQuoteParams,
      getNewQuote,
    }),
    [getNewQuote, updateBatchSellQuoteParams],
  );
}
