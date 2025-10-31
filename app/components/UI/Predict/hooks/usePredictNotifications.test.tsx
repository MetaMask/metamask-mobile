import { renderHook } from '@testing-library/react-native';
import { useContext } from 'react';
import { useSelector } from 'react-redux';
import { usePredictNotifications } from './usePredictNotifications';
import {
  ToastContext,
  ToastVariants,
} from '../../../../component-library/components/Toast';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import Engine from '../../../../core/Engine';

// Mock dependencies
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useContext: jest.fn(),
}));
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));
jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      deleteNotification: jest.fn(),
    },
  },
}));

describe('usePredictNotifications', () => {
  const mockToastRef = {
    current: {
      showToast: jest.fn(),
    },
  };
  const mockDeleteNotification = jest.fn();
  const mockUseContext = useContext as jest.Mock;
  const mockUseSelector = useSelector as jest.Mock;

  let mockState: {
    engine: {
      backgroundState: {
        PredictController: {
          activeOrders: Record<string, unknown>;
          notifications: { orderId: string; status: string }[];
        };
      };
    };
  } = {
    engine: {
      backgroundState: {
        PredictController: {
          activeOrders: {},
          notifications: [],
        },
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    (Engine.context.PredictController.deleteNotification as jest.Mock) =
      mockDeleteNotification;

    mockUseContext.mockImplementation((context) => {
      if (context === ToastContext) {
        return { toastRef: mockToastRef };
      }
      return {};
    });

    mockUseSelector.mockImplementation((selector) => selector(mockState));

    mockState = {
      engine: {
        backgroundState: {
          PredictController: {
            activeOrders: {},
            notifications: [],
          },
        },
      },
    };
  });

  describe('initial state', () => {
    it('returns activeOrders from state', () => {
      const mockActiveOrders = {
        'order-1': {
          id: 'order-1',
          marketId: 'market-1',
          outcomeId: 'outcome-1',
          size: 100,
          price: 0.5,
        },
        'order-2': {
          id: 'order-2',
          marketId: 'market-2',
          outcomeId: 'outcome-2',
          size: 200,
          price: 0.75,
        },
      };

      mockState.engine.backgroundState.PredictController.activeOrders =
        mockActiveOrders;

      const { result } = renderHook(() => usePredictNotifications());

      expect(result.current.activeOrders).toEqual(
        Object.values(mockActiveOrders),
      );
    });

    it('returns empty array when no active orders', () => {
      const { result } = renderHook(() => usePredictNotifications());

      expect(result.current.activeOrders).toEqual([]);
    });
  });

  describe('notification handling', () => {
    const mockOrder = {
      id: 'order-1',
      marketId: 'market-1',
      outcomeId: 'outcome-1',
      size: 100,
      price: 0.5,
    };

    beforeEach(() => {
      mockState.engine.backgroundState.PredictController.activeOrders = {
        'order-1': mockOrder,
      };
    });

    it('shows success toast when notification status is filled', () => {
      const notification = {
        orderId: 'order-1',
        status: 'filled',
      };
      mockState.engine.backgroundState.PredictController.notifications = [
        notification,
      ];

      renderHook(() => usePredictNotifications());

      expect(mockToastRef.current.showToast).toHaveBeenCalledWith({
        variant: ToastVariants.Icon,
        iconName: IconName.CheckBold,
        labelOptions: [{ label: 'Order completed' }],
        hasNoTimeout: false,
      });
      expect(mockDeleteNotification).toHaveBeenCalledWith('order-1');
    });

    it('shows error toast when notification status is error', () => {
      const notification = {
        orderId: 'order-1',
        status: 'error',
      };
      mockState.engine.backgroundState.PredictController.notifications = [
        notification,
      ];

      renderHook(() => usePredictNotifications());

      expect(mockToastRef.current.showToast).toHaveBeenCalledWith({
        variant: ToastVariants.Icon,
        iconName: IconName.Warning,
        labelOptions: [{ label: 'Order failed' }],
        hasNoTimeout: false,
      });
      expect(mockDeleteNotification).toHaveBeenCalledWith('order-1');
    });

    it('shows pending toast when notification status is pending', () => {
      const notification = {
        orderId: 'order-1',
        status: 'pending',
      };
      mockState.engine.backgroundState.PredictController.notifications = [
        notification,
      ];

      renderHook(() => usePredictNotifications());

      expect(mockToastRef.current.showToast).toHaveBeenCalledWith({
        variant: ToastVariants.Icon,
        iconName: IconName.Warning,
        labelOptions: [{ label: 'Order pending' }],
        hasNoTimeout: false,
      });
      expect(mockDeleteNotification).toHaveBeenCalledWith('order-1');
    });

    it('does not show toast for unknown notification status', () => {
      const notification = {
        orderId: 'order-1',
        status: 'unknown-status',
      };
      mockState.engine.backgroundState.PredictController.notifications = [
        notification,
      ];

      renderHook(() => usePredictNotifications());

      expect(mockToastRef.current.showToast).not.toHaveBeenCalled();
      expect(mockDeleteNotification).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('does not process notifications when no notifications exist', () => {
      mockState.engine.backgroundState.PredictController.notifications = [];

      renderHook(() => usePredictNotifications());

      expect(mockToastRef.current.showToast).not.toHaveBeenCalled();
      expect(mockDeleteNotification).not.toHaveBeenCalled();
    });

    it('does not process notification when corresponding order does not exist', () => {
      const notification = {
        orderId: 'non-existent-order',
        status: 'filled',
      };
      mockState.engine.backgroundState.PredictController.notifications = [
        notification,
      ];

      renderHook(() => usePredictNotifications());

      expect(mockToastRef.current.showToast).not.toHaveBeenCalled();
      expect(mockDeleteNotification).not.toHaveBeenCalled();
    });

    it('handles multiple notifications by processing the first one', () => {
      const mockOrder1 = { id: 'order-1', marketId: 'market-1' };
      const mockOrder2 = { id: 'order-2', marketId: 'market-2' };

      mockState.engine.backgroundState.PredictController.activeOrders = {
        'order-1': mockOrder1,
        'order-2': mockOrder2,
      };

      const notifications = [
        { orderId: 'order-1', status: 'filled' },
        { orderId: 'order-2', status: 'error' },
      ];
      mockState.engine.backgroundState.PredictController.notifications =
        notifications;

      renderHook(() => usePredictNotifications());

      expect(mockToastRef.current.showToast).toHaveBeenCalledTimes(1);
      expect(mockToastRef.current.showToast).toHaveBeenCalledWith({
        variant: ToastVariants.Icon,
        iconName: IconName.CheckBold,
        labelOptions: [{ label: 'Order completed' }],
        hasNoTimeout: false,
      });
      expect(mockDeleteNotification).toHaveBeenCalledWith('order-1');
    });

    it('handles null toastRef gracefully', () => {
      mockUseContext.mockImplementation((context) => {
        if (context === ToastContext) {
          return { toastRef: null };
        }
        return {};
      });

      const notification = {
        orderId: 'order-1',
        status: 'filled',
      };
      mockState.engine.backgroundState.PredictController.activeOrders = {
        'order-1': { id: 'order-1' },
      };
      mockState.engine.backgroundState.PredictController.notifications = [
        notification,
      ];

      expect(() => {
        renderHook(() => usePredictNotifications());
      }).not.toThrow();

      expect(mockDeleteNotification).toHaveBeenCalledWith('order-1');
    });
  });

  describe('effect dependencies', () => {
    it('re-runs effect when activeOrdersState changes', () => {
      const { rerender } = renderHook(() => usePredictNotifications());

      expect(mockToastRef.current.showToast).not.toHaveBeenCalled();

      const notification = {
        orderId: 'order-1',
        status: 'filled',
      };
      const order = { id: 'order-1', marketId: 'market-1' };

      mockState.engine.backgroundState.PredictController.notifications = [
        notification,
      ];
      mockState.engine.backgroundState.PredictController.activeOrders = {
        'order-1': order,
      };

      rerender({});

      expect(mockToastRef.current.showToast).toHaveBeenCalledWith({
        variant: ToastVariants.Icon,
        iconName: IconName.CheckBold,
        labelOptions: [{ label: 'Order completed' }],
        hasNoTimeout: false,
      });
    });

    it('re-runs effect when notifications change', () => {
      const order = { id: 'order-1', marketId: 'market-1' };
      mockState.engine.backgroundState.PredictController.activeOrders = {
        'order-1': order,
      };

      const { rerender } = renderHook(() => usePredictNotifications());

      expect(mockToastRef.current.showToast).not.toHaveBeenCalled();

      const notification = {
        orderId: 'order-1',
        status: 'error',
      };
      mockState.engine.backgroundState.PredictController.notifications = [
        notification,
      ];

      rerender({});

      expect(mockToastRef.current.showToast).toHaveBeenCalledWith({
        variant: ToastVariants.Icon,
        iconName: IconName.Warning,
        labelOptions: [{ label: 'Order failed' }],
        hasNoTimeout: false,
      });
    });
  });

  describe('memoization', () => {
    it('memoizes activeOrders array correctly', () => {
      const mockActiveOrders = {
        'order-1': { id: 'order-1', marketId: 'market-1' },
        'order-2': { id: 'order-2', marketId: 'market-2' },
      };

      mockState.engine.backgroundState.PredictController.activeOrders =
        mockActiveOrders;

      const { result, rerender } = renderHook(() => usePredictNotifications());

      const firstActiveOrders = result.current.activeOrders;

      rerender({});

      const secondActiveOrders = result.current.activeOrders;

      expect(firstActiveOrders).toBe(secondActiveOrders);
      expect(firstActiveOrders).toEqual(Object.values(mockActiveOrders));
    });

    it('creates new activeOrders array when activeOrdersState changes', () => {
      const { result, rerender } = renderHook(() => usePredictNotifications());

      const initialActiveOrders = result.current.activeOrders;

      mockState.engine.backgroundState.PredictController.activeOrders = {
        'order-1': { id: 'order-1', marketId: 'market-1' },
      };

      rerender({});

      const newActiveOrders = result.current.activeOrders;

      expect(initialActiveOrders).not.toBe(newActiveOrders);
      expect(newActiveOrders).toEqual([
        { id: 'order-1', marketId: 'market-1' },
      ]);
    });
  });

  describe('integration with controller', () => {
    it('calls deleteNotification with correct orderId after showing toast', () => {
      const notification = {
        orderId: 'order-123',
        status: 'filled',
      };
      const order = { id: 'order-123', marketId: 'market-1' };

      mockState.engine.backgroundState.PredictController.notifications = [
        notification,
      ];
      mockState.engine.backgroundState.PredictController.activeOrders = {
        'order-123': order,
      };

      renderHook(() => usePredictNotifications());

      expect(mockDeleteNotification).toHaveBeenCalledWith('order-123');
      expect(mockDeleteNotification).toHaveBeenCalledTimes(1);
    });

    it('does not call deleteNotification when no toast is shown', () => {
      const notification = {
        orderId: 'order-1',
        status: 'unknown-status',
      };
      const order = { id: 'order-1', marketId: 'market-1' };

      mockState.engine.backgroundState.PredictController.notifications = [
        notification,
      ];
      mockState.engine.backgroundState.PredictController.activeOrders = {
        'order-1': order,
      };

      renderHook(() => usePredictNotifications());

      expect(mockDeleteNotification).not.toHaveBeenCalled();
    });
  });
});
