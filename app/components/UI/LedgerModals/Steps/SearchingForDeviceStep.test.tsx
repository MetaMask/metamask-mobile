import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import SearchingForDeviceStep from './SearchingForDeviceStep';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { SEARCHING_FOR_DEVICE_STEP } from './Steps.constants';
import { strings } from '../../../../../locales/i18n';
import { getSystemVersion } from 'react-native-device-info';
import Device from '../../../../util/device';
import { LEDGER_SUPPORT_LINK } from '../../../../constants/urls';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(() => ({
    navigate: jest.fn(),
  })),
}));

jest.mock('react-native-device-info', () => ({
  getSystemVersion: jest.fn(() => '11'),
}));

jest.mock('../../../../util/device', () => ({
  isAndroid: jest.fn(() => true),
}));

describe('SearchingForDeviceStep', () => {
  it('renders device search step', () => {
    (getSystemVersion as jest.Mock).mockReturnValue('13');
    const { getByTestId } = renderWithProvider(<SearchingForDeviceStep />);
    expect(getByTestId(SEARCHING_FOR_DEVICE_STEP)).toBeTruthy();
  });

  it('navigates to SimpleWebview when install instructions link is pressed', () => {
    (getSystemVersion as jest.Mock).mockReturnValue('13');
    const mockNavigation = { navigate: jest.fn() };
    (useNavigation as jest.Mock).mockReturnValue(mockNavigation);

    const { getByText } = renderWithProvider(<SearchingForDeviceStep />);
    const installInstructionsLink = getByText(
      strings('ledger.how_to_install_eth_app'),
    );
    fireEvent.press(installInstructionsLink);

    expect(mockNavigation.navigate).toHaveBeenCalledWith('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: LEDGER_SUPPORT_LINK,
        title: strings('ledger.how_to_install_eth_webview_title'),
      },
    });
  });

  it('shows correct permission text for Android 12+', () => {
    (getSystemVersion as jest.Mock).mockReturnValue('12');
    const { getByText } = renderWithProvider(<SearchingForDeviceStep />);
    expect(
      getByText(
        strings('ledger.ledger_reminder_message_step_four_Androidv12plus'),
      ),
    ).toBeTruthy();
  });

  it('shows correct permission text for Android < 12', () => {
    (getSystemVersion as jest.Mock).mockReturnValue('11');
    const { getByText } = renderWithProvider(<SearchingForDeviceStep />);
    expect(
      getByText(strings('ledger.ledger_reminder_message_step_four')),
    ).toBeTruthy();
  });

  it('does not show permission text for iOS', () => {
    (Device.isAndroid as jest.Mock).mockReturnValueOnce(false);
    (getSystemVersion as jest.Mock).mockReturnValue('11');
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
    (getSystemVersion as jest.Mock).mockReturnValue('13');
    const { toJSON } = renderWithProvider(<SearchingForDeviceStep />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('matches snapshot for Android < 12', () => {
    (getSystemVersion as jest.Mock).mockReturnValue('11');
    const { toJSON } = renderWithProvider(<SearchingForDeviceStep />);
    expect(toJSON()).toMatchSnapshot();
  });
});
