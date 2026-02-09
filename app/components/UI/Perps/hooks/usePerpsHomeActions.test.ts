import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { usePerpsHomeActions } from './usePerpsHomeActions';
import { usePerpsTrading } from './usePerpsTrading';
import { usePerpsNetworkManagement } from './usePerpsNetworkManagement';
import { useConfirmNavigation } from '../../../Views/confirmations/hooks/useConfirmNavigation';
import Routes from '../../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../../core/Analytics/MetaMetrics.events';
import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
} from '../constants/eventNames';

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(() => ({
    navigate: jest.fn(),
  })),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../selectors/perpsController', () => ({
  selectPerpsEligibility: jest.fn(),
}));

jest.mock('./usePerpsTrading', () => ({
  usePerpsTrading: jest.fn(() => ({
    depositWithConfirmation: jest.fn().mockReturnValue(Promise.resolve()),
  })),
}));

jest.mock('./usePerpsNetworkManagement', () => ({
  usePerpsNetworkManagement: jest.fn(() => ({
    ensureArbitrumNetworkExists: jest.fn().mockReturnValue(Promise.resolve()),
  })),
}));

jest.mock('../../../Views/confirmations/hooks/useConfirmNavigation', () => ({
  useConfirmNavigation: jest.fn(() => ({
    navigateToConfirmation: jest.fn(),
  })),
}));

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

const mockTrack = jest.fn();
jest.mock('./usePerpsEventTracking', () => ({
  usePerpsEventTracking: jest.fn(() => ({
    track: mockTrack,
  })),
}));

