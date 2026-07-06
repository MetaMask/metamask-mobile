import React from 'react';
import { DeviceEventEmitter } from 'react-native';
import { fireEvent, act } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { strings } from '../../../../locales/i18n';
import VerificationCodeBottomSheet from './VerificationCodeBottomSheet';

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

const renderComponent = () =>
  renderWithProvider(<VerificationCodeBottomSheet />);

describe('VerificationCodeBottomSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('rendering', () => {
    it('renders the bottom sheet header title', () => {
      const { getByText } = renderComponent();

      expect(
        getByText(strings('app_settings.add_device.enter_code_on_extension')),
      ).toBeOnTheScreen();
    });

    it('renders the description text', () => {
      const { getByText } = renderComponent();

      expect(
        getByText(
          strings('app_settings.add_device.enter_code_on_extension_desc'),
        ),
      ).toBeOnTheScreen();
    });

    it('renders the mock verification code', () => {
      const { getByText } = renderComponent();

      expect(getByText('123456')).toBeOnTheScreen();
    });

    it('renders the done button', () => {
      const { getByText } = renderComponent();

      expect(
        getByText(strings('app_settings.add_device.done')),
      ).toBeOnTheScreen();
    });
  });

  describe('done button', () => {
    it('emits addDeviceVerificationDone event when done button is pressed', () => {
      const emitSpy = jest.spyOn(DeviceEventEmitter, 'emit');
      const { getByText } = renderComponent();

      fireEvent.press(getByText(strings('app_settings.add_device.done')));

      expect(emitSpy).toHaveBeenCalledWith('addDeviceVerificationDone');
    });

    it('calls navigation.goBack immediately when done button is pressed', () => {
      const { getByText } = renderComponent();

      fireEvent.press(getByText(strings('app_settings.add_device.done')));

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('calls navigation.goBack a second time after 100ms delay', () => {
      const { getByText } = renderComponent();

      fireEvent.press(getByText(strings('app_settings.add_device.done')));

      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(mockGoBack).toHaveBeenCalledTimes(2);
    });
  });

  describe('close button', () => {
    it('emits addDeviceVerificationDone event when close button is pressed', () => {
      const emitSpy = jest.spyOn(DeviceEventEmitter, 'emit');
      const { getByTestId } = renderComponent();

      fireEvent.press(getByTestId('verification-code-close-button'));

      expect(emitSpy).toHaveBeenCalledWith('addDeviceVerificationDone');
    });

    it('calls navigation.goBack when close button is pressed', () => {
      const { getByTestId } = renderComponent();

      fireEvent.press(getByTestId('verification-code-close-button'));

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
  });
});
