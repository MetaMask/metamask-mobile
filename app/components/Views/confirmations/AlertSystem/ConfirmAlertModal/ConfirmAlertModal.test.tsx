import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { useAlerts } from '../context';
import ConfirmAlertModal, { ConfirmAlertModalProps } from './ConfirmAlertModal';
import { Severity } from '../../types/alerts';
import { AlertKeys } from '../../constants/alerts';

jest.mock('../context', () => ({
  useAlerts: jest.fn(),
}));

const CHECKBOX_LABEL = 'I have acknowledged the alert and still want to proceed';
const CONFIRM_MODAL_MESSAGE_LABEL = 'We suggest you reject this request. If you continue, you might put your assets at risk.';
const CONFIRM_MODAL_TITLE_LABEL = 'High risk request';
const CONFIRM_BTN = 'Confirm';
const CANCEL_BTN = 'Cancel';
const REVIEW_ALERTS_LABEL = 'Review all alerts';
const ALERT_MESSAGE_MOCK = 'This is a test alert message.';
const ALERT_DETAILS_MOCK = ['Detail 1', 'Detail 2'];
const ALERT_MOCK = {
  key: 'alert1',
  title: 'Test Alert',
  message: ALERT_MESSAGE_MOCK,
  severity: Severity.Warning,
  alertDetails: ALERT_DETAILS_MOCK,
  field: 'To',
};
const BLOCKAID_ALERT_MOCK = {
  key: AlertKeys.Blockaid,
  title: 'Blockaid Alert',
  message: 'This is a Blockaid alert message.',
  severity: Severity.Danger,
};

describe('ConfirmAlertModal', () => {
  const mockOnReject = jest.fn();
  const mockOnConfirm = jest.fn();
  const baseProps: ConfirmAlertModalProps = {
    onReject: mockOnReject,
    onConfirm: mockOnConfirm,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useAlerts as jest.Mock).mockReturnValue({
      showAlertModal: jest.fn(),
      fieldAlerts: [ALERT_MOCK],
      hasUnconfirmedFieldDangerAlerts: false,
      alertModalVisible: false,
      generalAlerts: [],
    });
  });

  it('renders the ConfirmAlertModal correctly', () => {
    const { getByText } = render(<ConfirmAlertModal {...baseProps} />);
    expect(getByText(CONFIRM_MODAL_TITLE_LABEL)).toBeDefined();
    expect(getByText(CONFIRM_MODAL_MESSAGE_LABEL)).toBeDefined();
    expect(getByText(REVIEW_ALERTS_LABEL)).toBeDefined();
    expect(getByText(CHECKBOX_LABEL)).toBeDefined();
    expect(getByText(CANCEL_BTN)).toBeDefined();
    expect(getByText(CONFIRM_BTN)).toBeDefined();
  });

  it('does not render the "Review all alerts" link when there are no field alerts', () => {
    (useAlerts as jest.Mock).mockReturnValue({
      fieldAlerts: [],
      hasUnconfirmedFieldDangerAlerts: false,
      alertModalVisible: false,
      generalAlerts: [],
    });
    const { queryByText } = render(<ConfirmAlertModal {...baseProps} />);
    expect(queryByText(REVIEW_ALERTS_LABEL)).toBeNull();
  });

  it('calls onReject when the Cancel button is pressed', async () => {
    const { getByText } = render(<ConfirmAlertModal {...baseProps} />);
    await act(async () => {
      fireEvent.press(getByText(CANCEL_BTN));
    });
    expect(mockOnReject).toHaveBeenCalled();
  });

  it('calls onConfirm when the Confirm button is pressed and checkbox is checked', async () => {
    const { getByText, getByTestId } = render(<ConfirmAlertModal {...baseProps} />);
    await act(async () => {
      fireEvent.press(getByTestId('confirm-alert-checkbox'));
    });
    await act(async () => {
      fireEvent.press(getByText(CONFIRM_BTN));
    });
    expect(mockOnConfirm).toHaveBeenCalled();
  });

  it('calls showAlertModal when the "Review all alerts" link is pressed', async () => {
    const mockShowAlertModal = jest.fn();
    (useAlerts as jest.Mock).mockReturnValue({
      showAlertModal: mockShowAlertModal,
      fieldAlerts: [ALERT_MOCK],
      hasUnconfirmedFieldDangerAlerts: false,
      alertModalVisible: false,
      generalAlerts: [],
    });
    const { getByText } = render(<ConfirmAlertModal {...baseProps} />);
    await act(async () => {
      fireEvent.press(getByText(REVIEW_ALERTS_LABEL));
    });
    expect(mockShowAlertModal).toHaveBeenCalled();
  });

  it('calls showAlertModal and returns null when alertModalVisible is false and hasUnconfirmedFieldDangerAlerts is true', () => {
    const mockShowAlertModal = jest.fn();
    (useAlerts as jest.Mock).mockReturnValue({
      showAlertModal: mockShowAlertModal,
      fieldAlerts: [ALERT_MOCK],
      hasUnconfirmedFieldDangerAlerts: true,
      alertModalVisible: false,
      generalAlerts: [],
    });
    const { queryByText } = render(<ConfirmAlertModal {...baseProps} />);
    expect(mockShowAlertModal).toHaveBeenCalled();
    expect(queryByText(CONFIRM_MODAL_TITLE_LABEL)).toBeNull();
  });

  it('renders the Blockaid alert message and title when onlyBlockaidAlert is true', () => {
    (useAlerts as jest.Mock).mockReturnValue({
      showAlertModal: jest.fn(),
      fieldAlerts: [],
      hasUnconfirmedFieldDangerAlerts: false,
      alertModalVisible: true,
      generalAlerts: [BLOCKAID_ALERT_MOCK],
    });
    const { getByText } = render(<ConfirmAlertModal {...baseProps} />);
    expect(getByText('Your assets may be at risk')).toBeDefined();
    expect(getByText(BLOCKAID_ALERT_MOCK.message)).toBeDefined();
    expect(getByText(CHECKBOX_LABEL)).toBeDefined();
    expect(getByText(CANCEL_BTN)).toBeDefined();
    expect(getByText(CONFIRM_BTN)).toBeDefined();
  });
});
