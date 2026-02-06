import React from 'react';

import { backgroundState } from '../../../../../../util/test/initial-root-state';
import renderWithProvider, {
  DeepPartial,
} from '../../../../../../util/test/renderWithProvider';
import EditGasFeeLegacyUpdate from '.';
import { RootState } from '../../../../../../reducers';

// Mock useGasTransaction since legacy transaction state has been removed
jest.mock('../../../../../../core/GasPolling/GasPolling', () => ({
  ...jest.requireActual('../../../../../../core/GasPolling/GasPolling'),
  useGasTransaction: jest.fn(),
}));

import { useGasTransaction } from '../../../../../../core/GasPolling/GasPolling';

const mockUseGasTransaction = useGasTransaction as jest.MockedFunction<
  typeof useGasTransaction
>;

const mockInitialState: (
  txnType?: 'none' | 'eth_gasPrice' | 'fee-market' | 'legacy' | undefined,
) => DeepPartial<RootState> = (txnType = 'none') => ({
  engine: {
    backgroundState: {
      ...backgroundState,
      GasFeeController: {
        gasEstimateType: txnType,
      },
    },
  },
});

const selectedGasObjectForFeeMarket = {
  legacyGasLimit: undefined,
  suggestedMaxFeePerGas: '10',
};

const selectedGasObjectForLegacy = {
  legacyGasLimit: undefined,
  suggestedGasPrice: '3',
};

const sharedProps = {
  view: 'Transaction',
  analyticsParams: undefined,
  onSave: () => undefined,
  error: undefined,
  onCancel: () => undefined,
  onUpdatingValuesStart: () => undefined,
  onUpdatingValuesEnd: () => undefined,
  animateOnChange: undefined,
  isAnimating: true,
  hasDappSuggestedGas: false,
  warning: 'test',
  onlyGas: true,
  chainId: '0x1',
};

const editGasFeeLegacyForFeeMarket = {
  ...sharedProps,
  selectedGasObject: selectedGasObjectForFeeMarket,
};

const editGasFeeLegacyForLegacy = {
  ...sharedProps,
  selectedGasObject: selectedGasObjectForLegacy,
};

// Mock gas transaction data for fee-market type (~ 0.00021 ETH = 21000 gas * 10 gwei)
const mockGasTransactionFeeMarket = {
  transactionFee: '0.00021 ETH',
  transactionFeeFiat: '$0.50',
  suggestedGasPrice: '10',
  suggestedGasPriceHex: '0x2540be400',
  suggestedGasLimit: '21000',
  suggestedGasLimitHex: '0x5208',
  totalHex: '0x4e3b29200000',
};

// Mock gas transaction data for legacy type (~ 0.00006 ETH = 21000 gas * 3 gwei)
const mockGasTransactionLegacy = {
  transactionFee: '0.00006 ETH',
  transactionFeeFiat: '$0.15',
  suggestedGasPrice: '3',
  suggestedGasPriceHex: '0xb2d05e00',
  suggestedGasLimit: '21000',
  suggestedGasLimitHex: '0x5208',
  totalHex: '0x174876e800',
};

describe('EditGasFeeLegacyUpdate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should match snapshot', async () => {
    mockUseGasTransaction.mockReturnValue(
      mockGasTransactionFeeMarket as unknown as ReturnType<
        typeof useGasTransaction
      >,
    );
    const initialState = mockInitialState();
    const container = renderWithProvider(
      <EditGasFeeLegacyUpdate {...editGasFeeLegacyForFeeMarket} />,
      { state: initialState },
    );
    expect(container).toMatchSnapshot();
  });

  it('should calculate the correct gas transaction fee for 1559 transaction', async () => {
    mockUseGasTransaction.mockReturnValue(
      mockGasTransactionFeeMarket as unknown as ReturnType<
        typeof useGasTransaction
      >,
    );
    const initialState = mockInitialState('fee-market');
    const { findByText } = renderWithProvider(
      <EditGasFeeLegacyUpdate {...editGasFeeLegacyForFeeMarket} />,
      { state: initialState },
    );

    expect(await findByText('~ 0.00021 ETH')).toBeDefined();
  });

  it('should calculate the correct gas transaction fee for legacy transaction', async () => {
    mockUseGasTransaction.mockReturnValue(
      mockGasTransactionLegacy as unknown as ReturnType<
        typeof useGasTransaction
      >,
    );
    const initialState = mockInitialState('legacy');
    const { findByText } = renderWithProvider(
      <EditGasFeeLegacyUpdate {...editGasFeeLegacyForLegacy} />,
      { state: initialState },
    );

    expect(await findByText('~ 0.00006 ETH')).toBeDefined();
  });
});