describe('usePerpsHomeActions', () => {
  const mockNavigation = {
    navigate: jest.fn(),
  };

  const mockDepositWithConfirmation = jest
    .fn()
    .mockReturnValue(Promise.resolve());
  const mockEnsureArbitrumNetworkExists = jest
    .fn()
    .mockReturnValue(Promise.resolve());
  const mockNavigateToConfirmation = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockTrack.mockClear();
    (useNavigation as jest.Mock).mockReturnValue(mockNavigation);
    (useSelector as jest.Mock).mockReturnValue(true);
    (usePerpsTrading as jest.Mock).mockReturnValue({
      depositWithConfirmation: mockDepositWithConfirmation,
    });
    (usePerpsNetworkManagement as jest.Mock).mockReturnValue({
      ensureArbitrumNetworkExists: mockEnsureArbitrumNetworkExists,
    });
    (useConfirmNavigation as jest.Mock).mockReturnValue({
      navigateToConfirmation: mockNavigateToConfirmation,
    });
  });

  describe('initialization', () => {
    it('initializes with correct default state', () => {
      const { result } = renderHook(() => usePerpsHomeActions());

      expect(result.current.isEligible).toBe(true);
      expect(result.current.isEligibilityModalVisible).toBe(false);
      expect(result.current.isProcessing).toBe(false);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.handleAddFunds).toBe('function');
      expect(typeof result.current.handleWithdraw).toBe('function');
      expect(typeof result.current.closeEligibilityModal).toBe('function');
    });
  });

  describe('hook stability', () => {
    it('returns stable function references across re-renders', () => {
      const { result, rerender } = renderHook(() => usePerpsHomeActions());

      const initialFunctions = {
        handleAddFunds: result.current.handleAddFunds,
        handleWithdraw: result.current.handleWithdraw,
        closeEligibilityModal: result.current.closeEligibilityModal,
      };

      rerender({});

      expect(initialFunctions.handleAddFunds).toBe(
        result.current.handleAddFunds,
      );
      expect(initialFunctions.handleWithdraw).toBe(
        result.current.handleWithdraw,
      );
      expect(initialFunctions.closeEligibilityModal).toBe(
        result.current.closeEligibilityModal,
      );
    });
  });

  describe('handleAddFunds - eligible user', () => {
    it('calls network check, navigates to confirmation, and initiates deposit', async () => {
      const { result } = renderHook(() => usePerpsHomeActions());

      await act(async () => {
        await result.current.handleAddFunds();
      });

      expect(mockEnsureArbitrumNetworkExists).toHaveBeenCalledTimes(1);
      expect(mockNavigateToConfirmation).toHaveBeenCalledWith({
        stack: Routes.PERPS.ROOT,
      });
      expect(mockDepositWithConfirmation).toHaveBeenCalledTimes(1);
    });

    it('triggers onAddFundsSuccess callback', async () => {
      const onAddFundsSuccess = jest.fn();
      const { result } = renderHook(() =>
        usePerpsHomeActions({ onAddFundsSuccess }),
      );

      await act(async () => {
        await result.current.handleAddFunds();
      });

      await waitFor(() => {
        expect(onAddFundsSuccess).toHaveBeenCalledTimes(1);
      });
    });

    it('resets isProcessing to false after operation completes', async () => {
      const { result } = renderHook(() => usePerpsHomeActions());

      await act(async () => {
        await result.current.handleAddFunds();
      });

      await waitFor(() => {
        expect(result.current.isProcessing).toBe(false);
      });
    });

    it('handles network error during add funds', async () => {
      const networkError = new Error('Network not available');
      mockEnsureArbitrumNetworkExists.mockRejectedValueOnce(networkError);

      const onError = jest.fn();
      const { result } = renderHook(() => usePerpsHomeActions({ onError }));

      await act(async () => {
        await result.current.handleAddFunds();
      });

      await waitFor(() => {
        expect(result.current.error).toEqual(networkError);
        expect(onError).toHaveBeenCalledWith(networkError, 'deposit');
      });
    });
  });

  describe('handleAddFunds - ineligible user', () => {
    it('opens eligibility modal without calling deposit functions', async () => {
      (useSelector as jest.Mock).mockReturnValue(false);

      const { result } = renderHook(() => usePerpsHomeActions());

      await act(async () => {
        await result.current.handleAddFunds();
      });

      expect(result.current.isEligibilityModalVisible).toBe(true);
      expect(mockEnsureArbitrumNetworkExists).not.toHaveBeenCalled();
      expect(mockDepositWithConfirmation).not.toHaveBeenCalled();
    });

    it('tracks geo-block screen viewed event for deposit action', async () => {
      (useSelector as jest.Mock).mockReturnValue(false);

      const { result } = renderHook(() => usePerpsHomeActions());

      await act(async () => {
        await result.current.handleAddFunds();
      });

      expect(mockTrack).toHaveBeenCalledWith(
        MetaMetricsEvents.PERPS_SCREEN_VIEWED,
        {
          [PERPS_EVENT_PROPERTY.SCREEN_TYPE]:
            PERPS_EVENT_VALUE.SCREEN_TYPE.GEO_BLOCK_NOTIF,
          [PERPS_EVENT_PROPERTY.SOURCE]:
            PERPS_EVENT_VALUE.SOURCE.DEPOSIT_BUTTON,
        },
      );
    });
  });

  describe('handleWithdraw - eligible user', () => {
    it('calls network check and navigates to withdraw screen', async () => {
      const { result } = renderHook(() => usePerpsHomeActions());

      await act(async () => {
        await result.current.handleWithdraw();
      });

      expect(mockEnsureArbitrumNetworkExists).toHaveBeenCalledTimes(1);
      expect(mockNavigation.navigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.WITHDRAW,
      });
    });

    it('triggers onWithdrawSuccess callback', async () => {
      const onWithdrawSuccess = jest.fn();
      const { result } = renderHook(() =>
        usePerpsHomeActions({ onWithdrawSuccess }),
      );

      await act(async () => {
        await result.current.handleWithdraw();
      });

      await waitFor(() => {
        expect(onWithdrawSuccess).toHaveBeenCalledTimes(1);
      });
    });

    it('handles navigation error during withdraw', async () => {
      const navError = new Error('Navigation failed');
      mockEnsureArbitrumNetworkExists.mockRejectedValueOnce(navError);

      const onError = jest.fn();
      const { result } = renderHook(() => usePerpsHomeActions({ onError }));

      await act(async () => {
        await result.current.handleWithdraw();
      });

      await waitFor(() => {
        expect(result.current.error).toEqual(navError);
        expect(onError).toHaveBeenCalledWith(navError, 'withdraw');
      });
    });
  });

  describe('handleWithdraw - ineligible user (TAT-2337: withdrawals not geo-blocked)', () => {
    it('allows withdrawal navigation even for ineligible users', async () => {
      (useSelector as jest.Mock).mockReturnValue(false);

      const { result } = renderHook(() => usePerpsHomeActions());

      await act(async () => {
        await result.current.handleWithdraw();
      });

      // Withdrawal should proceed regardless of eligibility
      expect(result.current.isEligibilityModalVisible).toBe(false);
      expect(mockEnsureArbitrumNetworkExists).toHaveBeenCalledTimes(1);
      expect(mockNavigation.navigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.WITHDRAW,
      });
    });

    it('does not show geo-block notification for withdraw action', async () => {
      (useSelector as jest.Mock).mockReturnValue(false);

      const { result } = renderHook(() => usePerpsHomeActions());

      await act(async () => {
        await result.current.handleWithdraw();
      });

      // Should NOT track geo-block screen for withdrawals
      expect(mockTrack).not.toHaveBeenCalledWith(
        MetaMetricsEvents.PERPS_SCREEN_VIEWED,
        expect.objectContaining({
          [PERPS_EVENT_PROPERTY.SCREEN_TYPE]:
            PERPS_EVENT_VALUE.SCREEN_TYPE.GEO_BLOCK_NOTIF,
        }),
      );
    });

    it('tracks geo-blocked withdrawal with IS_GEO_BLOCKED property for monitoring', async () => {
      (useSelector as jest.Mock).mockReturnValue(false);

      const { result } = renderHook(() => usePerpsHomeActions());

      await act(async () => {
        await result.current.handleWithdraw();
      });

      // Should track withdrawal with IS_GEO_BLOCKED: true for monitoring
      expect(mockTrack).toHaveBeenCalledWith(
        MetaMetricsEvents.PERPS_UI_INTERACTION,
        expect.objectContaining({
          [PERPS_EVENT_PROPERTY.BUTTON_CLICKED]:
            PERPS_EVENT_VALUE.BUTTON_CLICKED.WITHDRAW,
          [PERPS_EVENT_PROPERTY.IS_GEO_BLOCKED]: true,
        }),
      );
    });
  });

  describe('handleWithdraw - eligible user geo-block tracking', () => {
    it('tracks eligible withdrawal with IS_GEO_BLOCKED: false', async () => {
      (useSelector as jest.Mock).mockReturnValue(true);

      const { result } = renderHook(() => usePerpsHomeActions());

      await act(async () => {
        await result.current.handleWithdraw();
      });

      // Should track withdrawal with IS_GEO_BLOCKED: false
      expect(mockTrack).toHaveBeenCalledWith(
        MetaMetricsEvents.PERPS_UI_INTERACTION,
        expect.objectContaining({
          [PERPS_EVENT_PROPERTY.BUTTON_CLICKED]:
            PERPS_EVENT_VALUE.BUTTON_CLICKED.WITHDRAW,
          [PERPS_EVENT_PROPERTY.IS_GEO_BLOCKED]: false,
        }),
      );
    });
  });

  describe('eligibility modal management', () => {
    it('closes eligibility modal when closeEligibilityModal is called', async () => {
      (useSelector as jest.Mock).mockReturnValue(false);

      const { result } = renderHook(() => usePerpsHomeActions());

      await act(async () => {
        await result.current.handleAddFunds();
      });

      expect(result.current.isEligibilityModalVisible).toBe(true);

      act(() => {
        result.current.closeEligibilityModal();
      });

      expect(result.current.isEligibilityModalVisible).toBe(false);
    });
  });

  describe('error handling with non-Error objects', () => {
    it('converts string error to Error object', async () => {
      mockEnsureArbitrumNetworkExists.mockRejectedValueOnce('String error');

      const onError = jest.fn();
      const { result } = renderHook(() => usePerpsHomeActions({ onError }));

      await act(async () => {
        await result.current.handleAddFunds();
      });

      await waitFor(() => {
        expect(result.current.error).toBeInstanceOf(Error);
        expect(result.current.error?.message).toBe('String error');
        expect(onError).toHaveBeenCalledWith(expect.any(Error), 'deposit');
      });
    });
  });
});
