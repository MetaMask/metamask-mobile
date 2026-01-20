import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { useAlerts } from '../../../context/alert-system-context';
import AlertModal from './alert-modal';
import { IconName } from '../../../../../../component-library/components/Icons/Icon';
import Text from '../../../../../../component-library/components/Texts/Text';
import { Severity } from '../../../types/alerts';
import { useConfirmationAlertMetrics } from '../../../hooks/metrics/useConfirmationAlertMetrics';

jest.mock('../../../context/alert-system-context', () => ({
  useAlerts: jest.fn(),
}));

jest.mock('../../../hooks/metrics/useConfirmationAlertMetrics', () => ({
  useConfirmationAlertMetrics: jest.fn(),
}));

const ALERT_MESSAGE_MOCK = 'This is a test alert message.';
const ALERT_DETAILS_MOCK = ['Detail 1', 'Detail 2'];
const ALERT_ACTION_MOCK = { label: 'Action 1', callback: jest.fn() };
const CHECKBOX_LABEL = 'I have acknowledged the risk and still want to proceed';

const mockAlerts = [
  {
    key: 'alert1',
    title: 'Test Alert',
    message: ALERT_MESSAGE_MOCK,
    severity: Severity.Warning,
    alertDetails: ALERT_DETAILS_MOCK,
    action: ALERT_ACTION_MOCK,
    field: 'To',
  },
  {
    key: 'alert2',
    title: 'Test Alert 2',
    message: ALERT_MESSAGE_MOCK,
    severity: Severity.Danger,
    alertDetails: ALERT_DETAILS_MOCK,
    action: ALERT_ACTION_MOCK,
    field: 'From',
  },
  {
    key: 'alert3',
    title: 'Test Alert 3',
    message: ALERT_MESSAGE_MOCK,
    severity: Severity.Info,
    alertDetails: ALERT_DETAILS_MOCK,
    field: 'Subject',
  },
];

