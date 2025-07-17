import React from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { BackgroundSecurityOverlay } from '.';

jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  AppState: {
    addEventListener: jest.fn(),
  },
}));

const mockAppState = AppState as jest.Mocked<typeof AppState>;

describe('BackgroundSecurityOverlay', () => {
  let changeHandler: ((nextAppState: AppStateStatus) => void) | undefined;

  beforeEach(() => {
    jest.clearAllMocks();

    mockAppState.addEventListener.mockImplementation((event, handler) => {
      if (event === 'change') {
        changeHandler = handler;
      }
      return { remove: jest.fn() };
    });
  });

  describe('Component behavior', () => {
    it('does not render overlay initially', () => {
      const { queryByTestId } = renderWithProvider(
        <BackgroundSecurityOverlay />,
      );
      expect(queryByTestId('background-security-overlay')).toBeNull();
    });

    it('shows overlay when app goes to background', async () => {
      const { getByTestId } = renderWithProvider(<BackgroundSecurityOverlay />);

      if (changeHandler) {
        changeHandler('background');
      }

      await waitFor(() => {
        expect(getByTestId('background-security-overlay')).toBeTruthy();
      });
    });

    it('hides overlay when app becomes active on iOS', async () => {
      jest.doMock('../../../util/device', () => ({
        isAndroid: () => false,
      }));

      const { getByTestId, queryByTestId } = renderWithProvider(
        <BackgroundSecurityOverlay />,
      );

      if (changeHandler) {
        changeHandler('background');
      }

      await waitFor(() => {
        expect(getByTestId('background-security-overlay')).toBeTruthy();
      });

      if (changeHandler) {
        changeHandler('active');
      }

      await waitFor(() => {
        expect(queryByTestId('background-security-overlay')).toBeNull();
      });
    });

    it('keeps overlay visible when app becomes active on Android', async () => {
      jest.doMock('../../../util/device', () => ({
        isAndroid: () => true,
      }));

      const { getByTestId } = renderWithProvider(<BackgroundSecurityOverlay />);

      if (changeHandler) {
        changeHandler('background');
      }

      await waitFor(() => {
        expect(getByTestId('background-security-overlay')).toBeTruthy();
      });

      if (changeHandler) {
        changeHandler('active');
      }

      await waitFor(() => {
        expect(getByTestId('background-security-overlay')).toBeTruthy();
      });
    });

    it('shows overlay for inactive and unknown states', async () => {
      const { getByTestId } = renderWithProvider(<BackgroundSecurityOverlay />);

      if (changeHandler) {
        changeHandler('inactive');
      }

      await waitFor(() => {
        expect(getByTestId('background-security-overlay')).toBeTruthy();
      });

      if (changeHandler) {
        changeHandler('unknown');
      }

      await waitFor(() => {
        expect(getByTestId('background-security-overlay')).toBeTruthy();
      });
    });
  });

  describe('Component styling', () => {
    it('renders overlay with correct styling when visible', async () => {
      const { getByTestId } = renderWithProvider(<BackgroundSecurityOverlay />);

      if (changeHandler) {
        changeHandler('background');
      }

      await waitFor(() => {
        const overlay = getByTestId('background-security-overlay');
        expect(overlay).toBeTruthy();

        const style = overlay.props.style;
        expect(style).toHaveProperty('position', 'absolute');
        expect(style).toHaveProperty('top', 0);
        expect(style).toHaveProperty('left', 0);
        expect(style).toHaveProperty('right', 0);
        expect(style).toHaveProperty('bottom', 0);
        expect(style).toHaveProperty('zIndex', 1000);
      });
    });
  });
});
