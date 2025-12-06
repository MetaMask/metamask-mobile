import { renderHook, act } from '@testing-library/react-native';
import { TransactionType } from '@metamask/transaction-controller';
import { useSelector } from 'react-redux';
import { useCustomAmountRewards } from './useCustomAmountRewards';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useRewardsAccountOptedIn } from '../../../../UI/Perps/hooks/useRewardsAccountOptedIn';
import { selectIsMusdConversionFlowEnabledFlag } from '../../../../UI/Earn/selectors/featureFlags';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));
jest.mock('../transactions/useTransactionMetadataRequest');
jest.mock('../../../../UI/Perps/hooks/useRewardsAccountOptedIn');
jest.mock('../../../../UI/Earn/selectors/featureFlags');
jest.mock(
  '../../../../UI/Earn/components/RewardsTooltipBottomSheet',
  () => 'RewardsTooltipBottomSheet',
);

const mockUseSelector = jest.mocked(useSelector);
const mockUseTransactionMetadataRequest = jest.mocked(
  useTransactionMetadataRequest,
);
const mockUseRewardsAccountOptedIn = jest.mocked(useRewardsAccountOptedIn);

describe('useCustomAmountRewards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectIsMusdConversionFlowEnabledFlag) {
        return true;
      }
      return undefined;
    });
    mockUseRewardsAccountOptedIn.mockReturnValue({
      accountOptedIn: true,
      account: null,
    });
  });

  describe('rewards opt-in', () => {
    it('passes requireActiveSeason true to useRewardsAccountOptedIn', () => {
      mockUseTransactionMetadataRequest.mockReturnValue({
        type: TransactionType.musdConversion,
      } as ReturnType<typeof useTransactionMetadataRequest>);

      renderHook(() => useCustomAmountRewards({ amountHuman: '100' }));

      expect(mockUseRewardsAccountOptedIn).toHaveBeenCalledWith({
        requireActiveSeason: true,
      });
    });
  });

  describe('non-mUSD transactions', () => {
    it('returns shouldShowRewardsTag false for non-mUSD transaction types', () => {
      mockUseTransactionMetadataRequest.mockReturnValue({
        type: TransactionType.perpsDeposit,
      } as ReturnType<typeof useTransactionMetadataRequest>);

      const { result } = renderHook(() =>
        useCustomAmountRewards({ amountHuman: '100' }),
      );

      expect(result.current.shouldShowRewardsTag).toBe(false);
      expect(result.current.estimatedPoints).toBeNull();
    });

    it('returns null estimatedPoints for predictDeposit transaction', () => {
      mockUseTransactionMetadataRequest.mockReturnValue({
        type: TransactionType.predictDeposit,
      } as ReturnType<typeof useTransactionMetadataRequest>);

      const { result } = renderHook(() =>
        useCustomAmountRewards({ amountHuman: '500' }),
      );

      expect(result.current.shouldShowRewardsTag).toBe(false);
      expect(result.current.estimatedPoints).toBeNull();
    });

    it('returns shouldShowRewardsTag false when transaction is undefined', () => {
      mockUseTransactionMetadataRequest.mockReturnValue(undefined);

      const { result } = renderHook(() =>
        useCustomAmountRewards({ amountHuman: '100' }),
      );

      expect(result.current.shouldShowRewardsTag).toBe(false);
      expect(result.current.estimatedPoints).toBeNull();
    });

    it('returns shouldShowRewardsTag false when mUSD feature flag is disabled', () => {
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
        useCustomAmountRewards({ amountHuman: '100' }),
      );

      expect(result.current.shouldShowRewardsTag).toBe(false);
      expect(result.current.estimatedPoints).toBeNull();
      expect(result.current.shouldShowOutputAmountTag).toBe(false);
    });
  });

  describe('mUSD conversion transactions', () => {
    beforeEach(() => {
      mockUseTransactionMetadataRequest.mockReturnValue({
        type: TransactionType.musdConversion,
      } as ReturnType<typeof useTransactionMetadataRequest>);
    });

    it('returns shouldShowRewardsTag true for mUSD conversion', () => {
      const { result } = renderHook(() =>
        useCustomAmountRewards({ amountHuman: '100' }),
      );

      expect(result.current.shouldShowRewardsTag).toBe(true);
    });

    it('calculates 5 points for $100', () => {
      const { result } = renderHook(() =>
        useCustomAmountRewards({ amountHuman: '100' }),
      );

      expect(result.current.estimatedPoints).toBe(5);
    });

    it('calculates 10 points for $200', () => {
      const { result } = renderHook(() =>
        useCustomAmountRewards({ amountHuman: '200' }),
      );

      expect(result.current.estimatedPoints).toBe(10);
    });

    it('calculates 0 points for amounts under $100', () => {
      const { result } = renderHook(() =>
        useCustomAmountRewards({ amountHuman: '99' }),
      );

      expect(result.current.estimatedPoints).toBe(0);
    });

    it('floors partial amounts (e.g., $250 = 10 points)', () => {
      const { result } = renderHook(() =>
        useCustomAmountRewards({ amountHuman: '250' }),
      );

      expect(result.current.estimatedPoints).toBe(10);
    });

    it('calculates 0 points for empty amount', () => {
      const { result } = renderHook(() =>
        useCustomAmountRewards({ amountHuman: '' }),
      );

      expect(result.current.estimatedPoints).toBe(0);
    });

    it('calculates 0 points for invalid amount', () => {
      const { result } = renderHook(() =>
        useCustomAmountRewards({ amountHuman: 'invalid' }),
      );

      expect(result.current.estimatedPoints).toBe(0);
    });
  });

  describe('renderRewardsTooltip', () => {
    beforeEach(() => {
      mockUseTransactionMetadataRequest.mockReturnValue({
        type: TransactionType.musdConversion,
      } as ReturnType<typeof useTransactionMetadataRequest>);
    });

    it('returns null when tooltip is not visible', () => {
      const { result } = renderHook(() =>
        useCustomAmountRewards({ amountHuman: '100' }),
      );

      expect(result.current.renderRewardsTooltip()).toBeNull();
    });

    it('returns Modal component when tooltip is visible', () => {
      const { result } = renderHook(() =>
        useCustomAmountRewards({ amountHuman: '100' }),
      );

      act(() => {
        result.current.onRewardsTagPress();
      });

      const tooltip = result.current.renderRewardsTooltip();

      expect(tooltip).not.toBeNull();
    });
  });

  describe('output amount tag', () => {
    describe('non-mUSD transactions', () => {
      it('returns shouldShowOutputAmountTag false for non-mUSD transaction', () => {
        mockUseTransactionMetadataRequest.mockReturnValue({
          type: TransactionType.perpsDeposit,
        } as ReturnType<typeof useTransactionMetadataRequest>);

        const { result } = renderHook(() =>
          useCustomAmountRewards({ amountHuman: '100' }),
        );

        expect(result.current.shouldShowOutputAmountTag).toBe(false);
        expect(result.current.outputAmount).toBeNull();
        expect(result.current.outputSymbol).toBeNull();
      });
    });

    describe('mUSD conversion transactions', () => {
      beforeEach(() => {
        mockUseTransactionMetadataRequest.mockReturnValue({
          type: TransactionType.musdConversion,
        } as ReturnType<typeof useTransactionMetadataRequest>);
      });

      it('returns shouldShowOutputAmountTag true for mUSD conversion', () => {
        const { result } = renderHook(() =>
          useCustomAmountRewards({ amountHuman: '100' }),
        );

        expect(result.current.shouldShowOutputAmountTag).toBe(true);
      });

      it('returns formatted outputAmount with 2 decimal places', () => {
        const { result } = renderHook(() =>
          useCustomAmountRewards({ amountHuman: '100.5678' }),
        );

        expect(result.current.outputAmount).toBe('100.57');
      });

      it('returns outputAmount for whole numbers', () => {
        const { result } = renderHook(() =>
          useCustomAmountRewards({ amountHuman: '250' }),
        );

        expect(result.current.outputAmount).toBe('250');
      });

      it('returns 0 outputAmount for empty string', () => {
        const { result } = renderHook(() =>
          useCustomAmountRewards({ amountHuman: '' }),
        );

        expect(result.current.outputAmount).toBe('0');
      });

      it('returns mUSD as outputSymbol for mUSD conversion', () => {
        const { result } = renderHook(() =>
          useCustomAmountRewards({ amountHuman: '100' }),
        );

        expect(result.current.outputSymbol).toBe('mUSD');
      });
    });
  });
});