describe('AlertModal', () => {
  const baseMockUseAlerts = {
    alertKey: 'alert1',
    alerts: mockAlerts,
    fieldAlerts: mockAlerts,
    hideAlertModal: jest.fn(),
    alertModalVisible: true,
    setAlertKey: jest.fn(),
    isAlertConfirmed: jest.fn().mockReturnValue(false),
    setAlertConfirmed: jest.fn(),
    unconfirmedDangerAlerts: [],
    unconfirmedFieldDangerAlerts: [],
    hasUnconfirmedDangerAlerts: false,
    hasUnconfirmedFieldDangerAlerts: false,
  };
  const mockTrackAlertRendered = jest.fn();

  beforeEach(() => {
    (useAlerts as jest.Mock).mockReturnValue(baseMockUseAlerts);
    (useConfirmationAlertMetrics as jest.Mock).mockReturnValue({
      trackAlertRendered: mockTrackAlertRendered,
    });
    jest.clearAllMocks();
  });

  it('renders the AlertModal correctly', async () => {
    const { getByText } = render(<AlertModal />);
    expect(getByText('Test Alert')).toBeDefined();
    expect(getByText(ALERT_MESSAGE_MOCK)).toBeDefined();
    expect(getByText('Alert details')).toBeDefined();
    expect(getByText('• Detail 1')).toBeDefined();
    expect(getByText('• Detail 2')).toBeDefined();
  });

  it('renders the correct icon based on severity', async () => {
    const { getByTestId } = render(<AlertModal />);
    const icon = getByTestId('alert-modal-icon');
    expect(icon).toBeDefined();
    expect(icon.props.name).toBe(IconName.Danger);

    (useAlerts as jest.Mock).mockReturnValue({
      ...baseMockUseAlerts,
      alertKey: 'alert3', // Info
    });
    const { getByTestId: getByTestIdInfo } = render(<AlertModal />);
    const iconInfo = getByTestIdInfo('alert-modal-icon');
    expect(iconInfo.props.name).toBe(IconName.Info);
  });

  it('handles checkbox click correctly', async () => {
    const setAlertConfirmed = jest.fn();
    (useAlerts as jest.Mock).mockReturnValue({
      ...baseMockUseAlerts,
      alertKey: 'alert2',
      setAlertConfirmed,
    });

    const { getByTestId } = render(<AlertModal />);

    const checkbox = getByTestId('alert-modal-checkbox');

    await act(async () => {
      fireEvent.press(checkbox);
    });
    expect(setAlertConfirmed).toHaveBeenCalledWith('alert2', true);
  });

  it('handles action button clicks correctly', async () => {
    const hideAlertModal = jest.fn();
    const action1Callback = jest.fn();

    (useAlerts as jest.Mock).mockReturnValue({
      ...baseMockUseAlerts,
      hideAlertModal,
      fieldAlerts: [
        {
          ...mockAlerts[0],
          action: { ...ALERT_ACTION_MOCK, callback: action1Callback },
        },
      ],
    });

    const { getByText } = render(<AlertModal />);
    const actionButton1 = getByText('Action 1');

    await act(async () => {
      fireEvent.press(actionButton1);
    });
    expect(action1Callback).toHaveBeenCalled();
    expect(hideAlertModal).toHaveBeenCalled();
  });

  it('closes modal when `Got It` button pressed', async () => {
    const hideAlertModal = jest.fn();
    (useAlerts as jest.Mock).mockReturnValue({
      ...baseMockUseAlerts,
      hideAlertModal,
    });
    const { getByText } = render(<AlertModal />);
    await act(async () => {
      fireEvent.press(getByText('Got it'));
    });
    expect(hideAlertModal).toHaveBeenCalledTimes(1);
  });

  it('returns null if the alert modal is not visible', async () => {
    (useAlerts as jest.Mock).mockReturnValue({
      ...baseMockUseAlerts,
      alertModalVisible: false,
    });

    const { queryByText } = render(<AlertModal />);
    expect(queryByText('Test Alert')).toBeNull();
  });

  it('does not render the checkbox if the severity is not Danger', () => {
    (useAlerts as jest.Mock).mockReturnValue({
      ...baseMockUseAlerts,
      alertKey: 'alert1',
    });
    const { queryByText } = render(<AlertModal />);
    expect(queryByText(CHECKBOX_LABEL)).toBeNull();
  });

  it('renders checkbox if the severity is Danger', async () => {
    (useAlerts as jest.Mock).mockReturnValue({
      ...baseMockUseAlerts,
      alertKey: 'alert2',
    });
    const { queryByText } = render(<AlertModal />);
    expect(queryByText(CHECKBOX_LABEL)).toBeDefined();
  });

  it('renders content component correctly', async () => {
    (useAlerts as jest.Mock).mockReturnValue({
      ...baseMockUseAlerts,
      fieldAlerts: [
        {
          ...mockAlerts[0],
          content: <Text>{'Mock content'}</Text>,
        },
      ],
    });
    const { getByText } = render(<AlertModal />);
    expect(getByText('Mock content')).toBeDefined();
  });

  it('renders message component correctly', async () => {
    (useAlerts as jest.Mock).mockReturnValue({
      ...baseMockUseAlerts,
      fieldAlerts: [
        {
          ...mockAlerts[0],
          message: <Text>{'Mock message'}</Text>,
        },
      ],
    });
    const { getByText } = render(<AlertModal />);
    expect(getByText('Mock message')).toBeDefined();
  });

  it('does not render checkbox if is a blocking alert', async () => {
    (useAlerts as jest.Mock).mockReturnValue({
      ...baseMockUseAlerts,
      fieldAlerts: [
        {
          ...mockAlerts[0],
          isBlocking: true,
        },
      ],
    });
    const { queryByText } = render(<AlertModal />);
    expect(queryByText(CHECKBOX_LABEL)).toBeNull();
  });

  it('renders header accessory when provided', () => {
    const headerAccessory = <Text>Header Accessory</Text>;
    const { getByText } = render(
      <AlertModal headerAccessory={headerAccessory} />,
    );
    expect(getByText('Header Accessory')).toBeDefined();
  });

  it('calls onAcknowledgeClick when modal is closed', async () => {
    const onAcknowledgeClick = jest.fn();
    const { getByText } = render(
      <AlertModal onAcknowledgeClick={onAcknowledgeClick} />,
    );
    await act(async () => {
      fireEvent.press(getByText('Got it'));
    });
    expect(onAcknowledgeClick).toHaveBeenCalled();
  });

  it('renders default title when alert title is not provided', () => {
    const alertWithoutTitle = {
      ...mockAlerts[0],
      title: undefined,
    };
    (useAlerts as jest.Mock).mockReturnValue({
      ...baseMockUseAlerts,
      fieldAlerts: [alertWithoutTitle],
    });
    const { getByText } = render(<AlertModal />);
    expect(getByText('Alert')).toBeDefined();
  });

  it('handles alert without message correctly', () => {
    const alertWithoutMessage = {
      ...mockAlerts[0],
      message: undefined,
    };
    (useAlerts as jest.Mock).mockReturnValue({
      ...baseMockUseAlerts,
      fieldAlerts: [alertWithoutMessage],
    });
    const { queryByText } = render(<AlertModal />);
    expect(queryByText(ALERT_MESSAGE_MOCK)).toBeNull();
  });

  it('calls trackAlertRendered when modal is rendered', () => {
    render(<AlertModal />);
    expect(mockTrackAlertRendered).toHaveBeenCalled();
  });

  it('does not call trackAlertRendered when modal is not visible', () => {
    (useAlerts as jest.Mock).mockReturnValue({
      ...baseMockUseAlerts,
      alertModalVisible: false,
    });
    render(<AlertModal />);
    expect(mockTrackAlertRendered).not.toHaveBeenCalled();
  });
});
