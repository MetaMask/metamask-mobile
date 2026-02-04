import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { AppThemeKey } from '../../../../../util/theme/models';

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

  const renderComponent = (props = {}) =>
    renderWithProvider(
      <AwaitingConfirmationContent {...props} />,
      { state: mockInitialState },
      false,
      false,
    );

  it('should render with test ID', () => {
    const { getByTestId } = renderComponent();

    expect(getByTestId(AWAITING_CONFIRMATION_CONTENT_TEST_ID)).toBeTruthy();
  });

  it('should render activity indicator', () => {
    const { getByTestId } = renderComponent();

    expect(getByTestId(AWAITING_CONFIRMATION_SPINNER_TEST_ID)).toBeTruthy();
  });

  it('should render review message', () => {
    const { getByText } = renderComponent();

    expect(
      getByText(/hardware_wallet\.awaiting_confirmation\.message/),
    ).toBeTruthy();
  });

  it('should show transaction title by default', () => {
    const { getByText } = renderComponent();

    expect(
      getByText(/hardware_wallet\.awaiting_confirmation\.title_transaction/),
    ).toBeTruthy();
  });

  it('should show message title for message operation', () => {
    const { getByText } = renderComponent({ operationType: 'message' });

    expect(
      getByText(/hardware_wallet\.awaiting_confirmation\.title_message/),
    ).toBeTruthy();
  });

  it('should render cancel button when onCancel provided', () => {
    const onCancel = jest.fn();
    const { getByText } = renderComponent({ onCancel });

    const cancelButton = getByText('hardware_wallet.common.cancel');
    fireEvent.press(cancelButton);
    expect(onCancel).toHaveBeenCalled();
  });

  it('should not render cancel button when onCancel not provided', () => {
    const { queryByText } = renderComponent();

    expect(queryByText('hardware_wallet.common.cancel')).toBeNull();
  });
});
