import { act, renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { usePredictPaymentToken } from './usePredictPaymentToken';

let mockSelectedPaymentToken: {
  address: string;
  chainId: string;
  symbol?: string;
} | null = null;
let mockTransactionMeta: { id: string } | null = null;
const mockSetPayToken = jest.fn();

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock(
  '../../../Views/confirmations/hooks/pay/useTransactionPayToken',
  () => ({
    useTransactionPayToken: () => ({
      payToken: null,
      setPayToken: mockSetPayToken,
    }),
  }),
);

jest.mock(
  '../../../Views/confirmations/hooks/transactions/useTransactionMetadataRequest',
  () => ({
    useTransactionMetadataRequest: () => mockTransactionMeta,
  }),
);

describe('usePredictPaymentToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectedPaymentToken = null;
    mockTransactionMeta = null;
    jest.mocked(useSelector).mockImplementation(() => mockSelectedPaymentToken);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('does not call onTokenSelected on initial render', () => {
    const onTokenSelected = jest.fn();

    renderHook(() => usePredictPaymentToken({ onTokenSelected }));

    expect(onTokenSelected).not.toHaveBeenCalled();
  });

  it('calls onTokenSelected when token changes from predict balance to token', async () => {
    const onTokenSelected = jest.fn();
    const { rerender } = renderHook(
      ({ onTokenSelected: selectedCallback }) =>
        usePredictPaymentToken({ onTokenSelected: selectedCallback }),
      {
        initialProps: { onTokenSelected },
      },
    );

    mockSelectedPaymentToken = {
      address: '0x1234',
      chainId: '0x1',
    };

    await act(async () => {
      rerender({ onTokenSelected });
    });

    expect(onTokenSelected).toHaveBeenCalledWith('0x1234', '0x1234');
  });

  it('calls onTokenSelected with predict-balance key when switching back to predict balance', async () => {
    mockSelectedPaymentToken = {
      address: '0x1234',
      chainId: '0x1',
    };

    const onTokenSelected = jest.fn();
    const { rerender } = renderHook(
      ({ onTokenSelected: selectedCallback }) =>
        usePredictPaymentToken({ onTokenSelected: selectedCallback }),
      {
        initialProps: { onTokenSelected },
      },
    );

    mockSelectedPaymentToken = null;

    await act(async () => {
      rerender({ onTokenSelected });
    });

    expect(onTokenSelected).toHaveBeenCalledWith(null, 'predict-balance');
  });

  it('does not call onTokenSelected when token selection does not change', async () => {
    const onTokenSelected = jest.fn();
    const { rerender } = renderHook(
      ({ onTokenSelected: selectedCallback }) =>
        usePredictPaymentToken({ onTokenSelected: selectedCallback }),
      {
        initialProps: { onTokenSelected },
      },
    );

    await act(async () => {
      rerender({ onTokenSelected });
    });

    expect(onTokenSelected).not.toHaveBeenCalled();
  });
});
