import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { HardwareWalletType } from '@metamask/hw-wallet-sdk';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { AppThemeKey } from '../../../../../util/theme/models';

import {
  AwaitingAppContent,
  AWAITING_APP_CONTENT_TEST_ID,
} from './AwaitingAppContent';

// Mock locales
jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string, params?: Record<string, string>) => {
    if (params) {
      return `${key} ${JSON.stringify(params)}`;
    }
    return key;
  },
}));

describe('AwaitingAppContent', () => {
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
      <AwaitingAppContent {...defaultProps} {...props} />,
      { state: mockInitialState },
      false,
      false,
    );

  it('renders with test ID', () => {
    const { getByTestId } = renderComponent();

    expect(getByTestId(AWAITING_APP_CONTENT_TEST_ID)).toBeOnTheScreen();
  });

  it('renders open app message', () => {
    const { getByText } = renderComponent();

    expect(getByText(/hardware_wallet\.awaiting_app\.title/)).toBeOnTheScreen();
    expect(
      getByText(/hardware_wallet\.awaiting_app\.message/),
    ).toBeOnTheScreen();
  });

  it('shows current app when different from required', () => {
    const { getByText } = renderComponent({
      currentApp: 'Bitcoin',
      requiredApp: 'Ethereum',
    });

    expect(
      getByText('hardware_wallet.awaiting_app.current_app {"app":"Bitcoin"}'),
    ).toBeOnTheScreen();
  });

  it('does not show current app when same as required', () => {
    const { queryByText } = renderComponent({
      currentApp: 'Ethereum',
      requiredApp: 'Ethereum',
    });

    expect(queryByText(/current_app/)).toBeNull();
  });

  it('does not show current app for BOLOS', () => {
    const { queryByText } = renderComponent({
      currentApp: 'BOLOS',
      requiredApp: 'Ethereum',
    });

    expect(queryByText(/current_app/)).toBeNull();
  });

  it('renders continue button when onContinue provided', () => {
    const onContinue = jest.fn();
    const { getByText } = renderComponent({ onContinue });

    const continueButton = getByText('hardware_wallet.common.continue');
    fireEvent.press(continueButton);
    expect(onContinue).toHaveBeenCalled();
  });

  it('does not render continue button when onContinue not provided', () => {
    const { queryByText } = renderComponent();

    expect(queryByText('hardware_wallet.common.continue')).toBeNull();
  });
});
