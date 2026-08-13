import { act } from '@testing-library/react-native';
import { BigNumber } from 'ethers';
import { FeatureId } from '@metamask/bridge-controller';

import '../../_mocks_/initialState';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import Engine from '../../../../../core/Engine';
import { createBridgeTestState } from '../../testUtils';
import { mockBridgeReducerState } from '../../_mocks_/bridgeReducerState';
import { useBridgeQuotes } from './index';

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

const unifiedAnalyticsContext = {
  stx_enabled: false,
  token_symbol_source: 'ETH',
  token_symbol_destination: 'USDC',
  token_security_type_destination: null,
  security_warnings: [],
  warnings: [],
  usd_amount_source: 0,
  feature_id: FeatureId.UNIFIED_SWAP_BRIDGE,
} as Parameters<typeof useBridgeQuotes>[0]['config']['analyticsContext'];

const batchSellAnalyticsContext = {
  ...unifiedAnalyticsContext,
  feature_id: FeatureId.BATCH_SELL,
} as Parameters<typeof useBridgeQuotes>[0]['config']['analyticsContext'];

const configFromState = (
  analyticsContext: Parameters<
    typeof useBridgeQuotes
  >[0]['config']['analyticsContext'],
  overrides: Partial<Parameters<typeof useBridgeQuotes>[0]['config']> = {},
): Parameters<typeof useBridgeQuotes>[0]['config'] => ({
  srcTokenAmount: '1',
  sourceToken: mockBridgeReducerState.sourceToken,
  destToken: mockBridgeReducerState.destToken,
  latestSourceAtomicBalance: BigNumber.from('10000000000000000000'),
  destWalletAddress: mockBridgeReducerState.destAddress,
  walletAddress,
  analyticsContext,
  ...overrides,
});

const spyUpdateBridgeQuoteRequestParams = jest.spyOn(
  Engine.context.BridgeController,
  'updateBridgeQuoteRequestParams',
);

describe('useBridgeQuotes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('includes gasIncluded, gasIncluded7702, and insufficientBal on unified quote request params', async () => {
    const testState = createBridgeTestState({
      bridgeReducerOverrides: {
        isGasIncludedSTXSendBundleSupported: true,
        isGasIncluded7702Supported: false,
      },
    });

    const { result } = renderHookWithProvider(
      () =>
        useBridgeQuotes({
          config: configFromState(unifiedAnalyticsContext),
          managedRequest: true,
        }),
      { state: testState },
    );

    await act(async () => {
      await result.current.updateQuoteParams();
    });

    expect(spyUpdateBridgeQuoteRequestParams).toHaveBeenCalledWith(
      expect.objectContaining({
        gasIncluded: true,
        gasIncluded7702: false,
        insufficientBal: false,
      }),
      unifiedAnalyticsContext,
      0,
      1,
    );
  });

  it('omits gasIncluded, gasIncluded7702, and insufficientBal on Batch Sell quote request params', async () => {
    const testState = createBridgeTestState();

    const { result } = renderHookWithProvider(
      () =>
        useBridgeQuotes({
          config: configFromState(batchSellAnalyticsContext, {
            quoteRequestIndex: 0,
            quoteRequestCount: 2,
          }),
          managedRequest: true,
        }),
      { state: testState },
    );

    await act(async () => {
      await result.current.updateQuoteParams();
    });

    const [params] = spyUpdateBridgeQuoteRequestParams.mock.calls[0];

    expect(params).not.toEqual(
      expect.objectContaining({
        gasIncluded: expect.anything(),
      }),
    );
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
