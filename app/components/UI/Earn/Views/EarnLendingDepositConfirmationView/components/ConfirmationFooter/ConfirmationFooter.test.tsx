import React from 'react';
import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import ConfirmationFooter, {
  ConfirmationFooterProps,
  CONFIRMATION_FOOTER_BUTTON_TEST_IDS,
  CONFIRMATION_FOOTER_LINK_TEST_IDS,
} from './index';
import { strings } from '../../../../../../../../locales/i18n';
import { act, fireEvent } from '@testing-library/react-native';
import { Linking } from 'react-native';
import AppConstants from '../../../../../../../core/AppConstants';

jest.mock('react-native', () => {
  const actual = jest.requireActual('react-native');
  return {
    ...actual,
    Linking: {
      ...actual.Linking,
      openUrl: jest.fn(),
    },
  };
});

const mockOnCancel = jest.fn();
const mockOnConfirm = jest.fn();

describe('ConfirmationFooter', () => {
  const defaultProps: ConfirmationFooterProps = {
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
    progressBar: {
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
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const { toJSON, getByText } = renderWithProvider(
      <ConfirmationFooter {...defaultProps} />,
    );

    expect(toJSON()).toMatchSnapshot();
    expect(getByText(strings('earn.confirm'))).toBeDefined();
    expect(getByText(strings('earn.cancel'))).toBeDefined();
    expect(getByText(strings('earn.approve'))).toBeDefined();
    expect(getByText(strings('earn.deposit'))).toBeDefined();
  });

  it('should onCancel prop when cancel button pressed', async () => {
    const { getByTestId } = renderWithProvider(
      <ConfirmationFooter {...defaultProps} />,
    );

    const cancelButton = getByTestId(
      CONFIRMATION_FOOTER_BUTTON_TEST_IDS.CANCEL_BUTTON,
    );

    await act(async () => {
      fireEvent.press(cancelButton);
    });

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
    expect(mockOnConfirm).toHaveBeenCalledTimes(0);
  });

  it('should onConfirm prop when confirm button pressed', async () => {
    const { getByTestId } = renderWithProvider(
      <ConfirmationFooter {...defaultProps} />,
    );

    const confirmButton = getByTestId(
      CONFIRMATION_FOOTER_BUTTON_TEST_IDS.CONFIRM_BUTTON,
    );

    await act(async () => {
      fireEvent.press(confirmButton);
    });

    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    expect(mockOnCancel).toHaveBeenCalledTimes(0);
  });

  it('Links to browser terms of use page', async () => {
    const { getByTestId } = renderWithProvider(
      <ConfirmationFooter {...defaultProps} />,
    );

    const termsOfUseButton = getByTestId(
      CONFIRMATION_FOOTER_LINK_TEST_IDS.TERMS_OF_USE_BUTTON,
    );

    await act(async () => {
      fireEvent.press(termsOfUseButton);
    });

    expect(Linking.openURL).toHaveBeenLastCalledWith(
      AppConstants.URLS.TERMS_OF_USE,
    );
  });

  it('Links to browser risk disclosure page', async () => {
    const { getByTestId } = renderWithProvider(
      <ConfirmationFooter {...defaultProps} />,
    );

    const riskDisclosureButton = getByTestId(
      CONFIRMATION_FOOTER_LINK_TEST_IDS.RISK_DISCLOSURE_BUTTON,
    );

    await act(async () => {
      fireEvent.press(riskDisclosureButton);
    });

    expect(Linking.openURL).toHaveBeenLastCalledWith(
      AppConstants.URLS.EARN_RISK_DISCLOSURE,
    );
  });
});
