import React from 'react';
import { fireEvent } from '@testing-library/react-native';
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

  const renderComponent = (props = {}) =>
    renderWithProvider(
      <ConnectingContent {...props} />,
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
    expect(getByText('hardware_wallet.connecting.tip_unlock')).toBeTruthy();
    expect(getByText('hardware_wallet.connecting.tip_open_app')).toBeTruthy();
    expect(
      getByText('hardware_wallet.connecting.tip_enable_bluetooth'),
    ).toBeTruthy();
  });

  it('should render cancel button when onCancel provided', () => {
    const onCancel = jest.fn();
    const { getByText } = renderComponent({ onCancel });

    const cancelButton = getByText('hardware_wallet.common.cancel');
    expect(cancelButton).toBeTruthy();

    fireEvent.press(cancelButton);
    expect(onCancel).toHaveBeenCalled();
  });

  it('should not render cancel button when onCancel not provided', () => {
    const { queryByText } = renderComponent();

    expect(queryByText('hardware_wallet.common.cancel')).toBeNull();
  });
});
