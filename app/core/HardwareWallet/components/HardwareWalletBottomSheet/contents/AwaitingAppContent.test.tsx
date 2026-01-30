import React from 'react';
import { fireEvent } from '@testing-library/react-native';
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

  const renderComponent = (props = {}) =>
    renderWithProvider(
      <AwaitingAppContent {...props} />,
      { state: mockInitialState },
      false,
      false,
    );

  it('should render with test ID', () => {
    const { getByTestId } = renderComponent();

    expect(getByTestId(AWAITING_APP_CONTENT_TEST_ID)).toBeTruthy();
  });

  it('should render open app message', () => {
    const { getByText } = renderComponent();

    expect(getByText(/hardware_wallet\.awaiting_app\.title/)).toBeTruthy();
    expect(getByText(/hardware_wallet\.awaiting_app\.message/)).toBeTruthy();
  });

  it('should show current app when different from required', () => {
    const { getByText } = renderComponent({
      currentApp: 'Bitcoin',
      requiredApp: 'Ethereum',
    });

    expect(
      getByText('hardware_wallet.awaiting_app.current_app {"app":"Bitcoin"}'),
    ).toBeTruthy();
  });

  it('should not show current app when same as required', () => {
    const { queryByText } = renderComponent({
      currentApp: 'Ethereum',
      requiredApp: 'Ethereum',
    });

    expect(queryByText(/current_app/)).toBeNull();
  });

  it('should not show current app for BOLOS', () => {
    const { queryByText } = renderComponent({
      currentApp: 'BOLOS',
      requiredApp: 'Ethereum',
    });

    expect(queryByText(/current_app/)).toBeNull();
  });

  it('should render continue button when onContinue provided', () => {
    const onContinue = jest.fn();
    const { getByText } = renderComponent({ onContinue });

    const continueButton = getByText('hardware_wallet.common.continue');
    fireEvent.press(continueButton);
    expect(onContinue).toHaveBeenCalled();
  });

  it('should not render continue button when onContinue not provided', () => {
    const { queryByText } = renderComponent();

    expect(queryByText('hardware_wallet.common.continue')).toBeNull();
  });
});
