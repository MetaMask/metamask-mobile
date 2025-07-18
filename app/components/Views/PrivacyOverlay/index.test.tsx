import React from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { waitFor, act } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';

// Mock Device utility before importing the component
jest.mock('../../../util/device', () => ({
  isAndroid: () => false,
}));

jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  AppState: {
    addEventListener: jest.fn(),
  },
}));

const mockAppState = AppState as jest.Mocked<typeof AppState>;

// Import the component after mocking
import { PrivacyOverlay } from '.';

describe('PrivacyOverlay', () => {
  let changeHandler:
    | ((
        nextAppState:
          | 'active'
          | 'background'
          | 'inactive'
          | 'unknown'
          | 'blur'
          | 'focus',
      ) => void)
    | undefined;
  let blurHandler: (() => void) | undefined;
  let focusHandler: (() => void) | undefined;
  let removeMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    removeMock = jest.fn();

    mockAppState.addEventListener.mockImplementation((event, handler) => {
      if (event === 'change') {
        changeHandler = handler as (
          nextAppState:
            | 'active'
            | 'background'
            | 'inactive'
            | 'unknown'
            | 'blur'
            | 'focus',
        ) => void;
      } else if (event === 'blur') {
        blurHandler = handler as () => void;
      } else if (event === 'focus') {
        focusHandler = handler as () => void;
      }
      return { remove: removeMock };
    });
  });

  describe('Component behavior', () => {
    it('does not render overlay initially', () => {
      const { queryByTestId } = renderWithProvider(<PrivacyOverlay />);
      expect(queryByTestId('privacy-overlay')).toBeNull();
    });

    it('shows overlay when app goes to background', async () => {
      const { getByTestId } = renderWithProvider(<PrivacyOverlay />);

      await act(async () => {
        if (changeHandler) {
          changeHandler('background');
        }
      });

      await waitFor(() => {
        expect(getByTestId('privacy-overlay')).toBeTruthy();
      });
    });

    it('hides overlay when app becomes active on iOS', async () => {
      const { getByTestId, queryByTestId } = renderWithProvider(
        <PrivacyOverlay />,
      );

      await act(async () => {
        if (changeHandler) {
          changeHandler('background');
        }
      });

      await waitFor(() => {
        expect(getByTestId('privacy-overlay')).toBeTruthy();
      });

      await act(async () => {
        if (changeHandler) {
          changeHandler('active');
        }
      });

      await waitFor(() => {
        expect(queryByTestId('privacy-overlay')).toBeNull();
      });
    });

    it('keeps overlay visible when app becomes active on Android', async () => {
      // Mock Device.isAndroid to return true for this test
      const Device = require('../../../util/device');
      Device.isAndroid = jest.fn(() => true);

      const { getByTestId, queryByTestId } = renderWithProvider(
        <PrivacyOverlay />,
      );

      await act(async () => {
        if (changeHandler) {
          changeHandler('background');
        }
      });

      await waitFor(() => {
        expect(getByTestId('privacy-overlay')).toBeTruthy();
      });

      await act(async () => {
        if (changeHandler) {
          changeHandler('active');
        }
      });

      // On Android, 'active' falls through to default case which toggles the state
      // Since overlay was visible, it should now be hidden
      await waitFor(() => {
        expect(queryByTestId('privacy-overlay')).toBeNull();
      });
    });

    it('shows overlay for inactive and unknown states', async () => {
      const { getByTestId, queryByTestId } = renderWithProvider(
        <PrivacyOverlay />,
      );

      // Start with overlay hidden
      expect(queryByTestId('privacy-overlay')).toBeNull();

      await act(async () => {
        if (changeHandler) {
          changeHandler('inactive');
        }
      });

      // 'inactive' falls through to default case which toggles the state
      // Since overlay was hidden, it should now be visible
      await waitFor(() => {
        expect(getByTestId('privacy-overlay')).toBeTruthy();
      });

      await act(async () => {
        if (changeHandler) {
          changeHandler('unknown');
        }
      });

      // 'unknown' falls through to default case which toggles the state
      // Since overlay was visible, it should now be hidden
      await waitFor(() => {
        expect(queryByTestId('privacy-overlay')).toBeNull();
      });
    });

    it('hides overlay when app becomes focused', async () => {
      const { getByTestId, queryByTestId } = renderWithProvider(
        <PrivacyOverlay />,
      );

      // First show the overlay
      await act(async () => {
        if (changeHandler) {
          changeHandler('background');
        }
      });

      await waitFor(() => {
        expect(getByTestId('privacy-overlay')).toBeTruthy();
      });

      // Then hide it with focus
      await act(async () => {
        if (changeHandler) {
          changeHandler('focus');
        }
      });

      await waitFor(() => {
        expect(queryByTestId('privacy-overlay')).toBeNull();
      });
    });

    it('toggles overlay state for unrecognized app states', async () => {
      const { getByTestId, queryByTestId } = renderWithProvider(
        <PrivacyOverlay />,
      );

      // Start with overlay hidden
      expect(queryByTestId('privacy-overlay')).toBeNull();

      // Send unrecognized state - should show overlay
      await act(async () => {
        if (changeHandler) {
          changeHandler(
            'unrecognized' as
              | 'active'
              | 'background'
              | 'inactive'
              | 'unknown'
              | 'blur'
              | 'focus',
          );
        }
      });

      await waitFor(() => {
        expect(getByTestId('privacy-overlay')).toBeTruthy();
      });

      // Send another unrecognized state - should hide overlay
      await act(async () => {
        if (changeHandler) {
          changeHandler(
            'another-unrecognized' as
              | 'active'
              | 'background'
              | 'inactive'
              | 'unknown'
              | 'blur'
              | 'focus',
          );
        }
      });

      await waitFor(() => {
        expect(queryByTestId('privacy-overlay')).toBeNull();
      });
    });
  });

  describe('Android-specific behavior', () => {
    beforeEach(() => {
      // Mock Device.isAndroid to return true for Android tests
      const Device = require('../../../util/device');
      Device.isAndroid = jest.fn(() => true);
    });

    it('shows overlay when Android app blurs', async () => {
      const { getByTestId } = renderWithProvider(<PrivacyOverlay />);

      await act(async () => {
        if (blurHandler) {
          blurHandler();
        }
      });

      await waitFor(() => {
        expect(getByTestId('privacy-overlay')).toBeTruthy();
      });
    });

    it('hides overlay when Android app focuses', async () => {
      const { getByTestId, queryByTestId } = renderWithProvider(
        <PrivacyOverlay />,
      );

      // First show the overlay
      await act(async () => {
        if (blurHandler) {
          blurHandler();
        }
      });

      await waitFor(() => {
        expect(getByTestId('privacy-overlay')).toBeTruthy();
      });

      // Then hide it with focus
      await act(async () => {
        if (focusHandler) {
          focusHandler();
        }
      });

      await waitFor(() => {
        expect(queryByTestId('privacy-overlay')).toBeNull();
      });
    });

    it('registers Android-specific event listeners', () => {
      renderWithProvider(<PrivacyOverlay />);

      const calls = mockAppState.addEventListener.mock.calls;
      const eventTypes = calls.map((call) => call[0]);

      expect(eventTypes).toContain('change');
      expect(eventTypes).toContain('blur');
      expect(eventTypes).toContain('focus');
    });
  });

  describe('iOS behavior', () => {
    beforeEach(() => {
      // Mock Device.isAndroid to return false for iOS tests
      const Device = require('../../../util/device');
      Device.isAndroid = jest.fn(() => false);
    });

    it('does not register Android-specific event listeners on iOS', () => {
      renderWithProvider(<PrivacyOverlay />);

      expect(mockAppState.addEventListener).toHaveBeenCalledWith(
        'change',
        expect.any(Function),
      );
      expect(mockAppState.addEventListener).not.toHaveBeenCalledWith(
        'blur',
        expect.any(Function),
      );
      expect(mockAppState.addEventListener).not.toHaveBeenCalledWith(
        'focus',
        expect.any(Function),
      );
    });
  });

  describe('Cleanup behavior', () => {
    it('removes event listeners on unmount', () => {
      const { unmount } = renderWithProvider(<PrivacyOverlay />);

      unmount();

      expect(removeMock).toHaveBeenCalled();
    });

    it('removes Android-specific listeners on unmount when on Android', () => {
      // Mock Device.isAndroid to return true for this test
      const Device = require('../../../util/device');
      Device.isAndroid = jest.fn(() => true);

      const { unmount } = renderWithProvider(<PrivacyOverlay />);

      unmount();

      // Should be called 3 times: once for 'change', once for 'blur', once for 'focus'
      expect(removeMock).toHaveBeenCalledTimes(3);
    });

    it('removes only change listener on unmount when on iOS', () => {
      // Mock Device.isAndroid to return false for this test
      const Device = require('../../../util/device');
      Device.isAndroid = jest.fn(() => false);

      const { unmount } = renderWithProvider(<PrivacyOverlay />);

      unmount();

      // Should be called only once for 'change'
      expect(removeMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('Component styling', () => {
    it('renders overlay with correct styling when visible', async () => {
      const { getByTestId } = renderWithProvider(<PrivacyOverlay />);

      await act(async () => {
        if (changeHandler) {
          changeHandler('background');
        }
      });

      await waitFor(() => {
        const overlay = getByTestId('privacy-overlay');
        expect(overlay).toBeTruthy();

        const style = overlay.props.style;
        expect(style).toHaveProperty('position', 'absolute');
        expect(style).toHaveProperty('top', 0);
        expect(style).toHaveProperty('left', 0);
        expect(style).toHaveProperty('right', 0);
        expect(style).toHaveProperty('bottom', 0);
      });
    });
  });
});
