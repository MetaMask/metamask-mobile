import React from 'react';
import { fireEvent, act } from '@testing-library/react-native';
import PerpsNotificationTooltip from './PerpsNotificationTooltip';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { usePerpsNotificationTooltip } from '../../hooks/usePerpsNotificationTooltip';
import { DevLogger } from '../../../../../core/SDKConnect/utils/DevLogger';

// Mock DevLogger
jest.mock('../../../../../core/SDKConnect/utils/DevLogger', () => ({
  DevLogger: {
    log: jest.fn(),
  },
}));

// Mock the hook with realistic behavior
jest.mock('../../hooks/usePerpsNotificationTooltip', () => ({
  usePerpsNotificationTooltip: jest.fn(),
}));

// Mock PerpsNotificationBottomSheet - proper React Native compatible mock
jest.mock('../PerpsNotificationBottomSheet', () => {
  const MockReact = jest.requireActual('react');
  const { Pressable, Text } = jest.requireActual('react-native');

  return jest.fn().mockImplementation(({ isVisible, onClose, testID }) => {
    if (!isVisible) return null;

    return MockReact.createElement(
      Pressable,
      {
        testID,
        onPress: onClose,
      },
      MockReact.createElement(Text, {}, 'Notification Bottom Sheet'),
    );
  });
});

