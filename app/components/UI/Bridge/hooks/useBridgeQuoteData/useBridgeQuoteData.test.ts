import { renderHook } from '@testing-library/react-native';

import { useBridgeQuoteData } from '.';
import { runQuoteDataCases } from './runQuoteDataCases';
import { FeatureId } from '@metamask/bridge-controller';

const mockDispatch = jest.fn();

jest.mock('react-redux', () => ({
  useSelector: (selector: (state: unknown) => unknown) => selector({}),
  useDispatch: () => mockDispatch,
}));

jest.mock('../../../../../selectors/currencyRateController', () => ({
  selectCurrentCurrency: () => 'USD',
}));

jest.mock('../../../../../util/bridge/hooks/useValidateBridgeTx', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../useInsufficientBalance', () => ({
  __esModule: true,
  default: jest.fn(),
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

jest.mock('../../../../../util/trace', () => ({
  ...jest.requireActual('../../../../../util/trace'),
  trace: jest.fn(),
  endTrace: jest.fn(),
}));

jest.mock('../../../../../util/notifications/methods/common', () => ({
  getProviderByChainId: jest.fn(() => ({
    getBalance: jest.fn().mockResolvedValue('1000000000000000000'),
  })),
}));

jest.mock('../useSwapFeatureId', () => ({
  useSwapFeatureId: jest.fn(),
}));

runQuoteDataCases({
  name: 'useBridgeQuoteData',
  mockDispatch,
  renderHook: (options) => renderHook(() => useBridgeQuoteData(options)),
  featureId: FeatureId.UNIFIED_SWAP_BRIDGE,
});
