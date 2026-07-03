import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { strings } from '../../../../locales/i18n';
import DeviceAdded from './DeviceAdded';

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: jest.fn(() => ({})),
  }),
}));

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
  });

  describe('rendering', () => {
    it('renders the device added confirmation text', () => {
      const { getByText } = renderComponent();

      expect(
        getByText(strings('app_settings.add_device.device_added')),
      ).toBeOnTheScreen();
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
