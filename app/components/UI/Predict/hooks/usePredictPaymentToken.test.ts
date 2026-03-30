import { act, renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { usePredictPaymentToken } from './usePredictPaymentToken';
import { PREDICT_BALANCE_PLACEHOLDER_ADDRESS } from '../constants/transactions';
import Engine from '../../../../core/Engine';
import type { AssetType } from '../../../Views/confirmations/types/token';

let mockSelectedPaymentToken: {
  address: string;
  chainId: string;
  symbol?: string;
} | null = null;

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

jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      selectPaymentToken: jest.fn(),
      setSelectedPaymentToken: jest.fn(),
    },
  },
}));

describe('usePredictPaymentToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectedPaymentToken = null;
    jest.mocked(useSelector).mockImplementation(() => mockSelectedPaymentToken);
    jest
      .mocked(Engine.context.PredictController.setSelectedPaymentToken)
      .mockClear();
    jest
      .mocked(Engine.context.PredictController.selectPaymentToken)
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
        jest.mocked(Engine.context.PredictController.selectPaymentToken),
      ).not.toHaveBeenCalled();
    });

    it('calls selectPaymentToken with full token for balance placeholder', () => {
      const { result } = renderHook(() => usePredictPaymentToken());
      const token = createMockAsset({
        address: PREDICT_BALANCE_PLACEHOLDER_ADDRESS,
      });

      act(() => {
        result.current.onPaymentTokenChange(token);
      });

      expect(
        jest.mocked(Engine.context.PredictController.selectPaymentToken),
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          address: PREDICT_BALANCE_PLACEHOLDER_ADDRESS,
        }),
      );
    });

    it('calls selectPaymentToken with full token for valid token', () => {
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
        jest.mocked(Engine.context.PredictController.selectPaymentToken),
      ).toHaveBeenCalledWith(token);
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
        jest.mocked(Engine.context.PredictController.selectPaymentToken),
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
