import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { useAlerts } from '../../../context/alert-system-context';
import ConfirmAlertModal, {
  ConfirmAlertModalProps,
} from './confirm-alert-modal';
import { Severity } from '../../../types/alerts';
import { AlertKeys } from '../../../constants/alerts';
import { ConfirmAlertModalSelectorsIDs } from '../../../ConfirmationView.testIds';
import { strings } from '../../../../../../../locales/i18n';

jest.mock('../../../context/alert-system-context', () => ({
  useAlerts: jest.fn(),
}));

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
    const { getByText, getByTestId } = render(
      <ConfirmAlertModal {...baseProps} />,
    );

    expect(
      getByText(strings('alert_system.confirm_modal.title')),
    ).toBeDefined();
    expect(
      getByText(strings('alert_system.confirm_modal.message')),
    ).toBeDefined();
    expect(
      getByTestId(ConfirmAlertModalSelectorsIDs.REVIEW_ALERTS_BUTTON),
    ).toBeDefined();
    expect(
      getByText(strings('alert_system.confirm_modal.checkbox_label')),
    ).toBeDefined();
    expect(
      getByTestId(ConfirmAlertModalSelectorsIDs.CONFIRM_ALERT_CANCEL_BUTTON),
    ).toBeDefined();
    expect(
      getByTestId(ConfirmAlertModalSelectorsIDs.CONFIRM_ALERT_BUTTON),
    ).toBeDefined();
  });

  it('does not render the review alerts button when there are no field alerts', () => {
    (useAlerts as jest.Mock).mockReturnValue({
      fieldAlerts: [],
      hasUnconfirmedFieldDangerAlerts: false,
      alertModalVisible: false,
      generalAlerts: [],
    });

    const { queryByTestId } = render(<ConfirmAlertModal {...baseProps} />);

    expect(
      queryByTestId(ConfirmAlertModalSelectorsIDs.REVIEW_ALERTS_BUTTON),
    ).toBeNull();
  });

  it('calls onReject when the Cancel button is pressed', async () => {
    const { getByTestId } = render(<ConfirmAlertModal {...baseProps} />);

    await act(async () => {
      fireEvent.press(
        getByTestId(ConfirmAlertModalSelectorsIDs.CONFIRM_ALERT_CANCEL_BUTTON),
      );
    });

    expect(mockOnReject).toHaveBeenCalled();
  });

  it('calls onConfirm when the Confirm button is pressed and checkbox is checked', async () => {
    const { getByTestId } = render(<ConfirmAlertModal {...baseProps} />);

    await act(async () => {
      fireEvent.press(
        getByTestId(ConfirmAlertModalSelectorsIDs.CONFIRM_ALERT_CHECKBOX),
      );
    });
    await act(async () => {
      fireEvent.press(
        getByTestId(ConfirmAlertModalSelectorsIDs.CONFIRM_ALERT_BUTTON),
      );
    });

    expect(mockOnConfirm).toHaveBeenCalled();
  });

  it('calls showAlertModal when the review alerts button is pressed', async () => {
    const mockShowAlertModal = jest.fn();
    (useAlerts as jest.Mock).mockReturnValue({
      showAlertModal: mockShowAlertModal,
      fieldAlerts: [ALERT_MOCK],
      hasUnconfirmedFieldDangerAlerts: false,
      alertModalVisible: false,
      generalAlerts: [],
    });

    const { getByTestId } = render(<ConfirmAlertModal {...baseProps} />);

    await act(async () => {
      fireEvent.press(
        getByTestId(ConfirmAlertModalSelectorsIDs.REVIEW_ALERTS_BUTTON),
      );
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

    const { queryByTestId } = render(<ConfirmAlertModal {...baseProps} />);

    expect(mockShowAlertModal).toHaveBeenCalled();
    expect(
      queryByTestId(ConfirmAlertModalSelectorsIDs.CONFIRM_ALERT_MODAL),
    ).toBeNull();
  });

  it('renders the Blockaid alert message and title when onlyBlockaidAlert is true', () => {
    (useAlerts as jest.Mock).mockReturnValue({
      showAlertModal: jest.fn(),
      fieldAlerts: [],
      hasUnconfirmedFieldDangerAlerts: false,
      alertModalVisible: true,
      generalAlerts: [BLOCKAID_ALERT_MOCK],
    });

    const { getByText, getByTestId } = render(
      <ConfirmAlertModal {...baseProps} />,
    );

    expect(
      getByText(strings('alert_system.confirm_modal.title_blockaid')),
    ).toBeDefined();
    expect(getByText(BLOCKAID_ALERT_MOCK.message)).toBeDefined();
    expect(
      getByText(strings('alert_system.confirm_modal.checkbox_label')),
    ).toBeDefined();
    expect(
      getByTestId(ConfirmAlertModalSelectorsIDs.CONFIRM_ALERT_CANCEL_BUTTON),
    ).toBeDefined();
    expect(
      getByTestId(ConfirmAlertModalSelectorsIDs.CONFIRM_ALERT_BUTTON),
    ).toBeDefined();
  });
});