describe('PerpsNotificationTooltip', () => {
  const mockOnComplete = jest.fn();
  const mockShowTooltip = jest.fn();
  const mockHideTooltip = jest.fn();
  const mockMarkFirstOrderCompleted = jest.fn();

  const defaultHookReturn = {
    isVisible: false,
    shouldShowTooltip: true,
    showTooltip: mockShowTooltip,
    hideTooltip: mockHideTooltip,
    markFirstOrderCompleted: mockMarkFirstOrderCompleted,
    hasPlacedFirstOrder: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (usePerpsNotificationTooltip as jest.Mock).mockReturnValue(
      defaultHookReturn,
    );
  });

  describe('Tooltip Display Logic', () => {
    it('should not render when shouldShowTooltip is false and isVisible is false', () => {
      (usePerpsNotificationTooltip as jest.Mock).mockReturnValue({
        ...defaultHookReturn,
        shouldShowTooltip: false,
        isVisible: false,
      });

      const { queryByTestId } = renderWithProvider(
        <PerpsNotificationTooltip
          orderSuccess={false}
          onComplete={mockOnComplete}
        />,
      );

      expect(queryByTestId('perps-order-view-notification-tooltip')).toBeNull();
    });

    it('should render when isVisible is true', () => {
      (usePerpsNotificationTooltip as jest.Mock).mockReturnValue({
        ...defaultHookReturn,
        isVisible: true,
      });

      const { getByText } = renderWithProvider(
        <PerpsNotificationTooltip
          orderSuccess={false}
          onComplete={mockOnComplete}
        />,
      );

      expect(getByText('Notification Bottom Sheet')).toBeTruthy();
    });
  });

  describe('Order Success Handling', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should show tooltip after delay when orderSuccess=true and shouldShowTooltip=true', () => {
      (usePerpsNotificationTooltip as jest.Mock).mockReturnValue({
        ...defaultHookReturn,
        shouldShowTooltip: true,
        isVisible: false,
      });

      renderWithProvider(
        <PerpsNotificationTooltip orderSuccess onComplete={mockOnComplete} />,
      );

      expect(mockShowTooltip).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(3000);
      });

      expect(mockShowTooltip).toHaveBeenCalledTimes(1);
      expect(DevLogger.log).toHaveBeenCalledWith(
        'PerpsNotificationTooltip: First order success, showing tooltip',
        expect.objectContaining({
          orderSuccess: true,
          shouldShowTooltip: true,
          timestamp: expect.any(String),
        }),
      );
    });

    it('should mark first order completed and call onComplete when orderSuccess=true but shouldShowTooltip=false', () => {
      (usePerpsNotificationTooltip as jest.Mock).mockReturnValue({
        ...defaultHookReturn,
        shouldShowTooltip: false,
        hasPlacedFirstOrder: false,
      });

      renderWithProvider(
        <PerpsNotificationTooltip orderSuccess onComplete={mockOnComplete} />,
      );

      expect(mockMarkFirstOrderCompleted).toHaveBeenCalledTimes(1);
      expect(mockOnComplete).toHaveBeenCalledTimes(1);
    });

    it('should not mark first order completed if hasPlacedFirstOrder=true', () => {
      (usePerpsNotificationTooltip as jest.Mock).mockReturnValue({
        ...defaultHookReturn,
        shouldShowTooltip: false,
        hasPlacedFirstOrder: true,
      });

      renderWithProvider(
        <PerpsNotificationTooltip orderSuccess onComplete={mockOnComplete} />,
      );

      expect(mockMarkFirstOrderCompleted).not.toHaveBeenCalled();
      expect(mockOnComplete).toHaveBeenCalledTimes(1);
    });

    it('should handle orderSuccess=false without any side effects', () => {
      renderWithProvider(
        <PerpsNotificationTooltip
          orderSuccess={false}
          onComplete={mockOnComplete}
        />,
      );

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(mockShowTooltip).not.toHaveBeenCalled();
      expect(mockMarkFirstOrderCompleted).not.toHaveBeenCalled();
      expect(mockOnComplete).not.toHaveBeenCalled();
    });
  });

  describe('Tooltip Close Handling', () => {
    it('should call hideTooltip, markFirstOrderCompleted and onComplete when bottom sheet is closed', () => {
      (usePerpsNotificationTooltip as jest.Mock).mockReturnValue({
        ...defaultHookReturn,
        isVisible: true,
      });

      const { getByTestId } = renderWithProvider(
        <PerpsNotificationTooltip
          orderSuccess={false}
          onComplete={mockOnComplete}
        />,
      );

      fireEvent.press(getByTestId('perps-order-view-notification-tooltip'));

      expect(mockHideTooltip).toHaveBeenCalledTimes(1);
      expect(mockMarkFirstOrderCompleted).toHaveBeenCalledTimes(1);
      expect(mockOnComplete).toHaveBeenCalledTimes(1);
      expect(DevLogger.log).toHaveBeenCalledWith(
        'PerpsNotificationTooltip: User closed tooltip',
        expect.objectContaining({
          timestamp: expect.any(String),
        }),
      );
    });

    it('should not call onComplete if not provided', () => {
      (usePerpsNotificationTooltip as jest.Mock).mockReturnValue({
        ...defaultHookReturn,
        isVisible: true,
      });

      const { getByTestId } = renderWithProvider(
        <PerpsNotificationTooltip orderSuccess={false} />,
      );

      fireEvent.press(getByTestId('perps-order-view-notification-tooltip'));

      expect(mockHideTooltip).toHaveBeenCalledTimes(1);
      expect(mockMarkFirstOrderCompleted).toHaveBeenCalledTimes(1);
      // onComplete should not be called since it wasn't provided
    });
  });

  describe('Props and Configuration', () => {
    it('should use custom testID when provided', () => {
      const customTestID = 'custom-notification-tooltip';

      (usePerpsNotificationTooltip as jest.Mock).mockReturnValue({
        ...defaultHookReturn,
        isVisible: true,
      });

      const { getByTestId } = renderWithProvider(
        <PerpsNotificationTooltip
          orderSuccess={false}
          onComplete={mockOnComplete}
          testID={customTestID}
        />,
      );

      expect(getByTestId(customTestID)).toBeTruthy();
    });

    it('should use default testID when not provided', () => {
      (usePerpsNotificationTooltip as jest.Mock).mockReturnValue({
        ...defaultHookReturn,
        isVisible: true,
      });

      const { getByTestId } = renderWithProvider(
        <PerpsNotificationTooltip
          orderSuccess={false}
          onComplete={mockOnComplete}
        />,
      );

      expect(getByTestId('perps-order-view-notification-tooltip')).toBeTruthy();
    });
  });

  describe('Component Lifecycle', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should handle prop changes correctly', () => {
      const { rerender } = renderWithProvider(
        <PerpsNotificationTooltip
          orderSuccess={false}
          onComplete={mockOnComplete}
        />,
      );

      expect(mockShowTooltip).not.toHaveBeenCalled();

      // Change orderSuccess to true
      rerender(
        <PerpsNotificationTooltip orderSuccess onComplete={mockOnComplete} />,
      );

      act(() => {
        jest.advanceTimersByTime(3000);
      });

      expect(mockShowTooltip).toHaveBeenCalled();
    });

    it('should clear timeout on unmount to prevent memory leaks', () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      const { unmount } = renderWithProvider(
        <PerpsNotificationTooltip orderSuccess onComplete={mockOnComplete} />,
      );

      // Verify timeout was created but not yet executed
      expect(mockShowTooltip).not.toHaveBeenCalled();

      // Unmount before timeout completes
      unmount();

      // Verify clearTimeout was called
      expect(clearTimeoutSpy).toHaveBeenCalled();

      // Advance timers to ensure showTooltip is not called after unmount
      act(() => {
        jest.advanceTimersByTime(3000);
      });

      expect(mockShowTooltip).not.toHaveBeenCalled();

      clearTimeoutSpy.mockRestore();
    });

    it('should clear previous timeout when effect re-runs', () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      const { rerender } = renderWithProvider(
        <PerpsNotificationTooltip orderSuccess onComplete={mockOnComplete} />,
      );

      // Verify first timeout was created
      expect(mockShowTooltip).not.toHaveBeenCalled();

      // Change a dependency to trigger effect re-run
      const newOnComplete = jest.fn();
      rerender(
        <PerpsNotificationTooltip orderSuccess onComplete={newOnComplete} />,
      );

      // Verify clearTimeout was called (previous timeout cancelled)
      expect(clearTimeoutSpy).toHaveBeenCalled();

      // Complete the new timeout
      act(() => {
        jest.advanceTimersByTime(3000);
      });

      // Verify showTooltip was called only once (from the new timeout)
      expect(mockShowTooltip).toHaveBeenCalledTimes(1);

      clearTimeoutSpy.mockRestore();
    });

    it('should not create multiple timeouts on component re-renders without dependency changes', () => {
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

      const { rerender } = renderWithProvider(
        <PerpsNotificationTooltip orderSuccess onComplete={mockOnComplete} />,
      );

      // Verify first timeout was created
      expect(setTimeoutSpy).toHaveBeenCalledTimes(1);

      // Force re-render with same props (no dependency changes)
      rerender(
        <PerpsNotificationTooltip orderSuccess onComplete={mockOnComplete} />,
      );

      // Should still only have one setTimeout call (useEffect didn't re-run)
      expect(setTimeoutSpy).toHaveBeenCalledTimes(1);

      // Complete the timeout
      act(() => {
        jest.advanceTimersByTime(3000);
      });

      // Verify showTooltip was called only once
      expect(mockShowTooltip).toHaveBeenCalledTimes(1);

      setTimeoutSpy.mockRestore();
    });
  });
});
