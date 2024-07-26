import { jest, describe, it, expect } from '@jest/globals';
import React from 'react';
import { Linking } from 'react-native';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { fireEvent } from '@testing-library/react-native';
import SearchingForDeviceStep from './SearchingForDeviceStep';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { SEARCHING_FOR_DEVICE_STEP } from './Steps.constants';
import { strings } from '../../../../../locales/i18n';
import { getSystemVersion } from 'react-native-device-info';
import Device from '../../../../util/device';
import { LEDGER_SUPPORT_LINK } from '../../../../constants/urls';

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...(actualNav as object),
    useNavigation: jest.fn(() => ({
      navigate: jest.fn(),
      push: jest.fn(),
    })),
    NavigationContainer: jest.fn(({ children }: { children: React.ReactNode }) => children),
  };
});

jest.mock('react-native', () => {
  const reactNative = jest.requireActual('react-native') as typeof import('react-native');
  return {
    ...reactNative,
    Linking: {
      ...reactNative.Linking,
      openURL: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    },
  };
});

jest.mock('@react-navigation/stack', () => ({
  createStackNavigator: jest.fn(() => ({
    Navigator: jest.fn(),
    Screen: jest.fn(),
  })),
}));

jest.mock('react-native-device-info', () => ({
  getSystemVersion: jest.fn(),
}));

jest.mock('../../../../util/device', () => ({
  isAndroid: jest.fn().mockReturnValue(true),
}));

describe('SearchingForDeviceStep', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders device search step', () => {
    jest.mocked(getSystemVersion).mockReturnValue('13');
    const { getByTestId } = renderWithProvider(<SearchingForDeviceStep />);
    expect(getByTestId(SEARCHING_FOR_DEVICE_STEP)).toBeTruthy();
  });

  it('navigates to SimpleWebview when install instructions link is pressed', () => {
    jest.mocked(getSystemVersion).mockReturnValue('13');
    const mockPush = jest.fn();
    jest.mocked(useNavigation).mockReturnValue({ push: mockPush } as unknown as NavigationProp<ParamListBase>);

    const { getByText } = renderWithProvider(<SearchingForDeviceStep />);
    const installInstructionsLink = getByText(
      strings('ledger.how_to_install_eth_app'),
    );
    fireEvent.press(installInstructionsLink);

    expect(mockPush).toHaveBeenCalledWith('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: LEDGER_SUPPORT_LINK,
        title: strings('ledger.how_to_install_eth_webview_title'),
      },
    });
  });

  it('shows correct permission text for Android 12+', () => {
    jest.mocked(getSystemVersion).mockReturnValue('12');
    const { getByText } = renderWithProvider(<SearchingForDeviceStep />);
    expect(
      getByText(
        strings('ledger.ledger_reminder_message_step_four_Androidv12plus'),
      ),
    ).toBeTruthy();
  });

  it('shows correct permission text for Android < 12', () => {
    jest.mocked(getSystemVersion).mockReturnValue('11');
    const { getByText } = renderWithProvider(<SearchingForDeviceStep />);
    expect(
      getByText(strings('ledger.ledger_reminder_message_step_four')),
    ).toBeTruthy();
  });

  it('does not show permission text for iOS', () => {
    jest.mocked(Device.isAndroid).mockReturnValueOnce(false);
    jest.mocked(getSystemVersion).mockReturnValue('11');
    const { getByText } = renderWithProvider(<SearchingForDeviceStep />);
    expect(() =>
      getByText(strings('ledger.ledger_reminder_message_step_four')),
    ).toThrow();
    expect(() =>
      getByText(
        strings('ledger.ledger_reminder_message_step_four_Androidv12plus'),
      ),
    ).toThrow();
  });

  it('matches snapshot for Android 12+', () => {
    jest.mocked(getSystemVersion).mockReturnValue('13');
    const { toJSON } = renderWithProvider(<SearchingForDeviceStep />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('matches snapshot for Android < 12', () => {
    jest.mocked(getSystemVersion).mockReturnValue('11');
    const { toJSON } = renderWithProvider(<SearchingForDeviceStep />);
    expect(toJSON()).toMatchSnapshot();
  });
});
