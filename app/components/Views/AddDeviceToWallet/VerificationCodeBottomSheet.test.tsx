import React from 'react';
import { act, fireEvent } from '@testing-library/react-native';
import { DeviceEventEmitter } from 'react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import VerificationCodeBottomSheet from './VerificationCodeBottomSheet';
import { strings } from '../../../../locales/i18n';

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      goBack: mockGoBack,
    }),
    useRoute: () => ({
      params: {},
    }),
  };
});

describe('VerificationCodeBottomSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders pending verification copy when route has no code', () => {
    const { getByText } = renderWithProvider(<VerificationCodeBottomSheet />);

    expect(
      getByText(strings('app_settings.add_device.verification_code_pending')),
    ).toBeOnTheScreen();
  });

  it('emits verification done and navigates back when Done is pressed', () => {
    const emitSpy = jest.spyOn(DeviceEventEmitter, 'emit');
    const { getByText } = renderWithProvider(<VerificationCodeBottomSheet />);

    fireEvent.press(getByText(strings('app_settings.add_device.done')));

    expect(emitSpy).toHaveBeenCalledWith('addDeviceVerificationDone');
    expect(mockGoBack).toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(mockGoBack).toHaveBeenCalledTimes(2);
    emitSpy.mockRestore();
  });
});
