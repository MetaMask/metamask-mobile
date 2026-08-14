import React from 'react';
import { BigNumber } from 'ethers';
import { formatAddressToAssetId } from '@metamask/bridge-controller';
import type { CaipAssetType } from '@metamask/utils';

import '../../_mocks_/initialState';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import type { BridgeToken } from '../../types';
import { BRIDGE_QUOTES_DEBOUNCE_MS } from '../useBridgeQuotes';
import {
  buildBatchSellQuoteRows,
  getBatchSellAtomicSourceAmount,
  getBatchSellSourceTokenAmount,
  hasValidBatchSellSourceAmounts,
} from './index';
import {
  BatchSellQuotesProvider,
  useBatchSellQuotesContext,
} from './BatchSellQuotesProvider';
import {
  mockBatchSellQuoteRequestEnv,
  runBatchSellQuoteRequestCases,
} from '../quoteTestCases/runBatchSellQuoteRequestCases';

jest.mock('../../../../../core/Engine', () => ({
  context: {
    BridgeController: {
      updateBridgeQuoteRequestParams: jest.fn().mockResolvedValue(undefined),
      updateBatchSellTrades: jest.fn().mockResolvedValue(undefined),
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
}));

jest.mock('../../../../../util/bridge/hooks/useValidateBridgeTx', () => ({
  __esModule: true,
  default: () => ({
    validateBridgeTx: jest.fn().mockResolvedValue({ status: 'SUCCESS' }),
  }),
}));

jest.mock('../../../../../selectors/bridge', () => ({
  ...jest.requireActual('../../../../../selectors/bridge'),
  selectBatchSellSourceWalletAddress: jest.fn(
    () => mockBatchSellQuoteRequestEnv.walletAddress,
  ),
}));

jest.mock('../../../../../selectors/smartTransactionsController', () => ({
  ...jest.requireActual(
    '../../../../../selectors/smartTransactionsController',
  ),
  selectShouldUseSmartTransaction: jest.fn(
    () => mockBatchSellQuoteRequestEnv.smartTransactionsEnabled,
  ),
}));

const Probe = ({
  onValue,
}: {
  onValue: (value: ReturnType<typeof useBatchSellQuotesContext>) => void;
}) => {
  onValue(useBatchSellQuotesContext());
  return null;
};

runBatchSellQuoteRequestCases({
  implementation: 'copied',
  debounceMs: BRIDGE_QUOTES_DEBOUNCE_MS,
  helpers: {
    getBatchSellSourceTokenAmount,
    getBatchSellAtomicSourceAmount,
    hasValidBatchSellSourceAmounts,
    buildBatchSellQuoteRows,
  },
  render: (state) => {
    const box: {
      current: ReturnType<typeof useBatchSellQuotesContext>;
    } = { current: undefined as never };
    const bridge = (
      state as {
        bridge: {
          batchSellSourceTokens?: BridgeToken[];
          batchSellDestToken?: BridgeToken;
          batchSellSourceTokenAmounts?: Partial<
            Record<CaipAssetType, string | undefined>
          >;
          batchSellSlippages?: Partial<Record<CaipAssetType, string | undefined>>;
        };
      }
    ).bridge;
    const sourceTokens = bridge.batchSellSourceTokens ?? [];
    const latestSourceAtomicBalances = sourceTokens.reduce<
      Partial<Record<CaipAssetType, BigNumber | undefined>>
    >((balances, token) => {
      const assetId = formatAddressToAssetId(token.address, token.chainId);
      if (assetId) {
        balances[assetId] = BigNumber.from('10000000000000000000');
      }
      return balances;
    }, {});

    renderWithProvider(
      <BatchSellQuotesProvider
        config={{
          sourceTokens,
          destToken: bridge.batchSellDestToken,
          sourceTokenAmounts: bridge.batchSellSourceTokenAmounts ?? {},
          slippages: bridge.batchSellSlippages ?? {},
          walletAddress: mockBatchSellQuoteRequestEnv.walletAddress,
          latestSourceAtomicBalances,
        }}
      >
        <Probe
          onValue={(value) => {
            box.current = value;
          }}
        />
      </BatchSellQuotesProvider>,
      { state },
      false,
    );

    return { result: box };
  },
});
