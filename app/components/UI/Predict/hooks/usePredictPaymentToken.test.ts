import { act, renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import type { Hex } from '@metamask/utils';
import { usePredictPaymentToken } from './usePredictPaymentToken';
import { PREDICT_BALANCE_PLACEHOLDER_ADDRESS } from '../constants/transactions';
import Engine from '../../../../core/Engine';
import type { AssetType } from '../../../Views/confirmations/types/token';

let mockSelectedPaymentToken: {
  address: string;
  chainId: string;
  symbol?: string;
} | null = null;
const mockSetPayToken = jest.fn();

const createMockAsset = (overrides?: Partial<AssetType>): AssetType => ({
  address: '0x1234',
  chainId: '0x1',
  decimals: 18,
  image: 'https://example.com/token.png',
  name: 'Test Token',
  symbol: 'TEST',
  balance: '1000',
  logo: undefined,
  isETH: false,
  ...overrides,
});

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

let mockTransactionMeta: { id: string } | undefined;

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

jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      onBuyPaymentTokenChange: jest.fn(),
      setSelectedPaymentToken: jest.fn(),
    },
  },
}));

describe('usePredictPaymentToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectedPaymentToken = null;
    mockTransactionMeta = undefined;
    jest.mocked(useSelector).mockImplementation(() => mockSelectedPaymentToken);
    jest
      .mocked(Engine.context.PredictController.setSelectedPaymentToken)
      .mockClear();
    jest
      .mocked(Engine.context.PredictController.onBuyPaymentTokenChange)
      .mockClear();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('onPaymentTokenChange', () => {
    it('returns early when token is null', () => {
      const { result } = renderHook(() => usePredictPaymentToken());

      act(() => {
        result.current.onPaymentTokenChange(null);
      });

      expect(
        jest.mocked(Engine.context.PredictController.onBuyPaymentTokenChange),
      ).not.toHaveBeenCalled();
    });

    it('calls onBuyPaymentTokenChange with full token for balance placeholder', () => {
      const { result } = renderHook(() => usePredictPaymentToken());
      const token = createMockAsset({
        address: PREDICT_BALANCE_PLACEHOLDER_ADDRESS,
      });

      act(() => {
        result.current.onPaymentTokenChange(token);
      });

      expect(
        jest.mocked(Engine.context.PredictController.onBuyPaymentTokenChange),
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          address: PREDICT_BALANCE_PLACEHOLDER_ADDRESS,
        }),
      );
    });

    it('calls onBuyPaymentTokenChange with full token for valid token', () => {
      const { result } = renderHook(() => usePredictPaymentToken());
      const token = createMockAsset({
        address: '0xabcd',
        chainId: '0x1',
        symbol: 'TEST',
      });

      act(() => {
        result.current.onPaymentTokenChange(token);
      });

      expect(
        jest.mocked(Engine.context.PredictController.onBuyPaymentTokenChange),
      ).toHaveBeenCalledWith(token);
    });

    it('calls setPayToken for non-balance token when transaction exists', () => {
      mockTransactionMeta = { id: 'tx-123' };
      const { result } = renderHook(() => usePredictPaymentToken());
      const token = createMockAsset({
        address: '0xabcd',
        chainId: '0x1',
      });

      act(() => {
        result.current.onPaymentTokenChange(token);
      });

      expect(mockSetPayToken).toHaveBeenCalledWith({
        address: '0xabcd' as Hex,
        chainId: '0x1' as Hex,
      });
    });

    it('does not call setPayToken for non-balance token when no transaction exists', () => {
      mockTransactionMeta = undefined;
      const { result } = renderHook(() => usePredictPaymentToken());
      const token = createMockAsset({
        address: '0xabcd',
        chainId: '0x1',
      });

      act(() => {
        result.current.onPaymentTokenChange(token);
      });

      expect(mockSetPayToken).not.toHaveBeenCalled();
    });

    it('does not call setPayToken for balance placeholder token', () => {
      const { result } = renderHook(() => usePredictPaymentToken());
      const token = createMockAsset({
        address: PREDICT_BALANCE_PLACEHOLDER_ADDRESS,
        chainId: '0x1',
      });

      act(() => {
        result.current.onPaymentTokenChange(token);
      });

      expect(mockSetPayToken).not.toHaveBeenCalled();
    });

    it('passes token with missing chainId to controller', () => {
      const { result } = renderHook(() => usePredictPaymentToken());
      const token = createMockAsset({
        address: '0xabcd',
        chainId: undefined,
        symbol: undefined,
      });

      act(() => {
        result.current.onPaymentTokenChange(token);
      });

      expect(
        jest.mocked(Engine.context.PredictController.onBuyPaymentTokenChange),
      ).toHaveBeenCalledWith(token);
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
