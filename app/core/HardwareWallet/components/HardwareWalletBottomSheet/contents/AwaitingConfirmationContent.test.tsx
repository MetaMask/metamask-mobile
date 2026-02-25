import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { AppThemeKey } from '../../../../../util/theme/models';
import { HardwareWalletType } from '@metamask/hw-wallet-sdk';

import {
  AwaitingConfirmationContent,
  AWAITING_CONFIRMATION_CONTENT_TEST_ID,
  AWAITING_CONFIRMATION_SPINNER_TEST_ID,
} from './AwaitingConfirmationContent';

// Mock locales
jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string, params?: Record<string, string>) => {
    if (params) {
      return `${key} ${JSON.stringify(params)}`;
    }
    return key;
  },
}));

describe('AwaitingConfirmationContent', () => {
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
  };

  const renderComponent = (props = {}) =>
    renderWithProvider(
      <AwaitingConfirmationContent {...defaultProps} {...props} />,
      { state: mockInitialState },
      false,
      false,
    );

  it('renders with test ID', () => {
    const { getByTestId } = renderComponent();

    expect(
      getByTestId(AWAITING_CONFIRMATION_CONTENT_TEST_ID),
    ).toBeOnTheScreen();
  });

  it('renders activity indicator', () => {
    const { getByTestId } = renderComponent();

    expect(
      getByTestId(AWAITING_CONFIRMATION_SPINNER_TEST_ID),
    ).toBeOnTheScreen();
  });

  it('renders review message', () => {
    const { getByText } = renderComponent();

    expect(
      getByText(/hardware_wallet\.awaiting_confirmation\.message/),
    ).toBeOnTheScreen();
  });

  it('shows transaction title by default', () => {
    const { getByText } = renderComponent();

    expect(
      getByText(/hardware_wallet\.awaiting_confirmation\.title_transaction/),
    ).toBeOnTheScreen();
  });

  it('shows message title for message operation', () => {
    const { getByText } = renderComponent({ operationType: 'message' });

    expect(
      getByText(/hardware_wallet\.awaiting_confirmation\.title_message/),
    ).toBeOnTheScreen();
  });

  it('renders cancel button when onCancel provided', () => {
    const onCancel = jest.fn();
    const { getByText } = renderComponent({ onCancel });

    const cancelButton = getByText('hardware_wallet.common.cancel');
    fireEvent.press(cancelButton);
    expect(onCancel).toHaveBeenCalled();
  });

  it('does not render cancel button when onCancel not provided', () => {
    const { queryByText } = renderComponent();

    expect(queryByText('hardware_wallet.common.cancel')).toBeNull();
  });
});
