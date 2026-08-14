import React from 'react';
import { BigNumber } from 'ethers';
import { formatAddressToAssetId } from '@metamask/bridge-controller';
import type { CaipAssetType } from '@metamask/utils';

import '../../_mocks_/initialState';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { createBridgeTestState } from '../../testUtils';
import type { BridgeToken } from '../../types';
// eslint-disable-next-line import-x/no-namespace -- read the same spies the runner installs
import * as bridgeSlice from '../../../../../core/redux/slices/bridge';
import {
  BatchSellQuotesProvider,
  useBatchSellQuotesContext,
} from './BatchSellQuotesProvider';
import { useBatchSellQuoteData } from '../useBatchSellQuoteData';
import { runBatchSellQuoteDataCases } from '../quoteTestCases/runBatchSellQuoteDataCases';

jest.mock('../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      BridgeController: {
        state: {
          batchSellTrades: undefined,
          batchSellTradesLoadingStatus: undefined,
          quotesLoadingStatus: undefined,
        },
        updateBatchSellTrades: jest.fn().mockResolvedValue(undefined),
        updateBridgeQuoteRequestParams: jest.fn().mockResolvedValue(undefined),
        resetState: jest.fn(),
      },
      KeyringController: {
        state: {
          keyrings: [
            {
              accounts: ['0x1234567890123456789012345678901234567890'],
              type: 'HD Key Tree',
              metadata: {
                id: '01JKZ55Y6KPCYH08M6B9VSZWKW',
                name: '',
              },
            },
          ],
        },
      },
      NetworkController: {
        findNetworkClientIdByChainId: jest.fn(() => 'mainnet'),
        getNetworkClientById: jest.fn(() => ({
          configuration: {
            chainId: '0x1',
          },
        })),
      },
    },
  },
}));

jest.mock('../../../../../util/bridge/hooks/useValidateBridgeTx', () => ({
  __esModule: true,
  default: () => ({
    validateBridgeTx: jest.fn().mockResolvedValue({ status: 'SUCCESS' }),
  }),
}));

jest.mock('../../../../../selectors/currencyRateController', () => ({
  ...jest.requireActual('../../../../../selectors/currencyRateController'),
  selectCurrentCurrency: jest.fn(() => 'USD'),
}));

jest.mock('../../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    log: jest.fn(),
  },
}));

const Probe = ({
  onValue,
}: {
  onValue: (value: ReturnType<typeof useBatchSellQuotesContext>) => void;
}) => {
  onValue(useBatchSellQuotesContext());
  return null;
};

const emptyState = {} as never;

const mapToLegacyBatchSellQuoteData = (
  value: ReturnType<typeof useBatchSellQuotesContext>,
  sourceTokens: BridgeToken[],
) => ({
  ...value,
  tokenData: Object.fromEntries(
    sourceTokens.flatMap((token) => {
      const assetId = formatAddressToAssetId(token.address, token.chainId);
      if (!assetId) return [];
      const row = value.quotesByAssetId[assetId];
      return [
        [
          assetId,
          {
            key: assetId,
            tokenSymbol: token.symbol,
            quote: row?.recommendedQuote ?? null,
            receivedAmount: row?.formattedQuoteData?.receivedAmount,
            receivedAmountFiat: row?.formattedQuoteData?.receivedAmountFiat,
            isLoading: row?.isLoading ?? false,
            isHighPriceImpact: row?.shouldShowPriceImpactWarning ?? false,
            isQuoteUnavailable: row?.isNoQuotesAvailable ?? false,
          },
        ],
      ];
    }),
  ),
});

runBatchSellQuoteDataCases(() => {
  const sourceTokens = bridgeSlice.selectBatchSellSourceTokens(emptyState);
  const destToken = bridgeSlice.selectBatchSellDestToken(emptyState);
  const sourceTokenAmounts =
    bridgeSlice.selectBatchSellSourceTokenAmounts(emptyState);
  const slippages = bridgeSlice.selectBatchSellSlippages(emptyState);
  const latestSourceAtomicBalances = sourceTokens.reduce<
    Partial<Record<CaipAssetType, BigNumber | undefined>>
  >((balances, token) => {
    const assetId = formatAddressToAssetId(token.address, token.chainId);
    if (assetId) {
      balances[assetId] = BigNumber.from('10000000000000000000');
    }
    return balances;
  }, {});
  const box: { current: ReturnType<typeof useBatchSellQuoteData> } = {
    current: undefined as never,
  };

  renderWithProvider(
    <BatchSellQuotesProvider
      config={{
        sourceTokens,
        destToken,
        sourceTokenAmounts,
        slippages,
        walletAddress: '0x1234567890123456789012345678901234567890',
        latestSourceAtomicBalances,
      }}
    >
      <Probe
        onValue={(value) => {
          box.current = mapToLegacyBatchSellQuoteData(
            value,
            sourceTokens,
          ) as unknown as ReturnType<typeof useBatchSellQuoteData>;
        }}
      />
    </BatchSellQuotesProvider>,
    { state: createBridgeTestState() },
    false,
  );

  return { result: box };
}, { implementation: 'copied' });
