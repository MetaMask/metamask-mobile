import React from 'react';
import { Provider } from 'react-redux';
import { createStore } from 'redux';
import { renderHook } from '@testing-library/react-native';
import { useCancelSpeedupGas } from './useCancelSpeedupGas';
import type { Eip1559ExistingGas, LegacyExistingGas } from './types';
import { TransactionMeta } from '@metamask/transaction-controller';

const mockGasFeeEstimates = {
  type: 'fee-market',
  medium: {
    suggestedMaxFeePerGas: '25',
    suggestedMaxPriorityFeePerGas: '2',
    minWaitTimeEstimate: 15000,
  },
};

const mockNetworkConfig = { nativeCurrency: 'ETH' };

jest.mock('../../../../../../selectors/gasFeeController', () => ({
  selectGasFeeEstimatesByChainId: jest.fn(() => mockGasFeeEstimates),
}));

jest.mock('../../../../../../selectors/networkController', () => ({
  selectNetworkConfigurationByChainId: jest.fn(() => mockNetworkConfig),
}));

jest.mock('../../../../../../selectors/currencyRateController', () => ({
  selectConversionRateByChainId: jest.fn(() => 2000),
}));

jest.mock('../../../../../../selectors/settings', () => ({
  selectShowFiatInTestnets: jest.fn(() => false),
}));

jest.mock('../../../../../../components/UI/SimulationDetails/FiatDisplay/useFiatFormatter', () => ({
  __esModule: true,
  default: () => (amount: { toFixed: () => string }) => `$${amount.toFixed()}`,
}));

jest.mock('../../../utils/gas', () => ({
  getFeesFromHex: jest.fn(() => ({
    currentCurrencyFee: null,
    nativeCurrencyFee: null,
    preciseCurrentCurrencyFee: null,
    preciseNativeCurrencyFee: null,
    preciseNativeFeeInHex: null,
  })),
}));

const rootReducer = (state = {}) => state;
const store = createStore(rootReducer);
const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(Provider, { store }, children);

describe('useCancelSpeedupGas', () => {
  const tx = {
    id: 'tx-1',
    chainId: '0x1',
    txParams: { gas: '0x5208' },
    gas: '0x5208',
  } as unknown as TransactionMeta;

  it('returns empty result when tx is null', () => {
    const { result } = renderHook(
      () =>
        useCancelSpeedupGas({
          existingGas: { isEIP1559Transaction: true, maxFeePerGas: 20, maxPriorityFeePerGas: 2 },
          tx: null,
          isCancel: false,
        }),
      { wrapper },
    );
    expect(result.current.paramsForController).toBeUndefined();
    expect(result.current.networkFeeDisplay).toBe('0');
    expect(result.current.networkFeeNative).toBe('0');
    expect(result.current.networkFeeFiat).toBeNull();
    expect(result.current.speedDisplay).toBeDefined();
  });

  it('returns empty result when existingGas is null', () => {
    const { result } = renderHook(
      () =>
        useCancelSpeedupGas({
          existingGas: null,
          tx,
          isCancel: false,
        }),
      { wrapper },
    );
    expect(result.current.paramsForController).toBeUndefined();
    expect(result.current.networkFeeDisplay).toBe('0');
    expect(result.current.networkFeeNative).toBe('0');
    expect(result.current.networkFeeFiat).toBeNull();
  });

  it('returns EIP-1559 params and display when existingGas is EIP-1559', () => {
    const existingGas: Eip1559ExistingGas = {
      isEIP1559Transaction: true,
      maxFeePerGas: 20,
      maxPriorityFeePerGas: 2,
    };
    const { result } = renderHook(
      () => useCancelSpeedupGas({ existingGas, tx, isCancel: false }),
      { wrapper },
    );
    expect(result.current.paramsForController).toBeDefined();
    expect(result.current.paramsForController?.maxFeePerGas).toBeDefined();
    expect(result.current.paramsForController?.maxPriorityFeePerGas).toBeDefined();
    expect(result.current.networkFeeDisplay).toMatch(/\d+\.?\d* ETH/);
    expect(result.current.networkFeeNative).toMatch(/\d+\.?\d*/);
    expect(result.current.speedDisplay).toBeDefined();
  });

  it('returns legacy params when existingGas has zero gasPrice', () => {
    const existingGas: LegacyExistingGas = { gasPrice: 0 };
    const { result } = renderHook(
      () => useCancelSpeedupGas({ existingGas, tx, isCancel: false }),
      { wrapper },
    );
    expect(result.current.paramsForController).toBeDefined();
    expect(result.current.paramsForController?.gasPrice).toBeDefined();
    expect(result.current.networkFeeDisplay).toMatch(/\d+\.?\d* ETH/);
  });

  it('returns undefined params for legacy with non-zero gasPrice (controller applies rate)', () => {
    const existingGas: LegacyExistingGas = { gasPrice: 10 };
    const { result } = renderHook(
      () => useCancelSpeedupGas({ existingGas, tx, isCancel: true }),
      { wrapper },
    );
    expect(result.current.paramsForController).toBeUndefined();
    expect(result.current.networkFeeDisplay).toMatch(/\d+\.?\d* ETH/);
  });
});
