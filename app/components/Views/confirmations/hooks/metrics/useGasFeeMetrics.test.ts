import { merge } from 'lodash';

import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { transferTransactionStateMock } from '../../mock-data/transfer-transaction-mock';
import { useGasFeeMetrics } from './useGasFeeMetrics';
import { useGasOptions } from '../../components/modals/gas-fee-modal/hooks/useGasOptions';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useConfirmationMetricEvents } from './useConfirmationMetricEvents';

jest.mock('../../../../../core/Engine', () => ({
  context: {
    TokenListController: {
      fetchTokenList: jest.fn(),
    },
  },
}));
jest.mock('../../components/modals/gas-fee-modal/hooks/useGasOptions');
jest.mock('../transactions/useTransactionMetadataRequest');
jest.mock('./useConfirmationMetricEvents');

const transactionWithGasEstimatesLoaded = merge(transferTransactionStateMock, {
  engine: {
    backgroundState: {
      TransactionController: {
        transactions: [
          {
            gasFeeEstimatesLoaded: true,
          },
        ],
      },
    },
  },
});

describe('useGasFeeMetrics', () => {
  const mockSetConfirmationMetric = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (useConfirmationMetricEvents as jest.Mock).mockReturnValue({
      setConfirmationMetric: mockSetConfirmationMetric,
    });

    (useTransactionMetadataRequest as jest.Mock).mockReturnValue({
      gasFeeEstimatesLoaded: true,
    });

    (useGasOptions as jest.Mock).mockReturnValue({
      options: [
        { metricKey: 'low', isSelected: false },
        { metricKey: 'medium', isSelected: true },
        { metricKey: 'high', isSelected: false },
      ],
    });
  });

  it('set metrics with available gas options', () => {
    renderHookWithProvider(() => useGasFeeMetrics(), {
      state: transactionWithGasEstimatesLoaded,
    });

    expect(mockSetConfirmationMetric).toHaveBeenCalledWith({
      properties: {
        gas_estimation_failed: false,
        gas_fee_presented: ['low', 'medium', 'high'],
        gas_fee_selected: 'medium',
      },
    });
  });

  it('set gas estimation failure metric when gas estimates are not loaded', () => {
    (useTransactionMetadataRequest as jest.Mock).mockReturnValue({
      gasFeeEstimatesLoaded: false,
    });

    renderHookWithProvider(() => useGasFeeMetrics(), {
      state: transactionWithGasEstimatesLoaded,
    });

    expect(mockSetConfirmationMetric).toHaveBeenCalledWith({
      properties: {
        gas_estimation_failed: true,
        gas_fee_presented: ['low', 'medium', 'high'],
        gas_fee_selected: 'medium',
      },
    });
  });

  it('set no selected gas fee option metric when no gas fee option is selected', () => {
    (useGasOptions as jest.Mock).mockReturnValue({
      options: [
        { metricKey: 'low', isSelected: false },
        { metricKey: 'medium', isSelected: false },
        { metricKey: 'high', isSelected: false },
      ],
    });

    renderHookWithProvider(() => useGasFeeMetrics(), {
      state: transactionWithGasEstimatesLoaded,
    });

    expect(mockSetConfirmationMetric).toHaveBeenCalledWith({
      properties: {
        gas_estimation_failed: false,
        gas_fee_presented: ['low', 'medium', 'high'],
        gas_fee_selected: undefined,
      },
    });
  });

  it('set gas fee presented metric when gas fee options are available', () => {
    (useGasOptions as jest.Mock).mockReturnValue({
      options: [
        { name: 'some-option', isSelected: false },
        { metricKey: 'medium', isSelected: true },
        { name: 'another-option', isSelected: false },
      ],
    });

    renderHookWithProvider(() => useGasFeeMetrics(), {
      state: transactionWithGasEstimatesLoaded,
    });

    expect(mockSetConfirmationMetric).toHaveBeenCalledWith({
      properties: {
        gas_estimation_failed: false,
        gas_fee_presented: ['medium'],
        gas_fee_selected: 'medium',
      },
    });
  });

  it('set gas fee presented metric when gas fee options are empty', () => {
    (useGasOptions as jest.Mock).mockReturnValue({
      options: [],
    });

    renderHookWithProvider(() => useGasFeeMetrics(), {
      state: transactionWithGasEstimatesLoaded,
    });

    expect(mockSetConfirmationMetric).toHaveBeenCalledWith({
      properties: {
        gas_estimation_failed: false,
        gas_fee_presented: [],
        gas_fee_selected: undefined,
      },
    });
  });

  it('update metrics when gas fee options change', () => {
    const { rerender } = renderHookWithProvider(() => useGasFeeMetrics(), {
      state: transactionWithGasEstimatesLoaded,
    });

    expect(mockSetConfirmationMetric).toHaveBeenCalledTimes(1);

    // Change gas options to trigger useEffect
    (useGasOptions as jest.Mock).mockReturnValue({
      options: [
        { metricKey: 'low', isSelected: false },
        { metricKey: 'medium', isSelected: false },
        { metricKey: 'high', isSelected: true },
      ],
    });

    rerender({});

    expect(mockSetConfirmationMetric).toHaveBeenCalledTimes(2);
    expect(mockSetConfirmationMetric).toHaveBeenLastCalledWith({
      properties: {
        gas_estimation_failed: false,
        gas_fee_presented: ['low', 'medium', 'high'],
        gas_fee_selected: 'high',
      },
    });
  });

  it('calls useGasOptions with expected parameters', () => {
    renderHookWithProvider(() => useGasFeeMetrics(), {
      state: transactionWithGasEstimatesLoaded,
    });

    expect(useGasOptions).toHaveBeenCalledWith({
      handleCloseModals: expect.any(Function),
      setActiveModal: expect.any(Function),
    });
  });

  it('calls useGasOptions with expected parameters', () => {
    (useGasOptions as jest.Mock).mockReturnValue({
      options: [
        { metricKey: 'low', isSelected: false },
        { metricKey: 'advanced', isSelected: true },
        { name: 'Special', isSelected: false },
      ],
    });

    renderHookWithProvider(() => useGasFeeMetrics(), {
      state: transactionWithGasEstimatesLoaded,
    });

    expect(mockSetConfirmationMetric).toHaveBeenCalledWith({
      properties: {
        gas_estimation_failed: false,
        gas_fee_presented: ['low', 'advanced'],
        gas_fee_selected: 'advanced',
      },
    });
  });
});
