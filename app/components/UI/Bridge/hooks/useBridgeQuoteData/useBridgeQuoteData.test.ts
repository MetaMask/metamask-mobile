import { renderHook } from '@testing-library/react-native';
import { BigNumber } from 'ethers';

import type { BridgeToken } from '../../types';
import { useBridgeQuoteData } from '.';
import { runQuoteDataCases } from './runQuoteDataCases';

const mockDispatch = jest.fn();

jest.mock('react-redux', () => ({
  useSelector: (selector: (state: unknown) => unknown) => selector({}),
  useDispatch: () => mockDispatch,
}));

jest.mock('../../../../../selectors/currencyRateController', () => ({
  selectCurrentCurrency: () => 'USD',
}));

const mockValidateBridgeTx = jest.fn();
jest.mock('../../../../../util/bridge/hooks/useValidateBridgeTx', () => ({
  __esModule: true,
  default: () => ({
    validateBridgeTx: mockValidateBridgeTx,
  }),
}));

const mockUseIsInsufficientBalance = jest.fn();
jest.mock('../useInsufficientBalance', () => ({
  __esModule: true,
  default: (params: {
    amount?: string;
    token?: BridgeToken;
    latestAtomicBalance?: BigNumber;
    ignoreGasFees?: boolean;
  }) => mockUseIsInsufficientBalance(params),
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

runQuoteDataCases({
  mockDispatch,
  mockValidateBridgeTx,
  mockUseIsInsufficientBalance,
  renderHook: (options) => renderHook(() => useBridgeQuoteData(options)),
});
