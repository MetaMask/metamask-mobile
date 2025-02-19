import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { useAlerts } from '../context';
import ConfirmAlertModal, { ConfirmAlertModalProps } from './ConfirmAlertModal';

jest.mock('../../../../../util/theme', () => ({
  useTheme: jest.fn(),
}));

jest.mock('../context', () => ({
  useAlerts: jest.fn(),
}));

const CHECKBOX_LABEL = 'I have acknowledged the alert and still want to proceed';
const CONFIRM_MODAL_MESSAGE_LABEL = 'We suggest you reject this request. If you continue, you might put your assets at risk.';
const CONFIRM_MODAL_TITLE_LABEL = 'High risk request';
const CONFIRM_BTN = 'Confirm';
const REJECT_BTN = 'Reject';
const REVIEW_ALERTS_LABEL = 'Review all alerts';

describe('ConfirmAlertModal', () => {
  const mockOnCancel = jest.fn();
  const mockOnClose = jest.fn();
  const mockOnSubmit = jest.fn();
  const baseProps: ConfirmAlertModalProps = {
    onCancel: mockOnCancel,
    onClose: mockOnClose,
    onSubmit: mockOnSubmit,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useAlerts as jest.Mock).mockReturnValue({
      showAlertModal: jest.fn(),
    });
  });

  it('renders the ConfirmAlertModal correctly', () => {
    const { getByText } = render(<ConfirmAlertModal {...baseProps} />);
    expect(getByText(CONFIRM_MODAL_TITLE_LABEL)).toBeDefined();
    expect(getByText(CONFIRM_MODAL_MESSAGE_LABEL)).toBeDefined();
    expect(getByText(REVIEW_ALERTS_LABEL)).toBeDefined();
    expect(getByText(CHECKBOX_LABEL)).toBeDefined();
    expect(getByText(REJECT_BTN)).toBeDefined();
    expect(getByText(CONFIRM_BTN)).toBeDefined();
  });

  it('calls onCancel when the Cancel button is pressed', async () => {
    const { getByText } = render(<ConfirmAlertModal {...baseProps} />);
    await act(async () => {
      fireEvent.press(getByText(REJECT_BTN));
    });
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('calls onSubmit and onClose when the Confirm button is pressed and checkbox is checked', async () => {
    const { getByText, getByTestId } = render(<ConfirmAlertModal {...baseProps} />);
    await act(async () => {
      fireEvent.press(getByTestId('confirm-alert-checkbox'));
    });
    await act(async () => {
      fireEvent.press(getByText(CONFIRM_BTN));
    });
    expect(mockOnSubmit).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls showAlertModal when the "Review all alerts" link is pressed', async () => {
    const mockShowAlertModal = jest.fn();
    (useAlerts as jest.Mock).mockReturnValue({
      showAlertModal: mockShowAlertModal,
    });
    const { getByText } = render(<ConfirmAlertModal {...baseProps} />);
    await act(async () => {
      fireEvent.press(getByText(REVIEW_ALERTS_LABEL));
    });
    expect(mockShowAlertModal).toHaveBeenCalled();
  });
});
