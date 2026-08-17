import { act } from '@testing-library/react-native';
import { CaipAssetType, Hex } from '@metamask/utils';

import { FeatureId } from '@metamask/bridge-controller';

import Engine from '../../../../../core/Engine';
import { createBridgeTestState } from '../../testUtils';
import type { BridgeToken } from '../../types';
import type {
  buildBatchSellQuoteRequestData,
  getBatchSellAtomicSourceAmount,
  getBatchSellSourceTokenAmount,
  hasValidBatchSellSourceAmounts,
} from '../useBatchSellQuoteRequest';

export const mockBatchSellQuoteRequestEnv = {
  walletAddress: '0x1234567890123456789012345678901234567890' as
    | string
    | undefined,
  smartTransactionsEnabled: false,
};




const { selectShouldUseSmartTransaction: mockSelectShouldUseSmartTransaction } =
  jest.requireMock('../../../../../selectors/smartTransactionsController');

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

function getBridgeControllerMock() {
  return Engine.context.BridgeController as jest.Mocked<
    typeof Engine.context.BridgeController
  >;
}

export const runBatchSellQuoteRequestCases = ({
  render,
  debounceMs,
  helpers,
}: {
  implementation: 'legacy' | 'copied';
  render: (state?: ReturnType<typeof createBridgeTestState>) => {
    result: {
      current: {
        updateBatchSellQuoteParams: ((...args: never[]) => unknown) & {
          cancel?: () => void;
        };
        getNewQuote: () => void;
      };
    };
  };
  debounceMs: number;
  helpers: {
    getBatchSellSourceTokenAmount: typeof getBatchSellSourceTokenAmount;
    getBatchSellAtomicSourceAmount: typeof getBatchSellAtomicSourceAmount;
    hasValidBatchSellSourceAmounts: typeof hasValidBatchSellSourceAmounts;
    buildBatchSellQuoteRequestData?: typeof buildBatchSellQuoteRequestData;
    buildBatchSellQuoteRows?: typeof import('../useBatchSellQuotes').buildBatchSellQuoteRows;
  };
}) => {
  const {
    getBatchSellSourceTokenAmount,
    getBatchSellAtomicSourceAmount,
    hasValidBatchSellSourceAmounts,
    buildBatchSellQuoteRequestData,
    buildBatchSellQuoteRows,
  } = helpers;

  const flushQuoteRequestDebounce = async () => {
    await act(async () => {
      jest.advanceTimersByTime(debounceMs);
      await Promise.resolve();
      await Promise.resolve();
    });
  };

  describe('batch sell quote request cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockBatchSellQuoteRequestEnv.walletAddress =
      '0x1234567890123456789012345678901234567890';
    mockBatchSellQuoteRequestEnv.smartTransactionsEnabled = false;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns Batch Sell quote request functions', () => {
    const testState = createBridgeTestState();

    const { result } = render(testState);

    expect(typeof result.current.updateBatchSellQuoteParams).toBe('function');
    expect(typeof result.current.updateBatchSellQuoteParams.cancel).toBe(
      'function',
    );
    expect(typeof result.current.getNewQuote).toBe('function');
  });

  it('calculates source amounts from token balance percentages', () => {
    const amount = getBatchSellSourceTokenAmount(ethToken, 50);

    expect(amount).toBe('0.749');
  });

  it('calculates atomic source amounts from source amount values', () => {
    const amount = getBatchSellAtomicSourceAmount(ethToken, '0.749');

    expect(amount).toBe('749000000000000000');
  });

  it('returns false from hasValidBatchSellSourceAmounts when all source amounts are zero', () => {
    expect(
      hasValidBatchSellSourceAmounts(
        [ethToken, uniToken],
        {
          [ethAssetId]: '0',
          'eip155:1/erc20:0x2222222222222222222222222222222222222222': '0',
        },
        usdcToken,
      ),
    ).toBe(false);
  });

  it('returns true from hasValidBatchSellSourceAmounts when at least one source amount is sellable', () => {
    expect(
      hasValidBatchSellSourceAmounts(
        [ethToken, uniToken],
        {
          [ethAssetId]: '0',
          'eip155:1/erc20:0x2222222222222222222222222222222222222222': '1',
        },
        usdcToken,
      ),
    ).toBe(true);
  });

  it('returns false from hasValidBatchSellSourceAmounts when destination token is missing', () => {
    expect(
      hasValidBatchSellSourceAmounts(
        [ethToken],
        { [ethAssetId]: ethToken.balance },
        undefined,
      ),
    ).toBe(false);
  });

  it('returns false from hasValidBatchSellSourceAmounts when decimal amount is below one atomic unit', () => {
    expect(
      hasValidBatchSellSourceAmounts(
        [ethToken],
        { [ethAssetId]: '1e-19' },
        usdcToken,
      ),
    ).toBe(false);
    if (buildBatchSellQuoteRequestData) {
      expect(
        buildBatchSellQuoteRequestData({
          batchSellSlippages: {},
          batchSellSourceTokenAmounts: { [ethAssetId]: '1e-19' },
          destToken: usdcToken,
          smartTransactionsEnabled: false,
          sourceTokens: [ethToken],
          walletAddress: mockBatchSellQuoteRequestEnv.walletAddress,
        }),
      ).toEqual([]);
    }
  });

  it('builds quote request data for non-zero Batch Sell source token amounts', () => {
    if (buildBatchSellQuoteRequestData) {
      const quoteRequestData = buildBatchSellQuoteRequestData({
        batchSellSlippages: {
          [ethAssetId]: '2.5',
        },
        batchSellSourceTokenAmounts: {
          [ethAssetId]: '0.749',
        },
        destToken: usdcToken,
        smartTransactionsEnabled: false,
        sourceTokens: [ethToken, uniToken],
        walletAddress: mockBatchSellQuoteRequestEnv.walletAddress,
      });

      expect(quoteRequestData).toEqual([
        expect.objectContaining({
          quoteRequest: expect.objectContaining({
            srcChainId: '1',
            srcTokenAddress: ethToken.address,
            destChainId: '1',
            destTokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
            srcTokenAmount: '749000000000000000',
            slippage: 2.5,
            walletAddress: mockBatchSellQuoteRequestEnv.walletAddress,
            destWalletAddress: mockBatchSellQuoteRequestEnv.walletAddress,
          }),
          context: expect.objectContaining({
            stx_enabled: false,
            token_symbol_source: 'ETH',
            token_symbol_destination: 'USDC',
            token_security_type_destination: null,
            usd_amount_source: 1500,
            feature_id: FeatureId.BATCH_SELL,
          }),
        }),
      ]);
      return;
    }

    const rows = buildBatchSellQuoteRows?.({
      slippages: {
        [ethAssetId]: '2.5',
      },
      sourceTokenAmounts: {
        [ethAssetId]: '0.749',
      },
      destToken: usdcToken,
      smartTransactionsEnabled: false,
      sourceTokens: [ethToken, uniToken],
      walletAddress: mockBatchSellQuoteRequestEnv.walletAddress,
    });

    expect(rows).toEqual([
      expect.objectContaining({
        config: expect.objectContaining({
          srcTokenAmount: '0.749',
          slippage: 2.5,
          walletAddress: mockBatchSellQuoteRequestEnv.walletAddress,
          destWalletAddress: mockBatchSellQuoteRequestEnv.walletAddress,
          analyticsContext: expect.objectContaining({
            stx_enabled: false,
            token_symbol_source: 'ETH',
            token_symbol_destination: 'USDC',
            token_security_type_destination: null,
            usd_amount_source: 1500,
            feature_id: FeatureId.BATCH_SELL,
          }),
        }),
      }),
    ]);
  });

  it('updates BridgeController quote request params in index order', async () => {
    const testState = createBridgeTestState({
      bridgeReducerOverrides: {
        batchSellSourceTokens: [ethToken, uniToken],
        batchSellSourceTokenAmounts: {
          [ethAssetId]: ethToken.balance,
          'eip155:1/erc20:0x2222222222222222222222222222222222222222':
            uniToken.balance,
        },
        batchSellDestToken: usdcToken,
        batchSellSlippages: {},
      },
    });

    const { result } = render(testState);

    result.current.updateBatchSellQuoteParams();
    await flushQuoteRequestDebounce();

    const bridgeController = getBridgeControllerMock();
    expect(
      bridgeController.updateBridgeQuoteRequestParams,
    ).toHaveBeenCalledTimes(2);
    expect(
      bridgeController.updateBridgeQuoteRequestParams.mock.calls[0][2],
    ).toBe(0);
    expect(
      bridgeController.updateBridgeQuoteRequestParams.mock.calls[0][3],
    ).toBe(2);
    expect(
      bridgeController.updateBridgeQuoteRequestParams.mock.calls[1][2],
    ).toBe(1);
    expect(
      bridgeController.updateBridgeQuoteRequestParams.mock.calls[1][3],
    ).toBe(2);
  });

  it('passes Batch Sell context to BridgeController quote request params', async () => {
    const testState = createBridgeTestState({
      bridgeReducerOverrides: {
        batchSellSourceTokens: [ethToken, uniToken],
        batchSellSourceTokenAmounts: {
          [ethAssetId]: '0.749',
          'eip155:1/erc20:0x2222222222222222222222222222222222222222':
            '38.57425',
        },
        batchSellDestToken: usdcToken,
        batchSellSlippages: {},
      },
    });

    const { result } = render(testState);

    result.current.updateBatchSellQuoteParams();
    await flushQuoteRequestDebounce();

    const bridgeController = getBridgeControllerMock();
    expect(
      bridgeController.updateBridgeQuoteRequestParams.mock.calls[0][1],
    ).toEqual(
      expect.objectContaining({
        stx_enabled: false,
        token_symbol_source: 'ETH',
        token_symbol_destination: 'USDC',
        token_security_type_destination: null,
        usd_amount_source: 1500,
        feature_id: FeatureId.BATCH_SELL,
      }),
    );
    expect(
      bridgeController.updateBridgeQuoteRequestParams.mock.calls[1][1],
    ).toEqual(
      expect.objectContaining({
        stx_enabled: false,
        token_symbol_source: 'UNI',
        token_symbol_destination: 'USDC',
        token_security_type_destination: null,
        usd_amount_source: 250,
        feature_id: FeatureId.BATCH_SELL,
      }),
    );
  });

  it('skips update when destination token is missing', async () => {
    const testState = createBridgeTestState({
      bridgeReducerOverrides: {
        batchSellSourceTokens: [ethToken],
        batchSellDestToken: undefined,
      },
    });

    const { result } = render(testState);

    result.current.updateBatchSellQuoteParams();
    await flushQuoteRequestDebounce();

    expect(
      getBridgeControllerMock().updateBridgeQuoteRequestParams,
    ).not.toHaveBeenCalled();
  });

  it('skips update when wallet address is missing', async () => {
    mockBatchSellQuoteRequestEnv.walletAddress = undefined;
    const testState = createBridgeTestState({
      bridgeReducerOverrides: {
        batchSellSourceTokens: [ethToken],
        batchSellSourceTokenAmounts: {
          [ethAssetId]: ethToken.balance,
        },
        batchSellDestToken: usdcToken,
      },
    });

    const { result } = render(testState);

    result.current.updateBatchSellQuoteParams();
    await flushQuoteRequestDebounce();

    expect(
      getBridgeControllerMock().updateBridgeQuoteRequestParams,
    ).not.toHaveBeenCalled();
  });

  it('skips update when token percentages produce zero source amounts', async () => {
    const testState = createBridgeTestState({
      bridgeReducerOverrides: {
        batchSellSourceTokens: [ethToken, uniToken],
        batchSellSourceTokenAmounts: {
          [ethAssetId]: '0',
          'eip155:1/erc20:0x2222222222222222222222222222222222222222': '0',
        },
        batchSellDestToken: usdcToken,
      },
    });

    const { result } = render(testState);

    result.current.updateBatchSellQuoteParams();
    await flushQuoteRequestDebounce();

    expect(
      getBridgeControllerMock().updateBridgeQuoteRequestParams,
    ).not.toHaveBeenCalled();
  });

  it('does not reset BridgeController state during quote request updates', async () => {
    const testState = createBridgeTestState({
      bridgeReducerOverrides: {
        batchSellSourceTokens: [ethToken],
        batchSellSourceTokenAmounts: {
          [ethAssetId]: ethToken.balance,
        },
        batchSellDestToken: usdcToken,
      },
    });

    const { result } = render(testState);

    result.current.updateBatchSellQuoteParams();
    await flushQuoteRequestDebounce();

    expect(getBridgeControllerMock().resetState).not.toHaveBeenCalled();
  });

  it('resets BridgeController state before requesting a new quote', async () => {
    const testState = createBridgeTestState({
      bridgeReducerOverrides: {
        batchSellSourceTokens: [ethToken],
        batchSellSourceTokenAmounts: {
          [ethAssetId]: ethToken.balance,
        },
        batchSellDestToken: usdcToken,
      },
    });

    const { result } = render(testState);

    result.current.getNewQuote();

    expect(getBridgeControllerMock().resetState).toHaveBeenCalledTimes(1);
    await flushQuoteRequestDebounce();
    expect(
      getBridgeControllerMock().updateBridgeQuoteRequestParams,
    ).toHaveBeenCalledTimes(1);
    expect(
      getBridgeControllerMock().resetState.mock.invocationCallOrder[0],
    ).toBeLessThan(
      getBridgeControllerMock().updateBridgeQuoteRequestParams.mock
        .invocationCallOrder[0],
    );
  });

  it('passes stx_enabled: true in context when smart transactions are enabled', async () => {
    mockBatchSellQuoteRequestEnv.smartTransactionsEnabled = true;

    const testState = createBridgeTestState({
      bridgeReducerOverrides: {
        batchSellSourceTokens: [ethToken],
        batchSellSourceTokenAmounts: {
          [ethAssetId]: '0.749',
        },
        batchSellDestToken: usdcToken,
        batchSellSlippages: {},
      },
    });

    const { result } = render(testState);

    result.current.updateBatchSellQuoteParams();
    await flushQuoteRequestDebounce();

    expect(
      getBridgeControllerMock().updateBridgeQuoteRequestParams.mock.calls[0][1],
    ).toEqual(
      expect.objectContaining({
        stx_enabled: true,
      }),
    );
  });

  it('passes stx_enabled: false in context when smart transactions are disabled', async () => {
    mockBatchSellQuoteRequestEnv.smartTransactionsEnabled = false;

    const testState = createBridgeTestState({
      bridgeReducerOverrides: {
        batchSellSourceTokens: [ethToken],
        batchSellSourceTokenAmounts: {
          [ethAssetId]: '0.749',
        },
        batchSellDestToken: usdcToken,
        batchSellSlippages: {},
      },
    });

    const { result } = render(testState);

    result.current.updateBatchSellQuoteParams();
    await flushQuoteRequestDebounce();

    expect(
      getBridgeControllerMock().updateBridgeQuoteRequestParams.mock.calls[0][1],
    ).toEqual(
      expect.objectContaining({
        stx_enabled: false,
      }),
    );
  });

  it('passes the normalized source chain ID to selectShouldUseSmartTransaction', () => {
    const caipSourceToken: BridgeToken = {
      ...ethToken,
      chainId: 'eip155:1' as unknown as Hex,
    };

    const testState = createBridgeTestState({
      bridgeReducerOverrides: {
        batchSellSourceTokens: [caipSourceToken],
        batchSellDestToken: usdcToken,
      },
    });

    render(testState);

    expect(mockSelectShouldUseSmartTransaction).toHaveBeenCalledWith(
      expect.anything(),
      '0x1',
    );
  });

  it('passes undefined chain ID to selectShouldUseSmartTransaction when there are no source tokens', () => {
    const testState = createBridgeTestState({
      bridgeReducerOverrides: {
        batchSellSourceTokens: [],
        batchSellDestToken: usdcToken,
      },
    });

    render(testState);

    expect(mockSelectShouldUseSmartTransaction).toHaveBeenCalledWith(
      expect.anything(),
      undefined,
    );
  });
  });
};
