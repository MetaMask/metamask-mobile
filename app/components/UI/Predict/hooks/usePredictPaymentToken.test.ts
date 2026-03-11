import { act, renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';
import { usePredictPaymentToken } from './usePredictPaymentToken';
import { PREDICT_BALANCE_PLACEHOLDER_ADDRESS } from '../constants/transactions';
import Engine from '../../../../core/Engine';

let mockSelectedPaymentToken: {
  address: string;
  chainId: string;
  symbol?: string;
} | null = null;
let mockTransactionMeta: { id: string } | null = null;
let mockPayToken: { address: Hex; chainId: Hex } | null = null;
const mockSetPayToken = jest.fn();

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock(
  '../../../Views/confirmations/hooks/pay/useTransactionPayToken',
  () => ({
    useTransactionPayToken: () => ({
      payToken: mockPayToken,
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

jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      setSelectedPaymentToken: jest.fn(),
    },
  },
}));

describe('usePredictPaymentToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectedPaymentToken = null;
    mockTransactionMeta = null;
    mockPayToken = null;
    jest.mocked(useSelector).mockImplementation(() => mockSelectedPaymentToken);
    jest
      .mocked(Engine.context.PredictController.setSelectedPaymentToken)
      .mockClear();
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

    expect(onTokenSelected).toHaveBeenCalledWith({
      tokenAddress: '0x1234',
      tokenKey: '0x1234',
    });
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

    expect(onTokenSelected).toHaveBeenCalledWith({
      tokenAddress: null,
      tokenKey: 'predict-balance',
    });
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

  describe('onPaymentTokenChange', () => {
    it('returns early when token is null', () => {
      const { result } = renderHook(() => usePredictPaymentToken());

      act(() => {
        result.current.onPaymentTokenChange(null);
      });

      expect(
        jest.mocked(Engine.context.PredictController.setSelectedPaymentToken),
      ).not.toHaveBeenCalled();
    });

    it('calls setSelectedPaymentToken with null when token address is placeholder', () => {
      const { result } = renderHook(() => usePredictPaymentToken());

      act(() => {
        result.current.onPaymentTokenChange({
          address: PREDICT_BALANCE_PLACEHOLDER_ADDRESS,
          chainId: '0x1',
        });
      });

      expect(
        jest.mocked(Engine.context.PredictController.setSelectedPaymentToken),
      ).toHaveBeenCalledWith(null);
    });

    it('calls setSelectedPaymentToken with token data when token is valid', () => {
      const { result } = renderHook(() => usePredictPaymentToken());
      const token = {
        address: '0xabcd',
        chainId: '0x1',
        symbol: 'TEST',
      };

      act(() => {
        result.current.onPaymentTokenChange(token);
      });

      expect(
        jest.mocked(Engine.context.PredictController.setSelectedPaymentToken),
      ).toHaveBeenCalledWith({
        address: '0xabcd',
        chainId: '0x1',
        symbol: 'TEST',
      });
    });

    it('calls setPayToken when transactionMeta.id exists', () => {
      mockTransactionMeta = { id: 'tx-123' };
      const { result } = renderHook(() => usePredictPaymentToken());
      const token = {
        address: '0xabcd',
        chainId: '0x1',
      };

      act(() => {
        result.current.onPaymentTokenChange(token);
      });

      expect(mockSetPayToken).toHaveBeenCalledWith({
        address: '0xabcd' as Hex,
        chainId: '0x1' as Hex,
      });
    });

    it('does not call setPayToken when transactionMeta is null', () => {
      mockTransactionMeta = null;
      const { result } = renderHook(() => usePredictPaymentToken());
      const token = {
        address: '0xabcd',
        chainId: '0x1',
      };

      act(() => {
        result.current.onPaymentTokenChange(token);
      });

      expect(mockSetPayToken).not.toHaveBeenCalled();
    });

    it('does not call setPayToken when transactionMeta.id is missing', () => {
      mockTransactionMeta = { id: '' };
      const { result } = renderHook(() => usePredictPaymentToken());
      const token = {
        address: '0xabcd',
        chainId: '0x1',
      };

      act(() => {
        result.current.onPaymentTokenChange(token);
      });

      expect(mockSetPayToken).not.toHaveBeenCalled();
    });

    it('handles token with missing chainId', () => {
      const { result } = renderHook(() => usePredictPaymentToken());
      const token = {
        address: '0xabcd',
      };

      act(() => {
        result.current.onPaymentTokenChange(token);
      });

      expect(
        jest.mocked(Engine.context.PredictController.setSelectedPaymentToken),
      ).toHaveBeenCalledWith({
        address: '0xabcd',
        chainId: '',
        symbol: undefined,
      });
    });
  });

  describe('resetSelectedPaymentToken', () => {
    it('calls setSelectedPaymentToken with null', () => {
      const { result } = renderHook(() => usePredictPaymentToken());

      act(() => {
        result.current.resetSelectedPaymentToken();
      });

      expect(
        jest.mocked(Engine.context.PredictController.setSelectedPaymentToken),
      ).toHaveBeenCalledWith(null);
    });
  });

  describe('useEffect syncing payToken with selectedPaymentToken', () => {
    it('skips sync when transactionMeta is missing', () => {
      mockTransactionMeta = null;
      mockSelectedPaymentToken = {
        address: '0xabcd',
        chainId: '0x1',
      };

      renderHook(() => usePredictPaymentToken());

      expect(mockSetPayToken).not.toHaveBeenCalled();
    });

    it('skips sync when isPredictBalanceSelected is true', () => {
      mockTransactionMeta = { id: 'tx-123' };
      mockSelectedPaymentToken = null;

      renderHook(() => usePredictPaymentToken());

      expect(mockSetPayToken).not.toHaveBeenCalled();
    });

    it('skips sync when selectedPaymentToken is null', () => {
      mockTransactionMeta = { id: 'tx-123' };
      mockSelectedPaymentToken = null;

      renderHook(() => usePredictPaymentToken());

      expect(mockSetPayToken).not.toHaveBeenCalled();
    });

    it('skips sync when token is already applied', () => {
      mockTransactionMeta = { id: 'tx-123' };
      mockSelectedPaymentToken = {
        address: '0xabcd',
        chainId: '0x1',
      };
      mockPayToken = {
        address: '0xabcd' as Hex,
        chainId: '0x1' as Hex,
      };

      renderHook(() => usePredictPaymentToken());

      expect(mockSetPayToken).not.toHaveBeenCalled();
    });

    it('skips sync when token is already applied with different case', () => {
      mockTransactionMeta = { id: 'tx-123' };
      mockSelectedPaymentToken = {
        address: '0xABCD',
        chainId: '0x1',
      };
      mockPayToken = {
        address: '0xabcd' as Hex,
        chainId: '0x1' as Hex,
      };

      renderHook(() => usePredictPaymentToken());

      expect(mockSetPayToken).not.toHaveBeenCalled();
    });

    it('calls setPayToken when token is not yet applied', () => {
      mockTransactionMeta = { id: 'tx-123' };
      mockSelectedPaymentToken = {
        address: '0xabcd',
        chainId: '0x1',
      };
      mockPayToken = null;

      renderHook(() => usePredictPaymentToken());

      expect(mockSetPayToken).toHaveBeenCalledWith({
        address: '0xabcd' as Hex,
        chainId: '0x1' as Hex,
      });
    });

    it('calls setPayToken when chainId differs', () => {
      mockTransactionMeta = { id: 'tx-123' };
      mockSelectedPaymentToken = {
        address: '0xabcd',
        chainId: '0x2',
      };
      mockPayToken = {
        address: '0xabcd' as Hex,
        chainId: '0x1' as Hex,
      };

      renderHook(() => usePredictPaymentToken());

      expect(mockSetPayToken).toHaveBeenCalledWith({
        address: '0xabcd' as Hex,
        chainId: '0x2' as Hex,
      });
    });
  });

  describe('isPredictBalanceSelected', () => {
    it('returns true when selectedPaymentToken is null', () => {
      mockSelectedPaymentToken = null;
      const { result } = renderHook(() => usePredictPaymentToken());

      expect(result.current.isPredictBalanceSelected).toBe(true);
    });

    it('returns false when selectedPaymentToken is set', () => {
      mockSelectedPaymentToken = {
        address: '0xabcd',
        chainId: '0x1',
      };
      const { result } = renderHook(() => usePredictPaymentToken());

      expect(result.current.isPredictBalanceSelected).toBe(false);
    });
  });

  describe('selectedPaymentToken', () => {
    it('returns null when not selected', () => {
      mockSelectedPaymentToken = null;
      const { result } = renderHook(() => usePredictPaymentToken());

      expect(result.current.selectedPaymentToken).toBeNull();
    });

    it('returns token object when selected', () => {
      const token = {
        address: '0xabcd',
        chainId: '0x1',
        symbol: 'TEST',
      };
      mockSelectedPaymentToken = token;
      const { result } = renderHook(() => usePredictPaymentToken());

      expect(result.current.selectedPaymentToken).toEqual(token);
    });
  });
});
