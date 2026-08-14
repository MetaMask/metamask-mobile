import { act } from '@testing-library/react-native';
import { BigNumber } from 'ethers';
import { FeatureId } from '@metamask/bridge-controller';

import '../../_mocks_/initialState';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import Engine from '../../../../../core/Engine';
import { createBridgeTestState } from '../../testUtils';
import { useBridgeQuotes, BRIDGE_QUOTES_DEBOUNCE_MS } from './index';
import { runQuoteRequestCases } from '../quoteTestCases/runQuoteRequestCases';
import {
  UNIFIED_QUOTE_ANALYTICS_CONTEXT,
  configFromBridgeState,
} from '../quoteTestCases/configFromBridgeState';

jest.mock('@metamask/bridge-controller', () => ({
  ...jest.requireActual('@metamask/bridge-controller'),
  isSolanaChainId: jest.fn((...args: unknown[]) =>
    jest
      .requireActual('@metamask/bridge-controller')
      .isSolanaChainId(...args),
  ),
}));

jest.mock('../../../../../core/Engine', () => ({
  context: {
    BridgeController: {
      updateBridgeQuoteRequestParams: jest.fn().mockResolvedValue(undefined),
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
        provider: {
          request: jest.fn(),
          sendAsync: jest.fn(),
        },
        configuration: {
          chainId: '0x1',
        },
      })),
    },
  },
}));

jest.mock('../useUnifiedSwapBridgeContext', () => ({
  useUnifiedSwapBridgeContext: jest.fn(),
}));

jest.mock('../../../../../selectors/bridge', () => ({
  ...jest.requireActual('../../../../../selectors/bridge'),
  selectSourceWalletAddress: jest.fn(),
}));

jest.mock('../useInsufficientBalance', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../useInsufficientNativeReserveError', () => ({
  __esModule: true,
  useInsufficientNativeReserveError: jest.fn(),
}));

jest.mock('../useLatestBalance', () => ({
  useLatestBalance: jest.fn(),
}));

jest.mock('../../../../../util/trace', () => ({
  ...jest.requireActual('../../../../../util/trace'),
  trace: jest.fn(),
  endTrace: jest.fn(),
}));

jest.mock('../../../../../util/bridge/hooks/useValidateBridgeTx', () => ({
  __esModule: true,
  default: () => ({
    validateBridgeTx: jest.fn().mockResolvedValue({ status: 'SUCCESS' }),
  }),
}));

const spyUpdateBridgeQuoteRequestParams = jest.spyOn(
  Engine.context.BridgeController,
  'updateBridgeQuoteRequestParams',
);

const batchSellAnalyticsContext = {
  ...UNIFIED_QUOTE_ANALYTICS_CONTEXT,
  feature_id: FeatureId.BATCH_SELL,
} as typeof UNIFIED_QUOTE_ANALYTICS_CONTEXT;

runQuoteRequestCases({
  implementation: 'copied',
  debounceMs: BRIDGE_QUOTES_DEBOUNCE_MS,
  expectedQuoteContext: UNIFIED_QUOTE_ANALYTICS_CONTEXT,
  render: (state, options) => {
    const { result } = renderHookWithProvider(
      () =>
        useBridgeQuotes({
          config: configFromBridgeState(state as never, options),
        }),
      { state },
    );

    return { result: { current: result.current.updateQuoteParams } };
  },
});

describe('useBridgeQuotes batch sell request fields', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Copied currently sends false for these fields instead of omitting them.
  // eslint-disable-next-line jest/no-disabled-tests
  it.skip('omits gasIncluded, gasIncluded7702, and insufficientBal on Batch Sell quote request params', async () => {
    const testState = createBridgeTestState();

    const { result } = renderHookWithProvider(
      () =>
        useBridgeQuotes({
          config: {
            ...configFromBridgeState(testState, {
              latestSourceAtomicBalance: BigNumber.from('10000000000000000000'),
            }),
            analyticsContext: batchSellAnalyticsContext,
            quoteRequestIndex: 0,
            quoteRequestCount: 2,
          },
          managedRequest: true,
        }),
      { state: testState },
    );

    await act(async () => {
      await result.current.updateQuoteParams();
    });

    const [params] = spyUpdateBridgeQuoteRequestParams.mock.calls[0];

    expect(params.gasIncluded).toBeUndefined();
    expect(params.gasIncluded7702).toBeUndefined();
    expect(params.insufficientBal).toBeUndefined();
    expect(spyUpdateBridgeQuoteRequestParams).toHaveBeenCalledWith(
      expect.anything(),
      batchSellAnalyticsContext,
      0,
      2,
    );
  });
});
