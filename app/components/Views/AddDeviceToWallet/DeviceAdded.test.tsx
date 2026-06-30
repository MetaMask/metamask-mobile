import React from 'react';
import { fireEvent, act } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { strings } from '../../../../locales/i18n';
import DeviceAdded from './DeviceAdded';
import {
  MOCK_EXTENSION_CANCEL_ERROR_DELAY_MS,
  showExtensionCancelledErrorSheet,
} from './showExtensionCancelledErrorSheet';

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: jest.fn(() => ({})),
  }),
}));

jest.mock('./showExtensionCancelledErrorSheet', () => {
  const actual = jest.requireActual('./showExtensionCancelledErrorSheet');
  return {
    ...actual,
    showExtensionCancelledErrorSheet: jest.fn(),
  };
});

const mockShowExtensionCancelledErrorSheet = jest.mocked(
  showExtensionCancelledErrorSheet,
);

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      goBack: mockGoBack,
    }),
  };
});

const renderComponent = () => renderWithProvider(<DeviceAdded />);

describe('DeviceAdded', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('rendering', () => {
    it('renders the waiting for extension screen', () => {
      const { getByText, getByTestId } = renderComponent();

      expect(getByTestId('device-added-loader')).toBeOnTheScreen();
      expect(
        getByText(strings('app_settings.add_device.waiting_for_extension')),
      ).toBeOnTheScreen();
      expect(
        getByText(
          strings('app_settings.add_device.waiting_for_extension_description'),
        ),
      ).toBeOnTheScreen();
    });
  });

  describe('extension cancelled error sheet', () => {
    it('shows the error sheet after the mock delay', () => {
      renderComponent();

      act(() => {
        jest.advanceTimersByTime(MOCK_EXTENSION_CANCEL_ERROR_DELAY_MS);
      });

      expect(mockShowExtensionCancelledErrorSheet).toHaveBeenCalledTimes(1);
    });

    it('does not show the error sheet again after unmount and remount within the delay', () => {
      const { unmount } = renderComponent();

      act(() => {
        jest.advanceTimersByTime(MOCK_EXTENSION_CANCEL_ERROR_DELAY_MS - 1);
      });

      unmount();
      renderComponent();

      act(() => {
        jest.advanceTimersByTime(MOCK_EXTENSION_CANCEL_ERROR_DELAY_MS);
      });

      expect(mockShowExtensionCancelledErrorSheet).toHaveBeenCalledTimes(1);
    });
  });

  describe('back navigation', () => {
    it('calls navigation.goBack when back button is pressed', () => {
      const { getByTestId } = renderComponent();

      fireEvent.press(getByTestId('device-added-back-button'));

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
  });
});
