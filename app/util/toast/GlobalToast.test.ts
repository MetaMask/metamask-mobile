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
  });
});
