import React from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { waitFor, act } from '@testing-library/react-native';
import PrivacyOverlay from './PrivacyOverlay';
import Device from '../../../util/device';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { PRIVACY_OVERLAY_TEST_ID } from './constants';

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

// We only handle the supported app states
type SupportedAppStatus = Omit<AppStateStatus, 'unknown' | 'extension'>;

describe('PrivacyOverlay', () => {
  let changeHandler: ((nextAppState: SupportedAppStatus) => void) | undefined;
  let removeMock: jest.Mock;
  let isAndroidSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    removeMock = jest.fn();

    isAndroidSpy = jest.spyOn(Device, 'isAndroid').mockReturnValue(false);

    mockAppState.addEventListener.mockImplementation((event, handler) => {
      if (event === 'change') {
        changeHandler = handler as (nextAppState: SupportedAppStatus) => void;
      }
      return { remove: removeMock };
    });
  });

  afterEach(() => {
    isAndroidSpy.mockRestore();
  });

  describe('Component behavior', () => {
    it('does not render overlay initially', () => {
      const { queryByTestId } = renderWithProvider(<PrivacyOverlay />);
      expect(queryByTestId(PRIVACY_OVERLAY_TEST_ID)).toBeNull();
    });

    it('shows overlay when app goes to background', async () => {
      const { queryByTestId } = renderWithProvider(<PrivacyOverlay />);

      await act(async () => {
        if (changeHandler) {
          changeHandler('background');
        }
      });

      await waitFor(() => {
        expect(queryByTestId(PRIVACY_OVERLAY_TEST_ID)).toBeTruthy();
      });
    });

    it('hides overlay when app becomes active', async () => {
      const { queryByTestId } = renderWithProvider(<PrivacyOverlay />);

      await act(async () => {
        if (changeHandler) {
          changeHandler('background');
        }
      });

      await waitFor(() => {
        expect(queryByTestId(PRIVACY_OVERLAY_TEST_ID)).toBeTruthy();
      });

      await act(async () => {
        if (changeHandler) {
          changeHandler('active');
        }
      });

      await waitFor(() => {
        expect(queryByTestId(PRIVACY_OVERLAY_TEST_ID)).toBeNull();
      });
    });

    it('shows overlay for inactive state', async () => {
      const { queryByTestId } = renderWithProvider(<PrivacyOverlay />);

      await act(async () => {
        if (changeHandler) {
          changeHandler('inactive');
        }
      });

      await waitFor(() => {
        expect(queryByTestId(PRIVACY_OVERLAY_TEST_ID)).toBeTruthy();
      });
    });
  });

  describe('Android-specific behavior', () => {
    beforeEach(() => {
      isAndroidSpy.mockReturnValue(true);
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
      isAndroidSpy.mockReturnValue(false);
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
      isAndroidSpy.mockReturnValue(true);

      const { unmount } = renderWithProvider(<PrivacyOverlay />);

      unmount();

      expect(removeMock).toHaveBeenCalledTimes(3);
    });

    it('removes only change listener on unmount when on iOS', () => {
      isAndroidSpy.mockReturnValue(false);

      const { unmount } = renderWithProvider(<PrivacyOverlay />);

      unmount();

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
        const overlay = getByTestId(PRIVACY_OVERLAY_TEST_ID);
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
