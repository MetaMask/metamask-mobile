import React from 'react';
import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import DepositFooter, {
  DepositFooterProps,
  LENDING_DEPOSIT_FOOTER_BUTTON_TEST_IDS,
} from './index';
import { strings } from '../../../../../../../../locales/i18n';
import { act, fireEvent } from '@testing-library/react-native';

const mockOnCancel = jest.fn();
const mockOnConfirm = jest.fn();

describe('Deposit Footer', () => {
  const defaultProps: DepositFooterProps = {
    onCancel: mockOnCancel,
    onConfirm: mockOnConfirm,
    buttonPrimary: {
      disabled: false,
      text: strings('earn.confirm'),
    },
    buttonSecondary: {
      disabled: false,
      text: strings('earn.cancel'),
    },
    activeStep: 0,
    steps: [
      {
        label: strings('earn.approve'),
        isLoading: false,
      },
      {
        label: strings('earn.deposit'),
        isLoading: false,
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const { toJSON, getByText } = renderWithProvider(
      <DepositFooter {...defaultProps} />,
    );

    expect(toJSON()).toMatchSnapshot();
    expect(getByText(strings('earn.confirm'))).toBeDefined();
    expect(getByText(strings('earn.cancel'))).toBeDefined();
    expect(getByText(strings('earn.approve'))).toBeDefined();
    expect(getByText(strings('earn.deposit'))).toBeDefined();
  });

  it('should onCancel prop when cancel button pressed', async () => {
    const { getByTestId } = renderWithProvider(
      <DepositFooter {...defaultProps} />,
    );

    const cancelButton = getByTestId(
      LENDING_DEPOSIT_FOOTER_BUTTON_TEST_IDS.CANCEL_BUTTON,
    );

    await act(async () => {
      fireEvent.press(cancelButton);
    });

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
    expect(mockOnConfirm).toHaveBeenCalledTimes(0);
  });

  it('should onConfirm prop when confirm button pressed', async () => {
    const { getByTestId } = renderWithProvider(
      <DepositFooter {...defaultProps} />,
    );

    const confirmButton = getByTestId(
      LENDING_DEPOSIT_FOOTER_BUTTON_TEST_IDS.CONFIRM_BUTTON,
    );

    await act(async () => {
      fireEvent.press(confirmButton);
    });

    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    expect(mockOnCancel).toHaveBeenCalledTimes(0);
  });
});
