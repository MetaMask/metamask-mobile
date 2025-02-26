import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { useAlerts } from '../context';
import AlertModal from './AlertModal';
import { IconName } from '../../../../../component-library/components/Icons/Icon';
import Text from '../../../../../component-library/components/Texts/Text';
import { Severity } from '../../types/alerts';
import { useAlertsConfirmed } from '../../../../hooks/useAlertsConfirmed';

jest.mock('../../../../../util/theme', () => ({
  useTheme: jest.fn(),
}));

jest.mock('../context', () => ({
  useAlerts: jest.fn(),
}));

jest.mock('../../../../hooks/useAlertsConfirmed', () => ({
  useAlertsConfirmed: jest.fn(),
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
  },
  {
    key: 'alert2',
    title: 'Test Alert 2',
    message: ALERT_MESSAGE_MOCK,
    severity: Severity.Danger,
    alertDetails: ALERT_DETAILS_MOCK,
    action: ALERT_ACTION_MOCK,
  },
  {
    key: 'alert3',
    title: 'Test Alert 3',
    message: ALERT_MESSAGE_MOCK,
    severity: Severity.Info,
    alertDetails: ALERT_DETAILS_MOCK,
  },
];

describe('AlertModal', () => {
  const baseMockUseAlerts = {
    alerts: mockAlerts,
    hideAlertModal: jest.fn(),
    alertModalVisible: true,
  };

  const baseMockUseAlertsConfirmed = {
    alertKey: 'alert1',
    isAlertConfirmed: jest.fn().mockReturnValue(false),
    setAlertConfirmed: jest.fn(),
    setAlertKey: jest.fn(),
    unconfirmedDangerAlerts: [],
    unconfirmedFieldDangerAlerts: [],
    hasUnconfirmedDangerAlerts: false,
    hasUnconfirmedFieldDangerAlerts: false,
  };

  beforeEach(() => {
    (useAlerts as jest.Mock).mockReturnValue(baseMockUseAlerts);
    (useAlertsConfirmed as jest.Mock).mockReturnValue(baseMockUseAlertsConfirmed);
    jest.clearAllMocks();
  });

  it('renders the AlertModal correctly', async () => {
    const { getByText } = render(<AlertModal />);
    expect(getByText('Test Alert')).toBeDefined();
    expect(getByText(ALERT_MESSAGE_MOCK)).toBeDefined();
    expect(getByText('Alert Details')).toBeDefined();
    expect(getByText('• Detail 1')).toBeDefined();
    expect(getByText('• Detail 2')).toBeDefined();
  });

  it('renders the correct icon based on severity', async () => {
    const { getByTestId } = render(<AlertModal />);
    const icon = getByTestId('alert-modal-icon');
    expect(icon).toBeDefined();
    expect(icon.props.name).toBe(IconName.Danger);

    (useAlertsConfirmed as jest.Mock).mockReturnValue({
      ...baseMockUseAlertsConfirmed,
      alertKey: 'alert3', // Info
    });
    const { getByTestId: getByTestIdInfo } = render(<AlertModal />);
    const iconInfo = getByTestIdInfo('alert-modal-icon');
    expect(iconInfo.props.name).toBe(IconName.Info);
  });

  it('handles checkbox click correctly', async () => {
    (useAlertsConfirmed as jest.Mock).mockReturnValue({
      ...baseMockUseAlertsConfirmed,
      alertKey: 'alert2',
    });
    const setAlertConfirmed = jest.fn();
    (useAlertsConfirmed as jest.Mock).mockReturnValueOnce({
      ...baseMockUseAlertsConfirmed,
      setAlertConfirmed,
      alertKey: 'alert2',
    });

    const { getByText } = render(<AlertModal />);

    const checkbox = getByText(CHECKBOX_LABEL);

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
      alerts: [{
        ...mockAlerts[0],
        action: { ...ALERT_ACTION_MOCK, callback: action1Callback },
      }]
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
    (useAlertsConfirmed as jest.Mock).mockReturnValue({
      ...baseMockUseAlertsConfirmed,
      alertKey: 'alert1',
    });
    const { queryByText } = render(<AlertModal />);
    expect(queryByText(CHECKBOX_LABEL)).toBeNull();
  });

  it('renders checkbox if the severity is Danger', async () => {
    (useAlertsConfirmed as jest.Mock).mockReturnValue({
      ...baseMockUseAlertsConfirmed,
      alertKey: 'alert2',
    });
    const { queryByText } = render(<AlertModal />);
    expect(queryByText(CHECKBOX_LABEL)).toBeDefined();
  });

  it('renders content component correctly', async () => {
    (useAlerts as jest.Mock).mockReturnValue({
      ...baseMockUseAlerts,
      alerts: [{
        ...mockAlerts[0],
        content: <Text>{'Mock content'}</Text>,
      }]
    });
    const { getByText } = render(<AlertModal />);
    expect(getByText('Mock content')).toBeDefined();
  });

  it('does not render checkbox if is a blocking alert', async () => {
    (useAlerts as jest.Mock).mockReturnValue({
      ...baseMockUseAlerts,
      alerts: [{
        ...mockAlerts[0],
        isBlocking: true,
      }]
    });
    const { queryByText } = render(<AlertModal />);
    expect(queryByText(CHECKBOX_LABEL)).toBeNull();
  });
});
