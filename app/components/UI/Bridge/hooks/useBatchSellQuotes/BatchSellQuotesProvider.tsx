import React, { createContext, useContext, useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { CaipAssetType } from '@metamask/utils';

import { selectShouldUseSmartTransaction } from '../../../../../selectors/smartTransactionsController';
import { getMaybeHexChainId } from '../../../../../util/bridge';
import type { RootState } from '../../../../../reducers';
import {
  BridgeQuotesProvider,
  useBridgeQuotesContext,
} from '../useBridgeQuotes/BridgeQuotesProvider';
import { useBridgeQuotes } from '../useBridgeQuotes';
import { buildBatchSellQuoteRows, useBatchSellQuotes } from './index';

const BatchSellQuotesContext = createContext<ReturnType<
  typeof useBatchSellQuotes
> | null>(null);

function CollectBridgeQuote({
  assetId,
  rows,
  index,
  quotesByAssetId,
  children,
}: {
  assetId: CaipAssetType;
  rows: ReturnType<typeof buildBatchSellQuoteRows>;
  index: number;
  quotesByAssetId: Partial<
    Record<CaipAssetType, ReturnType<typeof useBridgeQuotes>>
  >;
  children: (
    quotesByAssetId: Partial<
      Record<CaipAssetType, ReturnType<typeof useBridgeQuotes>>
    >,
  ) => React.ReactNode;
}) {
  const result = useBridgeQuotesContext();

  return (
    <NestBridgeQuotes
      rows={rows}
      index={index + 1}
      quotesByAssetId={{ ...quotesByAssetId, [assetId]: result }}
    >
      {children}
    </NestBridgeQuotes>
  );
}

function NestBridgeQuotes({
  rows,
  index,
  quotesByAssetId,
  children,
}: {
  rows: ReturnType<typeof buildBatchSellQuoteRows>;
  index: number;
  quotesByAssetId: Partial<
    Record<CaipAssetType, ReturnType<typeof useBridgeQuotes>>
  >;
  children: (
    quotesByAssetId: Partial<
      Record<CaipAssetType, ReturnType<typeof useBridgeQuotes>>
    >,
  ) => React.ReactNode;
}) {
  if (index >= rows.length) {
    return children(quotesByAssetId);
  }

  const row = rows[index];

  return (
    <BridgeQuotesProvider config={row.config} managedRequest>
      <CollectBridgeQuote
        assetId={row.assetId}
        rows={rows}
        index={index}
        quotesByAssetId={quotesByAssetId}
      >
        {children}
      </CollectBridgeQuote>
    </BridgeQuotesProvider>
  );
}

const BatchSellQuotesValueProvider = ({
  config,
  quotesByAssetId,
  orderedAssetIds,
  children,
}: {
  config: Parameters<typeof useBatchSellQuotes>[0]['config'];
  quotesByAssetId: Partial<
    Record<CaipAssetType, ReturnType<typeof useBridgeQuotes>>
  >;
  orderedAssetIds: CaipAssetType[];
  children?: React.ReactNode;
}) => {
  const value = useBatchSellQuotes({
    config,
    quotesByAssetId,
    orderedAssetIds,
  });

  return (
    <BatchSellQuotesContext.Provider value={value}>
      {children}
    </BatchSellQuotesContext.Provider>
  );
};

export const BatchSellQuotesProvider = ({
  config,
  children,
}: {
  config: Parameters<typeof useBatchSellQuotes>[0]['config'];
  children?: React.ReactNode;
}) => {
  const batchSellChainId = getMaybeHexChainId(config.sourceTokens[0]?.chainId);
  const smartTransactionsEnabled = useSelector((state: RootState) =>
    selectShouldUseSmartTransaction(state, batchSellChainId),
  );
  const rows = useMemo(
    () =>
      buildBatchSellQuoteRows({
        sourceTokens: config.sourceTokens,
        destToken: config.destToken,
        sourceTokenAmounts: config.sourceTokenAmounts,
        slippages: config.slippages,
        walletAddress: config.walletAddress,
        smartTransactionsEnabled,
        latestSourceAtomicBalances: config.latestSourceAtomicBalances,
      }),
    [
      config.destToken,
      config.slippages,
      config.sourceTokenAmounts,
      config.sourceTokens,
      config.walletAddress,
      config.latestSourceAtomicBalances,
      smartTransactionsEnabled,
    ],
  );
  const orderedAssetIds = useMemo(() => rows.map((row) => row.assetId), [rows]);

  return (
    <NestBridgeQuotes rows={rows} index={0} quotesByAssetId={{}}>
      {(quotesByAssetId) => (
        <BatchSellQuotesValueProvider
          config={config}
          quotesByAssetId={quotesByAssetId}
          orderedAssetIds={orderedAssetIds}
        >
          {children}
        </BatchSellQuotesValueProvider>
      )}
    </NestBridgeQuotes>
  );
};

export const useBatchSellQuotesContext = () => {
  const context = useContext(BatchSellQuotesContext);

  if (!context) {
    throw new Error(
      'useBatchSellQuotesContext must be used within BatchSellQuotesProvider',
    );
  }

  return context;
};
