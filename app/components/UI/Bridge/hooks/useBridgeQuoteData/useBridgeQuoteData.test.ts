import '../../_mocks_/initialState';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useBridgeQuoteData } from '.';
import {
  mockUseIsInsufficientBalance,
  mockValidateBridgeTx,
  runQuoteDataCases,
} from '../quoteTestCases/runQuoteDataCases';

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
  },
}));

jest.mock('../../../../../util/notifications/methods/common', () => ({
  getProviderByChainId: jest.fn(() => ({
    getBalance: jest.fn().mockResolvedValue('1000000000000000000'),
  })),
}));

runQuoteDataCases((state, options) =>
  renderHookWithProvider(
    () =>
      options && 'latestSourceAtomicBalance' in options
        ? useBridgeQuoteData({
            latestSourceAtomicBalance: options.latestSourceAtomicBalance,
          })
        : useBridgeQuoteData(),
    { state },
  ),
);
