import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import SearchingForDeviceStep from './SearchingForDeviceStep';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { SEARCHING_FOR_DEVICE_STEP } from './Steps.constants';
import { strings } from '../../../../../locales/i18n';
import { getSystemVersion } from 'react-native-device-info';
import Device from '../../../../util/device';
import { LEDGER_SUPPORT_LINK } from '../../../../constants/urls';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
}));

jest.mock('react-native-device-info', () => ({
  getSystemVersion: jest.fn(),
}));

jest.mock('../../../../util/device', () => ({
  isAndroid: jest.fn().mockReturnValue(true),
}));

describe('SearchingForDeviceStep', () => {
  it('renders device search step', () => {
    getSystemVersion.mockReturnValue('13');
    const { getByTestId } = renderWithProvider(<SearchingForDeviceStep />);
    expect(getByTestId(SEARCHING_FOR_DEVICE_STEP)).toBeTruthy();
  });

  it('navigates to SimpleWebview when install instructions link is pressed', () => {
    getSystemVersion.mockReturnValue('13');
    const mockNavigation = { push: jest.fn() };
    useNavigation.mockReturnValue(mockNavigation);

    const { getByText } = renderWithProvider(<SearchingForDeviceStep />);
    const installInstructionsLink = getByText(
      strings('ledger.how_to_install_eth_app'),
    );
    fireEvent.press(installInstructionsLink);

    expect(mockNavigation.push).toHaveBeenCalledWith('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: LEDGER_SUPPORT_LINK,
        title: strings('ledger.how_to_install_eth_webview_title'),
      },
    });
  });

  it('shows correct permission text for Android 12+', () => {
    getSystemVersion.mockReturnValue('12');
    const { getByText } = renderWithProvider(<SearchingForDeviceStep />);
    expect(
      getByText(
        strings('ledger.ledger_reminder_message_step_four_Androidv12plus'),
      ),
    ).toBeTruthy();
  });

  it('shows correct permission text for Android < 12', () => {
    getSystemVersion.mockReturnValue('11');
    const { getByText } = renderWithProvider(<SearchingForDeviceStep />);
    expect(
      getByText(strings('ledger.ledger_reminder_message_step_four')),
    ).toBeTruthy();
  });

  it('does not show permission text for iOS', () => {
    Device.isAndroid.mockReturnValueOnce(false);
    getSystemVersion.mockReturnValue('11');
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
    getSystemVersion.mockReturnValue('13');
    const { toJSON } = renderWithProvider(<SearchingForDeviceStep />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('matches snapshot for Android < 12', () => {
    getSystemVersion.mockReturnValue('11');
    const { toJSON } = renderWithProvider(<SearchingForDeviceStep />);
    expect(toJSON()).toMatchSnapshot();
  });
});
