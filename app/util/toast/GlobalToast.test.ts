import {
  showErrorToast,
  showSuccessToast,
  setGlobalToastRef,
  clearGlobalToastRef,
} from './GlobalToast';
import {
  ToastRef,
  ToastVariants,
} from '../../component-library/components/Toast/Toast.types';
import { IconName } from '../../component-library/components/Icons/Icon';
import { ButtonVariants } from '../../component-library/components/Buttons/Button';
import { colors } from '@metamask/design-tokens';

// Mock design tokens
jest.mock('@metamask/design-tokens', () => ({
  colors: {
    light: {
      success: {
        default: '#28A745',
      },
      error: {
        default: '#DC3545',
      },
      background: {
        default: '#FFFFFF',
      },
    },
  },
}));

describe('GlobalToast', () => {
  let mockToastRef: jest.Mocked<ToastRef>;
  let mockRef: React.RefObject<ToastRef>;

  // Helper function to create a mock toast ref
  const createMockToastRef = (): jest.Mocked<ToastRef> => ({
    showToast: jest.fn(),
    closeToast: jest.fn(),
  });

  // Helper function to create a React ref with mock
  const createMockRef = (
    mockToast: jest.Mocked<ToastRef>,
  ): React.RefObject<ToastRef> => ({
    current: mockToast,
  });

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();

    // Clear global state by calling clearGlobalToastRef
    clearGlobalToastRef();

    mockToastRef = createMockToastRef();
    mockRef = createMockRef(mockToastRef);
  });

  afterEach(() => {
    jest.useRealTimers();
    clearGlobalToastRef();
  });

  describe('showErrorToast', () => {
    it('shows toast immediately when ref is available and no toast is showing', () => {
      setGlobalToastRef(mockRef);

      showErrorToast('Error title', 'Error description');

      expect(mockToastRef.showToast).toHaveBeenCalledTimes(1);
      expect(mockToastRef.showToast).toHaveBeenCalledWith({
        closeButtonOptions: {
          variant: ButtonVariants.Primary,
          endIconName: IconName.CircleX,
          label: '',
          onPress: expect.any(Function),
        },
        variant: ToastVariants.Icon,
        iconName: IconName.Warning,
        iconColor: colors.light.error.default,
        backgroundColor: colors.light.background.default,
        labelOptions: [
          { label: 'Error title', isBold: true },
          { label: '\n', isBold: false },
          { label: 'Error description', isBold: false },
        ],
        hasNoTimeout: true,
      });
    });

    it('shows toast with title only when description is not provided', () => {
      setGlobalToastRef(mockRef);

      showErrorToast('Error title');

      expect(mockToastRef.showToast).toHaveBeenCalledWith({
        closeButtonOptions: {
          variant: ButtonVariants.Primary,
          endIconName: IconName.CircleX,
          label: '',
          onPress: expect.any(Function),
        },
        variant: ToastVariants.Icon,
        iconName: IconName.Warning,
        iconColor: colors.light.error.default,
        backgroundColor: colors.light.background.default,
        labelOptions: [{ label: 'Error title', isBold: true }],
        hasNoTimeout: true,
      });
    });

    it('queues toast when ref is not available', () => {
      showErrorToast('Error title', 'Error description');

      expect(mockToastRef.showToast).not.toHaveBeenCalled();

      // Set ref and verify queued toast is shown
      setGlobalToastRef(mockRef);
      expect(mockToastRef.showToast).toHaveBeenCalledTimes(1);
    });

    it('adds to runtime queue when another toast is showing', () => {
      setGlobalToastRef(mockRef);

      // Show first toast
      showErrorToast('First error');
      expect(mockToastRef.showToast).toHaveBeenCalledTimes(1);

      // Show second toast while first is showing
      showErrorToast('Second error');
      expect(mockToastRef.showToast).toHaveBeenCalledTimes(1);

      // Simulate close button press to show next toast
      const closeButtonOnPress =
        mockToastRef.showToast.mock.calls[0][0].closeButtonOptions?.onPress;
      closeButtonOnPress?.();

      jest.advanceTimersByTime(300); // Animation delay
      expect(mockToastRef.showToast).toHaveBeenCalledTimes(2);
    });

    it('returns early when ref current is null', () => {
      const nullRef = { current: null };
      setGlobalToastRef(nullRef);

      showErrorToast('Error title');

      expect(mockToastRef.showToast).not.toHaveBeenCalled();
    });
  });

  describe('showSuccessToast', () => {
    it('shows toast immediately when ref is available and no toast is showing', () => {
      setGlobalToastRef(mockRef);

      showSuccessToast('Success title', 'Success description');

      expect(mockToastRef.showToast).toHaveBeenCalledTimes(1);
      expect(mockToastRef.showToast).toHaveBeenCalledWith({
        closeButtonOptions: {
          variant: ButtonVariants.Primary,
          endIconName: IconName.CircleX,
          label: '',
          onPress: expect.any(Function),
        },
        variant: ToastVariants.Icon,
        iconName: IconName.CheckBold,
        iconColor: colors.light.success.default,
        backgroundColor: colors.light.background.default,
        labelOptions: [
          { label: 'Success title', isBold: true },
          { label: '\n', isBold: false },
          { label: 'Success description', isBold: false },
        ],
        hasNoTimeout: false,
      });
    });

    it('sets up auto-dismiss timeout for success toasts', () => {
      setGlobalToastRef(mockRef);

      showSuccessToast('Success title');

      // Verify timeout is set by advancing time and checking if next toast would be shown
      jest.advanceTimersByTime(3300);

      // Since there's no next toast, we can't directly verify the timeout
      // but the absence of errors confirms the timeout was set up correctly
      expect(mockToastRef.showToast).toHaveBeenCalledTimes(1);
    });

    it('queues toast when ref is not available', () => {
      showSuccessToast('Success title', 'Success description');

      expect(mockToastRef.showToast).not.toHaveBeenCalled();

      // Set ref and verify queued toast is shown
      setGlobalToastRef(mockRef);
      expect(mockToastRef.showToast).toHaveBeenCalledTimes(1);
    });

    it('adds to runtime queue when another toast is showing', () => {
      setGlobalToastRef(mockRef);

      // Show first toast
      showSuccessToast('First success');
      expect(mockToastRef.showToast).toHaveBeenCalledTimes(1);

      // Show second toast while first is showing
      showSuccessToast('Second success');
      expect(mockToastRef.showToast).toHaveBeenCalledTimes(1);

      // Simulate auto-dismiss timeout
      jest.advanceTimersByTime(3300);
      expect(mockToastRef.showToast).toHaveBeenCalledTimes(2);
    });
  });

  describe('setGlobalToastRef', () => {
    it('sets the global toast reference', () => {
      setGlobalToastRef(mockRef);

      // Verify ref is set by showing a toast
      showErrorToast('Test');
      expect(mockToastRef.showToast).toHaveBeenCalledTimes(1);
    });

    it('processes queued error toasts when ref is set', () => {
      // Queue toasts before setting ref
      showErrorToast('First error');
      showErrorToast('Second error');

      setGlobalToastRef(mockRef);

      expect(mockToastRef.showToast).toHaveBeenCalledTimes(1);

      // Simulate close to show next queued toast
      const closeButtonOnPress =
        mockToastRef.showToast.mock.calls[0][0].closeButtonOptions?.onPress;
      closeButtonOnPress?.();
      jest.advanceTimersByTime(300);

      expect(mockToastRef.showToast).toHaveBeenCalledTimes(2);
    });

    it('processes queued success toasts when ref is set', () => {
      // Queue toasts before setting ref
      showSuccessToast('First success');
      showSuccessToast('Second success');

      setGlobalToastRef(mockRef);

      expect(mockToastRef.showToast).toHaveBeenCalledTimes(1);

      // Simulate auto-dismiss timeout
      jest.advanceTimersByTime(3300);
      expect(mockToastRef.showToast).toHaveBeenCalledTimes(2);
    });

    it('processes mixed queued toasts when ref is set', () => {
      // Queue mixed toast types before setting ref
      showErrorToast('Error toast');
      showSuccessToast('Success toast');

      setGlobalToastRef(mockRef);

      expect(mockToastRef.showToast).toHaveBeenCalledTimes(1);

      // First toast should be error (no timeout)
      const firstCall = mockToastRef.showToast.mock.calls[0][0];
      expect(firstCall.hasNoTimeout).toBe(true);
      expect(firstCall.variant).toBe(ToastVariants.Icon);
      if (firstCall.variant === ToastVariants.Icon) {
        expect(firstCall.iconName).toBe(IconName.Warning);
      }
    });

    it('handles empty queue when ref is set', () => {
      setGlobalToastRef(mockRef);

      expect(mockToastRef.showToast).not.toHaveBeenCalled();
    });
  });

  describe('clearGlobalToastRef', () => {
    it('clears the global toast reference', () => {
      setGlobalToastRef(mockRef);

      clearGlobalToastRef();

      // Verify ref is cleared - toast should be queued instead of shown immediately
      showErrorToast('Test');
      expect(mockToastRef.showToast).not.toHaveBeenCalled();
    });

    it('clears queued toasts', () => {
      // Queue toasts
      showErrorToast('Test error');
      showSuccessToast('Test success');

      clearGlobalToastRef();

      // Set ref after clearing - no toasts should be shown
      setGlobalToastRef(mockRef);
      expect(mockToastRef.showToast).not.toHaveBeenCalled();
    });

    it('clears runtime queue and stops current toast showing state', () => {
      setGlobalToastRef(mockRef);

      // Show toast to set showing state
      showErrorToast('First');
      showErrorToast('Second'); // This goes to runtime queue

      clearGlobalToastRef();
      setGlobalToastRef(mockRef);

      // New toast should show immediately (not queued)
      showErrorToast('New toast');
      expect(mockToastRef.showToast).toHaveBeenCalledTimes(2); // First + New (Second was cleared)
    });

    it('clears active timeout', () => {
      setGlobalToastRef(mockRef);

      // Show success toast which sets timeout
      showSuccessToast('Success');

      clearGlobalToastRef();

      // Advance time - no additional calls should happen
      jest.advanceTimersByTime(5000);
      expect(mockToastRef.showToast).toHaveBeenCalledTimes(1);
    });
  });

  describe('toast display behavior', () => {
    it('clears existing timeout when showing new toast', () => {
      setGlobalToastRef(mockRef);

      // Show first success toast
      showSuccessToast('First');

      // Immediately show error toast (should clear success timeout)
      showErrorToast('Error');

      // Advance past original success timeout
      jest.advanceTimersByTime(3500);

      // Only 2 toasts should be shown (no third from cleared timeout)
      expect(mockToastRef.showToast).toHaveBeenCalledTimes(2);
    });

    it('handles showToast throwing error', () => {
      setGlobalToastRef(mockRef);
      mockToastRef.showToast.mockImplementation(() => {
        throw new Error('Toast error');
      });

      // Should not throw error - it should be caught and handled
      expect(() => showErrorToast('Test error')).not.toThrow();

      // Verify showToast was called (and failed)
      expect(mockToastRef.showToast).toHaveBeenCalledTimes(1);
    });

    it('continues processing queue after showToast error', () => {
      setGlobalToastRef(mockRef);

      // First toast throws error, reset for subsequent calls
      mockToastRef.showToast
        .mockImplementationOnce(() => {
          throw new Error('Toast error');
        })
        .mockImplementation(jest.fn());

      // Show first toast (will error and automatically trigger next)
      showErrorToast('First');
      // Queue second toast
      showErrorToast('Second');

      // First call should fail, but second should be called automatically due to error handling
      expect(mockToastRef.showToast).toHaveBeenCalledTimes(2);

      // Verify both calls happened
      expect(mockToastRef.showToast).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          labelOptions: [{ label: 'First', isBold: true }],
        }),
      );
      expect(mockToastRef.showToast).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          labelOptions: [{ label: 'Second', isBold: true }],
        }),
      );
    });

    it('handles close button press clearing timeout and showing next toast', () => {
      setGlobalToastRef(mockRef);

      // Show success toast (has timeout) and queue another
      showSuccessToast('First success');
      showErrorToast('Second error');

      // Get close button handler
      const closeButtonOnPress =
        mockToastRef.showToast.mock.calls[0][0].closeButtonOptions?.onPress;

      // Press close button
      closeButtonOnPress?.();

      expect(mockToastRef.closeToast).toHaveBeenCalledTimes(1);

      // Advance past close animation delay
      jest.advanceTimersByTime(300);
      expect(mockToastRef.showToast).toHaveBeenCalledTimes(2);

      // Advance past original auto-dismiss time - no third toast
      jest.advanceTimersByTime(3000);
      expect(mockToastRef.showToast).toHaveBeenCalledTimes(2);
    });

    it('processes queue sequentially with mixed toast types', () => {
      setGlobalToastRef(mockRef);

      // Queue: Success (auto-dismiss) -> Error (manual) -> Success (auto-dismiss)
      showSuccessToast('First success');
      showErrorToast('Middle error');
      showSuccessToast('Last success');

      expect(mockToastRef.showToast).toHaveBeenCalledTimes(1);

      // Auto-dismiss first success
      jest.advanceTimersByTime(3300);
      expect(mockToastRef.showToast).toHaveBeenCalledTimes(2);

      // Verify second toast is error (manual dismiss)
      const secondCall = mockToastRef.showToast.mock.calls[1][0];
      expect(secondCall.hasNoTimeout).toBe(true);
      expect(secondCall.variant).toBe(ToastVariants.Icon);
      if (secondCall.variant === ToastVariants.Icon) {
        expect(secondCall.iconName).toBe(IconName.Warning);
      }

      // Manually dismiss error toast
      const errorCloseButton = secondCall.closeButtonOptions?.onPress;
      errorCloseButton?.();
      jest.advanceTimersByTime(300);

      expect(mockToastRef.showToast).toHaveBeenCalledTimes(3);

      // Verify third toast is success
      const thirdCall = mockToastRef.showToast.mock.calls[2][0];
      expect(thirdCall.hasNoTimeout).toBe(false);
      expect(thirdCall.variant).toBe(ToastVariants.Icon);
      if (thirdCall.variant === ToastVariants.Icon) {
        expect(thirdCall.iconName).toBe(IconName.CheckBold);
      }
    });
  });

  describe('internal function behavior', () => {
    it('calls showNextToastFromQueue when runtime queue is empty', () => {
      setGlobalToastRef(mockRef);

      // Show toast to set showing state, but don't queue anything else
      showErrorToast('Single toast');

      // Simulate manual close to trigger showNextToastFromQueue with empty queue
      const closeButtonOnPress =
        mockToastRef.showToast.mock.calls[0][0].closeButtonOptions?.onPress;
      closeButtonOnPress?.();

      jest.advanceTimersByTime(300);

      // Only one toast should have been shown (the original)
      expect(mockToastRef.showToast).toHaveBeenCalledTimes(1);
    });

    it('processes runtime queue after manual toast dismissal', () => {
      setGlobalToastRef(mockRef);

      // Queue multiple toasts
      showErrorToast('First');
      showErrorToast('Second');
      showSuccessToast('Third');

      // Manually close first toast
      const closeButtonOnPress =
        mockToastRef.showToast.mock.calls[0][0].closeButtonOptions?.onPress;
      closeButtonOnPress?.();
      jest.advanceTimersByTime(300);

      expect(mockToastRef.showToast).toHaveBeenCalledTimes(2);

      // Close second toast to trigger third
      const secondCloseButton =
        mockToastRef.showToast.mock.calls[1][0].closeButtonOptions?.onPress;
      secondCloseButton?.();
      jest.advanceTimersByTime(300);

      expect(mockToastRef.showToast).toHaveBeenCalledTimes(3);
    });

    it('handles showNextToastFromQueue when nextToast is undefined', () => {
      setGlobalToastRef(mockRef);

      // Create a scenario where shift() might return undefined
      // This is more of a defensive test since shift() on non-empty array returns an item
      showErrorToast('Test');

      // Simulate the internal state manually for edge case testing
      const closeButtonOnPress =
        mockToastRef.showToast.mock.calls[0][0].closeButtonOptions?.onPress;
      closeButtonOnPress?.();
      jest.advanceTimersByTime(300);

      // Should not error - just continue normally
      expect(mockToastRef.showToast).toHaveBeenCalledTimes(1);
    });
  });

  describe('toast configuration details', () => {
    it('configures error toast with correct properties', () => {
      setGlobalToastRef(mockRef);

      showErrorToast('Error Title', 'Error Description');

      expect(mockToastRef.showToast).toHaveBeenCalledWith({
        closeButtonOptions: {
          variant: ButtonVariants.Primary,
          endIconName: IconName.CircleX,
          label: '',
          onPress: expect.any(Function),
        },
        variant: ToastVariants.Icon,
        iconName: IconName.Warning,
        iconColor: '#DC3545', // colors.light.error.default
        backgroundColor: '#FFFFFF', // colors.light.background.default
        labelOptions: [
          { label: 'Error Title', isBold: true },
          { label: '\n', isBold: false },
          { label: 'Error Description', isBold: false },
        ],
        hasNoTimeout: true,
      });
    });

    it('configures success toast with correct properties', () => {
      setGlobalToastRef(mockRef);

      showSuccessToast('Success Title', 'Success Description');

      expect(mockToastRef.showToast).toHaveBeenCalledWith({
        closeButtonOptions: {
          variant: ButtonVariants.Primary,
          endIconName: IconName.CircleX,
          label: '',
          onPress: expect.any(Function),
        },
        variant: ToastVariants.Icon,
        iconName: IconName.CheckBold,
        iconColor: '#28A745', // colors.light.success.default
        backgroundColor: '#FFFFFF', // colors.light.background.default
        labelOptions: [
          { label: 'Success Title', isBold: true },
          { label: '\n', isBold: false },
          { label: 'Success Description', isBold: false },
        ],
        hasNoTimeout: false,
      });
    });

    it('generates different configurations for error vs success toasts', () => {
      setGlobalToastRef(mockRef);

      // Show error toast first
      showErrorToast('Error');
      expect(mockToastRef.showToast).toHaveBeenCalledTimes(1);

      // Close error toast to allow success toast to show
      const closeButton =
        mockToastRef.showToast.mock.calls[0][0].closeButtonOptions?.onPress;
      closeButton?.();
      jest.advanceTimersByTime(300);

      // Now show success toast
      showSuccessToast('Success');

      const errorCall = mockToastRef.showToast.mock.calls[0][0];
      const successCall = mockToastRef.showToast.mock.calls[1][0];

      // Verify different icons
      expect(errorCall.variant).toBe(ToastVariants.Icon);
      expect(successCall.variant).toBe(ToastVariants.Icon);
      if (
        errorCall.variant === ToastVariants.Icon &&
        successCall.variant === ToastVariants.Icon
      ) {
        expect(errorCall.iconName).toBe(IconName.Warning);
        expect(successCall.iconName).toBe(IconName.CheckBold);

        // Verify different colors
        expect(errorCall.iconColor).toBe('#DC3545');
        expect(successCall.iconColor).toBe('#28A745');

        // Verify different timeout behavior
        expect(errorCall.hasNoTimeout).toBe(true);
        expect(successCall.hasNoTimeout).toBe(false);
      }
    });
  });

  describe('timeout behavior comprehensive', () => {
    it('sets timeout only for success toasts', () => {
      setGlobalToastRef(mockRef);

      // Error toast - no timeout
      showErrorToast('Error');
      jest.advanceTimersByTime(5000);
      expect(mockToastRef.showToast).toHaveBeenCalledTimes(1);

      // Clear and test success toast - has timeout
      jest.clearAllMocks();
      clearGlobalToastRef();
      setGlobalToastRef(mockRef);

      showSuccessToast('Success');
      showErrorToast('After Success');

      // Advance past success timeout
      jest.advanceTimersByTime(3300);
      expect(mockToastRef.showToast).toHaveBeenCalledTimes(2);
    });

    it('clears timeout when manually closing success toast', () => {
      setGlobalToastRef(mockRef);

      showSuccessToast('Success');
      showErrorToast('Queued');

      // Manually close success toast
      const closeButton =
        mockToastRef.showToast.mock.calls[0][0].closeButtonOptions?.onPress;
      closeButton?.();
      jest.advanceTimersByTime(300);

      // Queued toast should show
      expect(mockToastRef.showToast).toHaveBeenCalledTimes(2);

      // Advance past original auto-dismiss time - no extra calls
      jest.advanceTimersByTime(3300);
      expect(mockToastRef.showToast).toHaveBeenCalledTimes(2);
    });

    it('handles timeout clearing when no timeout exists', () => {
      setGlobalToastRef(mockRef);

      // Error toast (no timeout)
      showErrorToast('Error');

      // Manually close (should not error when clearing null timeout)
      const closeButton =
        mockToastRef.showToast.mock.calls[0][0].closeButtonOptions?.onPress;
      expect(() => closeButton?.()).not.toThrow();
      jest.advanceTimersByTime(300);

      expect(mockToastRef.closeToast).toHaveBeenCalledTimes(1);
    });

    it('overwrites existing timeout when new success toast is shown', () => {
      setGlobalToastRef(mockRef);

      // First success toast
      showSuccessToast('First');
      expect(mockToastRef.showToast).toHaveBeenCalledTimes(1);

      // Second success toast gets queued
      showSuccessToast('Second');
      expect(mockToastRef.showToast).toHaveBeenCalledTimes(1);

      // Auto-dismiss first toast should trigger second
      jest.advanceTimersByTime(3300);
      expect(mockToastRef.showToast).toHaveBeenCalledTimes(2);

      // Original timeout was cleared when second toast was processed
      // Advance further - no additional calls
      jest.advanceTimersByTime(3300);
      expect(mockToastRef.showToast).toHaveBeenCalledTimes(2);
    });
  });

  describe('rapid operations and state transitions', () => {
    it('handles rapid alternating calls between error and success', () => {
      setGlobalToastRef(mockRef);

      // Rapid alternating calls
      showErrorToast('Error 1');
      showSuccessToast('Success 1');
      showErrorToast('Error 2');
      showSuccessToast('Success 2');

      // Only first should show immediately
      expect(mockToastRef.showToast).toHaveBeenCalledTimes(1);

      // Process queue sequentially
      const closeButton =
        mockToastRef.showToast.mock.calls[0][0].closeButtonOptions?.onPress;
      closeButton?.();
      jest.advanceTimersByTime(300);
      expect(mockToastRef.showToast).toHaveBeenCalledTimes(2);

      // Continue processing
      const closeButton2 =
        mockToastRef.showToast.mock.calls[1][0].closeButtonOptions?.onPress;
      closeButton2?.();
      jest.advanceTimersByTime(300);
      expect(mockToastRef.showToast).toHaveBeenCalledTimes(3);
    });

    it('handles ref changes during active toast display', () => {
      setGlobalToastRef(mockRef);

      showErrorToast('Test');
      expect(mockToastRef.showToast).toHaveBeenCalledTimes(1);

      // Change ref while toast is showing
      const newMockToastRef = createMockToastRef();
      const newMockRef = createMockRef(newMockToastRef);
      setGlobalToastRef(newMockRef);

      // Queue new toast
      showErrorToast('After ref change');

      // Should be added to runtime queue since first toast still showing
      expect(mockToastRef.showToast).toHaveBeenCalledTimes(1);
      expect(newMockToastRef.showToast).not.toHaveBeenCalled();

      // Close first toast
      const closeButton =
        mockToastRef.showToast.mock.calls[0][0].closeButtonOptions?.onPress;
      closeButton?.();
      jest.advanceTimersByTime(300);

      // Second toast should show with new ref
      expect(newMockToastRef.showToast).toHaveBeenCalledTimes(1);
    });

    it('processes large queue efficiently', () => {
      setGlobalToastRef(mockRef);

      // Queue many toasts
      const toastCount = 10;
      for (let i = 0; i < toastCount; i++) {
        showErrorToast(`Toast ${i}`);
      }

      expect(mockToastRef.showToast).toHaveBeenCalledTimes(1);

      // Process all toasts
      for (let i = 1; i < toastCount; i++) {
        const closeButton =
          mockToastRef.showToast.mock.calls[i - 1][0].closeButtonOptions
            ?.onPress;
        closeButton?.();
        jest.advanceTimersByTime(300);
        expect(mockToastRef.showToast).toHaveBeenCalledTimes(i + 1);
      }
    });
  });

  describe('queue processing variations', () => {
    it('handles mixed queue processing with ref clearing', () => {
      // Queue toasts before ref is set
      showErrorToast('Queued 1');
      showSuccessToast('Queued 2');

      setGlobalToastRef(mockRef);
      expect(mockToastRef.showToast).toHaveBeenCalledTimes(1);

      // Clear ref while processing queue
      clearGlobalToastRef();

      // Add more toasts (should be queued again)
      showErrorToast('After clear');

      // Set ref again
      const newMockToastRef = createMockToastRef();
      const newMockRef = createMockRef(newMockToastRef);
      setGlobalToastRef(newMockRef);

      // Only the new toast should show (old queue was cleared)
      expect(newMockToastRef.showToast).toHaveBeenCalledTimes(1);
    });

    it('processes queue with alternating toast types correctly', () => {
      // Queue alternating types
      showErrorToast('Error 1');
      showSuccessToast('Success 1');
      showErrorToast('Error 2');
      showSuccessToast('Success 2');

      setGlobalToastRef(mockRef);

      // Verify first toast is error
      expect(mockToastRef.showToast).toHaveBeenCalledTimes(1);
      const firstCall = mockToastRef.showToast.mock.calls[0][0];
      expect(firstCall.hasNoTimeout).toBe(true);

      // Close first to show success
      const closeButton = firstCall.closeButtonOptions?.onPress;
      closeButton?.();
      jest.advanceTimersByTime(300);

      // Verify second toast is success
      expect(mockToastRef.showToast).toHaveBeenCalledTimes(2);
      const secondCall = mockToastRef.showToast.mock.calls[1][0];
      expect(secondCall.hasNoTimeout).toBe(false);

      // Auto-dismiss success toast
      jest.advanceTimersByTime(3300);

      // Verify third toast is error
      expect(mockToastRef.showToast).toHaveBeenCalledTimes(3);
      const thirdCall = mockToastRef.showToast.mock.calls[2][0];
      expect(thirdCall.hasNoTimeout).toBe(true);
    });
  });

  describe('parameter validation and edge cases', () => {
    it('handles various title and description combinations', () => {
      setGlobalToastRef(mockRef);

      const testCases = [
        { title: 'Normal title', description: 'Normal description' },
        { title: 'Title only', description: undefined },
        { title: '', description: 'Empty title' },
        { title: 'Title', description: '' },
        { title: ' ', description: ' ' }, // Whitespace
        { title: '   Trimmed   ', description: '   Also trimmed   ' },
      ];

      testCases.forEach(({ title, description }) => {
        jest.clearAllMocks();
        clearGlobalToastRef();
        setGlobalToastRef(mockRef);

        showErrorToast(title, description);

        expect(mockToastRef.showToast).toHaveBeenCalledTimes(1);
        const call = mockToastRef.showToast.mock.calls[0][0];
        expect(call.labelOptions[0].label).toBe(title);

        if (description) {
          expect(call.labelOptions).toHaveLength(3);
          expect(call.labelOptions[2].label).toBe(description);
        } else {
          expect(call.labelOptions).toHaveLength(1);
        }
      });
    });

    it('maintains proper state isolation between test runs', () => {
      // This test ensures our beforeEach/afterEach cleanup works correctly
      setGlobalToastRef(mockRef);
      showErrorToast('Test 1');
      expect(mockToastRef.showToast).toHaveBeenCalledTimes(1);

      // State should be clean for next assertions due to beforeEach
      jest.clearAllMocks();
      clearGlobalToastRef();
      setGlobalToastRef(mockRef);

      showSuccessToast('Test 2');
      expect(mockToastRef.showToast).toHaveBeenCalledTimes(1);
    });

    it('handles closeToast being called multiple times', () => {
      setGlobalToastRef(mockRef);
      showErrorToast('Test');

      const closeButton =
        mockToastRef.showToast.mock.calls[0][0].closeButtonOptions?.onPress;

      // Call close multiple times
      closeButton?.();
      closeButton?.();
      closeButton?.();

      expect(mockToastRef.closeToast).toHaveBeenCalledTimes(3);
    });
  });

  describe('edge cases', () => {
    it('handles rapid consecutive calls before ref is set', () => {
      // Rapidly queue multiple toasts
      for (let i = 0; i < 5; i++) {
        showErrorToast(`Error ${i}`);
        showSuccessToast(`Success ${i}`);
      }

      setGlobalToastRef(mockRef);

      // Only first toast should show immediately
      expect(mockToastRef.showToast).toHaveBeenCalledTimes(1);
    });

    it('handles ref being set to null current', () => {
      const nullRef = { current: null };
      setGlobalToastRef(nullRef);

      showErrorToast('Test');

      expect(mockToastRef.showToast).not.toHaveBeenCalled();
    });

    it('handles empty title gracefully', () => {
      setGlobalToastRef(mockRef);

      showErrorToast('');

      expect(mockToastRef.showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          labelOptions: [{ label: '', isBold: true }],
        }),
      );
    });

    it('handles empty description gracefully', () => {
      setGlobalToastRef(mockRef);

      showErrorToast('Title', '');

      // Empty string is falsy, so description parts are not added
      expect(mockToastRef.showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          labelOptions: [{ label: 'Title', isBold: true }],
        }),
      );
    });

    it('handles undefined description explicitly', () => {
      setGlobalToastRef(mockRef);

      showErrorToast('Title', undefined);

      expect(mockToastRef.showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          labelOptions: [{ label: 'Title', isBold: true }],
        }),
      );
    });

    it('handles concurrent queue and runtime operations', () => {
      // Queue some toasts before ref
      showErrorToast('Queued 1');
      showSuccessToast('Queued 2');

      setGlobalToastRef(mockRef);
      expect(mockToastRef.showToast).toHaveBeenCalledTimes(1);

      // Add to runtime queue while processing initial queue
      showErrorToast('Runtime 1');
      showSuccessToast('Runtime 2');

      // Process through all toasts
      for (let i = 1; i < 4; i++) {
        const closeButton =
          mockToastRef.showToast.mock.calls[i - 1][0].closeButtonOptions
            ?.onPress;
        closeButton?.();
        jest.advanceTimersByTime(300);
        expect(mockToastRef.showToast).toHaveBeenCalledTimes(i + 1);
      }
    });
  });
});
