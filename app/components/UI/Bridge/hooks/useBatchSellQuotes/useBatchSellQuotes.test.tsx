import React from 'react';
import { act } from '@testing-library/react-native';
import { CaipAssetType, Hex } from '@metamask/utils';
import { FeatureId } from '@metamask/bridge-controller';
import { BigNumber } from 'ethers';

import '../../_mocks_/initialState';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import Engine from '../../../../../core/Engine';
import { createBridgeTestState } from '../../testUtils';
import type { BridgeToken } from '../../types';
import { BRIDGE_QUOTES_DEBOUNCE_MS } from '../useBridgeQuotes';
import { getBatchSellSourceTokenAmount } from './index';
import {
  BatchSellQuotesProvider,
  useBatchSellQuotesContext,
} from './BatchSellQuotesProvider';

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

const walletAddress = '0x1234567890123456789012345678901234567890';

const ethToken: BridgeToken = {
  address: '0x1111111111111111111111111111111111111111',
  chainId: '0x1' as Hex,
  decimals: 18,
  symbol: 'ETH',
  balance: '1.498',
  tokenFiatAmount: 3000,
};

const uniToken: BridgeToken = {
  address: '0x2222222222222222222222222222222222222222',
  chainId: '0x1' as Hex,
  decimals: 18,
  symbol: 'UNI',
  balance: '154.297',
  tokenFiatAmount: 1000,
};

const usdcToken: BridgeToken = {
  address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  chainId: '0x1' as Hex,
  decimals: 6,
  symbol: 'USDC',
};

const ethAssetId =
  'eip155:1/erc20:0x1111111111111111111111111111111111111111' as CaipAssetType;
const uniAssetId =
  'eip155:1/erc20:0x2222222222222222222222222222222222222222' as CaipAssetType;

const spyUpdateBridgeQuoteRequestParams = jest.spyOn(
  Engine.context.BridgeController,
  'updateBridgeQuoteRequestParams',
);

const Probe = ({
  onValue,
}: {
  onValue: (value: ReturnType<typeof useBatchSellQuotesContext>) => void;
}) => {
  const value = useBatchSellQuotesContext();
  onValue(value);
  return null;
};

const renderBatchSellQuotes = (
  onValue: (value: ReturnType<typeof useBatchSellQuotesContext>) => void,
) =>
  renderWithProvider(
    <BatchSellQuotesProvider
      config={{
        sourceTokens: [ethToken, uniToken],
        destToken: usdcToken,
        sourceTokenAmounts: {
          [ethAssetId]: '0.749',
          [uniAssetId]: '77.1485',
        },
        slippages: {},
        walletAddress,
        latestSourceAtomicBalances: {
          [ethAssetId]: BigNumber.from('10000000000000000000'),
          [uniAssetId]: BigNumber.from('10000000000000000000'),
        },
      }}
    >
      <Probe onValue={onValue} />
    </BatchSellQuotesProvider>,
    { state: createBridgeTestState() },
    false,
  );

describe('useBatchSellQuotes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('calculates source amounts from token balance percentages', () => {
    expect(getBatchSellSourceTokenAmount(ethToken, 50)).toBe('0.749');
  });

  it('flushes each inner quote request with index and count after debounce', async () => {
    let latest: ReturnType<typeof useBatchSellQuotesContext> | undefined;

    renderBatchSellQuotes((value) => {
      latest = value;
    });

    expect(Object.keys(latest?.quotesByAssetId ?? {})).toEqual([
      ethAssetId,
      uniAssetId,
    ]);

    await act(async () => {
      latest?.updateBatchSellQuoteParams();
      jest.advanceTimersByTime(BRIDGE_QUOTES_DEBOUNCE_MS);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(spyUpdateBridgeQuoteRequestParams).toHaveBeenCalledTimes(2);
    expect(spyUpdateBridgeQuoteRequestParams).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        walletAddress,
        destWalletAddress: walletAddress,
      }),
      expect.objectContaining({
        feature_id: FeatureId.BATCH_SELL,
        token_symbol_source: 'ETH',
        token_symbol_destination: 'USDC',
      }),
      0,
      2,
    );
    expect(spyUpdateBridgeQuoteRequestParams).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        walletAddress,
      }),
      expect.objectContaining({
        feature_id: FeatureId.BATCH_SELL,
        token_symbol_source: 'UNI',
      }),
      1,
      2,
    );
  });

  it('resets controller state then fetches quotes on getNewQuote', async () => {
    let latest: ReturnType<typeof useBatchSellQuotesContext> | undefined;

    renderBatchSellQuotes((value) => {
      latest = value;
    });

    await act(async () => {
      latest?.getNewQuote();
      jest.advanceTimersByTime(BRIDGE_QUOTES_DEBOUNCE_MS);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(Engine.context.BridgeController.resetState).toHaveBeenCalledTimes(1);
    expect(spyUpdateBridgeQuoteRequestParams).toHaveBeenCalledTimes(2);
  });
});
