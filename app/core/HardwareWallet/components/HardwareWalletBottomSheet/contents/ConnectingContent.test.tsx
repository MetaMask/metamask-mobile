import React from 'react';
import { HardwareWalletType } from '@metamask/hw-wallet-sdk';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { AppThemeKey } from '../../../../../util/theme/models';

import {
  ConnectingContent,
  CONNECTING_CONTENT_TEST_ID,
  CONNECTING_CONTENT_SPINNER_TEST_ID,
} from './ConnectingContent';

// Mock locales
jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string, params?: Record<string, string>) => {
    if (params) {
      return `${key} ${JSON.stringify(params)}`;
    }
    return key;
  },
}));

// Mock react-native-device-info
jest.mock('react-native-device-info', () => ({
  getSystemVersion: jest.fn().mockReturnValue('14'),
}));

describe('ConnectingContent', () => {
  const mockInitialState = {
    user: {
      appTheme: AppThemeKey.light,
    },
    settings: {
      useBlockieIcon: false,
    },
    engine: {
      backgroundState: {
        PreferencesController: {},
      },
    },
  };

  const defaultProps = {
    deviceType: HardwareWalletType.Ledger,
    connectionTips: [
      'hardware_wallet.connecting.tip_unlock',
      'hardware_wallet.connecting.tip_open_app',
      'hardware_wallet.connecting.tip_enable_bluetooth',
      'hardware_wallet.connecting.tip_dnd_off',
    ],
  };

  const renderComponent = (props = {}) =>
    renderWithProvider(
      <ConnectingContent {...defaultProps} {...props} />,
      { state: mockInitialState },
      false,
      false,
    );

  it('should render with test ID', () => {
    const { getByTestId } = renderComponent();

    expect(getByTestId(CONNECTING_CONTENT_TEST_ID)).toBeTruthy();
  });

  it('should render activity indicator', () => {
    const { getByTestId } = renderComponent();

    expect(getByTestId(CONNECTING_CONTENT_SPINNER_TEST_ID)).toBeTruthy();
  });

  it('should render tips', () => {
    const { getByText } = renderComponent();

    expect(getByText('hardware_wallet.connecting.tips_header')).toBeTruthy();
    // All tips are rendered with { device: deviceName } interpolation params
    expect(getByText(/hardware_wallet\.connecting\.tip_unlock/)).toBeTruthy();
    expect(getByText(/hardware_wallet\.connecting\.tip_open_app/)).toBeTruthy();
    expect(
      getByText(/hardware_wallet\.connecting\.tip_enable_bluetooth/),
    ).toBeTruthy();
    expect(getByText(/hardware_wallet\.connecting\.tip_dnd_off/)).toBeTruthy();
  });
});
