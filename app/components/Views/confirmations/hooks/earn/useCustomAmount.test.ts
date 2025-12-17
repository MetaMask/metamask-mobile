import { renderHook } from '@testing-library/react-native';
import { TransactionType } from '@metamask/transaction-controller';
import { useSelector } from 'react-redux';
import { useCustomAmount } from './useCustomAmount';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { selectIsMusdConversionFlowEnabledFlag } from '../../../../UI/Earn/selectors/featureFlags';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));
jest.mock('../transactions/useTransactionMetadataRequest');
jest.mock('../../../../UI/Earn/selectors/featureFlags');

const mockUseSelector = jest.mocked(useSelector);
const mockUseTransactionMetadataRequest = jest.mocked(
  useTransactionMetadataRequest,
);

describe('useCustomAmount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectIsMusdConversionFlowEnabledFlag) {
        return true;
      }
      return undefined;
    });
  });

  describe('non-mUSD transactions', () => {
    it('returns shouldShowOutputAmountTag false for non-mUSD transaction types', () => {
      mockUseTransactionMetadataRequest.mockReturnValue({
        type: TransactionType.perpsDeposit,
      } as ReturnType<typeof useTransactionMetadataRequest>);

      const { result } = renderHook(() =>
        useCustomAmount({ amountHuman: '100' }),
      );

      expect(result.current.shouldShowOutputAmountTag).toBe(false);
      expect(result.current.outputAmount).toBeNull();
      expect(result.current.outputSymbol).toBeNull();
    });

    it('returns shouldShowOutputAmountTag false for predictDeposit transaction', () => {
      mockUseTransactionMetadataRequest.mockReturnValue({
        type: TransactionType.predictDeposit,
      } as ReturnType<typeof useTransactionMetadataRequest>);

      const { result } = renderHook(() =>
        useCustomAmount({ amountHuman: '500' }),
      );

      expect(result.current.shouldShowOutputAmountTag).toBe(false);
      expect(result.current.outputAmount).toBeNull();
      expect(result.current.outputSymbol).toBeNull();
    });

    it('returns shouldShowOutputAmountTag false when transaction is undefined', () => {
      mockUseTransactionMetadataRequest.mockReturnValue(undefined);

      const { result } = renderHook(() =>
        useCustomAmount({ amountHuman: '100' }),
      );

      expect(result.current.shouldShowOutputAmountTag).toBe(false);
      expect(result.current.outputAmount).toBeNull();
      expect(result.current.outputSymbol).toBeNull();
    });

    it('returns shouldShowOutputAmountTag false when mUSD feature flag is disabled', () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectIsMusdConversionFlowEnabledFlag) {
          return false;
        }
        return undefined;
      });
      mockUseTransactionMetadataRequest.mockReturnValue({
        type: TransactionType.musdConversion,
      } as ReturnType<typeof useTransactionMetadataRequest>);

      const { result } = renderHook(() =>
        useCustomAmount({ amountHuman: '100' }),
      );

      expect(result.current.shouldShowOutputAmountTag).toBe(false);
    });
  });

  describe('output amount tag', () => {
    describe('mUSD conversion transactions', () => {
      beforeEach(() => {
        mockUseTransactionMetadataRequest.mockReturnValue({
          type: TransactionType.musdConversion,
        } as ReturnType<typeof useTransactionMetadataRequest>);
      });

      it('returns shouldShowOutputAmountTag true for mUSD conversion', () => {
        const { result } = renderHook(() =>
          useCustomAmount({ amountHuman: '100' }),
        );

        expect(result.current.shouldShowOutputAmountTag).toBe(true);
      });

      it('returns formatted outputAmount with 2 decimal places', () => {
        const { result } = renderHook(() =>
          useCustomAmount({ amountHuman: '100.5678' }),
        );

        expect(result.current.outputAmount).toBe('100.57');
      });

      it('returns outputAmount for whole numbers', () => {
        const { result } = renderHook(() =>
          useCustomAmount({ amountHuman: '250' }),
        );

        expect(result.current.outputAmount).toBe('250');
      });

      it('returns 0 outputAmount for empty string', () => {
        const { result } = renderHook(() =>
          useCustomAmount({ amountHuman: '' }),
        );

        expect(result.current.outputAmount).toBe('0');
      });

      it('returns mUSD as outputSymbol for mUSD conversion', () => {
        const { result } = renderHook(() =>
          useCustomAmount({ amountHuman: '100' }),
        );

        expect(result.current.outputSymbol).toBe('mUSD');
      });
    });
  });
});
