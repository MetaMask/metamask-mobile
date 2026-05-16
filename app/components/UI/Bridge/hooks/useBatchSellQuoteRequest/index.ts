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
  selectBatchSellSourceWalletAddress,
  selectGasIncludedQuoteParams,
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
  sourceTokens: BridgeToken[];
  walletAddress: string | undefined;
}

type BatchSellQuoteContext = Parameters<
  typeof Engine.context.BridgeController.updateBridgeQuoteRequestParams
>[1];

interface BatchSellQuoteRequestEntry {
  quoteRequest: GenericQuoteRequest;
  sourceAmount: string;
  sourceToken: BridgeToken;
}

interface BatchSellQuoteRequestData {
  quoteRequest: GenericQuoteRequest;
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

function getBatchSellUsdAmountSource(token: BridgeToken, sourceAmount: string) {
  const balance = token.balance ? Number(token.balance) : 0;
  const numericSourceAmount = Number(sourceAmount);

  if (!Number.isFinite(numericSourceAmount) || balance <= 0) return 0;

  return ((token.tokenFiatAmount ?? 0) * numericSourceAmount) / balance;
}

function buildBatchSellQuoteRequestEntries({
  batchSellSlippages,
  batchSellSourceTokenAmounts,
  destToken,
  gasIncluded,
  gasIncluded7702,
  sourceTokens,
  walletAddress,
}: BuildBatchSellQuoteRequestsParams) {
  if (!destToken || !walletAddress) return [];

  return sourceTokens.reduce<BatchSellQuoteRequestEntry[]>(
    (quoteRequestEntries, sourceToken) => {
      const assetId = getBridgeTokenAssetId(sourceToken);
      const sourceAmount = assetId
        ? batchSellSourceTokenAmounts[assetId]
        : undefined;
      const srcTokenAmount = getBatchSellAtomicSourceAmount(
        sourceToken,
        sourceAmount,
      );

      if (!assetId || !sourceAmount || !srcTokenAmount)
        return quoteRequestEntries;

      const slippage = getBatchSellSlippage(batchSellSlippages, assetId);
      const slippageNumber =
        slippage === undefined ? undefined : Number(slippage);

      quoteRequestEntries.push({
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
          gasIncluded,
          gasIncluded7702,
        },
        sourceAmount,
        sourceToken,
      });

      return quoteRequestEntries;
    },
    [],
  );
}

export function buildBatchSellQuoteRequests(
  params: BuildBatchSellQuoteRequestsParams,
) {
  return buildBatchSellQuoteRequestEntries(params).map(
    ({ quoteRequest }) => quoteRequest,
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
  const { gasIncluded, gasIncluded7702 } = useSelector(
    selectGasIncludedQuoteParams,
  );
  const smartTransactionsEnabled = useSelector(selectShouldUseSmartTransaction);

  const quoteRequestData = useMemo(() => {
    if (!destToken) return [];

    const quoteRequestEntries = buildBatchSellQuoteRequestEntries({
      batchSellSlippages,
      batchSellSourceTokenAmounts,
      destToken,
      gasIncluded,
      gasIncluded7702,
      sourceTokens,
      walletAddress,
    });
    const securityWarnings = getSecurityWarnings(destToken);

    return quoteRequestEntries.map(
      ({ quoteRequest, sourceAmount, sourceToken }) => ({
        quoteRequest,
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
        },
      }),
    );
  }, [
    batchSellSlippages,
    batchSellSourceTokenAmounts,
    destToken,
    gasIncluded,
    gasIncluded7702,
    sourceTokens,
    walletAddress,
    smartTransactionsEnabled,
  ]);

  const updateQuoteParams = useCallback(
    () => updateBatchSellQuoteRequests(quoteRequestData),
    [quoteRequestData],
  );

  return useMemo(
    () => debounce(updateQuoteParams, BATCH_SELL_QUOTE_DEBOUNCE_MS),
    [updateQuoteParams],
  );
}
