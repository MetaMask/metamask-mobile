import '../../_mocks_/initialState';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { BigNumber } from 'ethers';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useBridgeQuotes } from './index';
import {
  mockUseIsInsufficientBalance,
  mockValidateBridgeTx,
  runQuoteDataCases,
} from '../quoteTestCases/runQuoteDataCases';
import {
  configFromBridgeState,
  toLegacyQuoteDataResult,
} from '../quoteTestCases/configFromBridgeState';

jest.mock('../../../../../util/bridge/hooks/useValidateBridgeTx', () => ({
  __esModule: true,
  default: () => ({
    validateBridgeTx: mockValidateBridgeTx,
  }),
}));

jest.mock('../useInsufficientBalance', () => ({
  __esModule: true,
  default: (params: unknown) => mockUseIsInsufficientBalance(params),
}));

jest.mock('../../../../../core/Engine', () => ({
  context: {
    NetworkController: {
      findNetworkClientIdByChainId: jest.fn(() => 'mainnet'),
      getNetworkClientById: jest.fn(() => ({
        configuration: {
          chainId: '0x1',
        },
      })),
    },
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
  },
}));

jest.mock('../../../../../util/notifications/methods/common', () => ({
  getProviderByChainId: jest.fn(() => ({
    getBalance: jest.fn().mockResolvedValue('1000000000000000000'),
  })),
}));

runQuoteDataCases(
  (state, options) =>
    renderHookWithProvider(
      () => {
        const reduxState = useSelector(
          (current: Parameters<typeof configFromBridgeState>[0]) => current,
        );
        const result = useBridgeQuotes({
          config: configFromBridgeState(reduxState as never, {
            latestSourceAtomicBalance:
              options && 'latestSourceAtomicBalance' in options
                ? options.latestSourceAtomicBalance
                : BigNumber.from('10000000000000000000'),
          }),
          managedRequest: true,
        });

        return useMemo(() => toLegacyQuoteDataResult(result), [result]);
      },
      { state: state as never },
    ),
  { implementation: 'copied' },
);
