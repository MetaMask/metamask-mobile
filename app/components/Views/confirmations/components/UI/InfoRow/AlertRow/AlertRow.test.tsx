import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useAlerts } from '../../../../AlertSystem/context';
import AlertRow, { AlertRowProps } from './AlertRow';
import { Severity } from '../../../../types/alerts';
import { IconName } from '../../../../../../../component-library/components/Icons/Icon';

jest.mock('../../../../AlertSystem/context', () => ({
  useAlerts: jest.fn(),
}));

const ALERT_KEY_DANGER = 'DANGER_ALERT';
const ALERT_KEY_WARNING = 'WARNING_ALERT';
const ALERT_KEY_INFO = 'INFO_ALERT';
const mockAlerts = [
  {
    key: ALERT_KEY_DANGER,
    severity: Severity.Danger,
    message: 'This is a danger alert',
  },
  {
    key: ALERT_KEY_WARNING,
    severity: Severity.Warning,
    message: 'This is a warning alert',
  },
  {
    key: ALERT_KEY_INFO,
    severity: Severity.Info,
    message: 'This is a info alert',
  },
];

describe('AlertRow', () => {
  const mockShowAlertModal = jest.fn();
  const mockSetAlertKey = jest.fn();
  const useAlertsBase = {
    alerts: mockAlerts,
    fieldAlerts: mockAlerts,
    showAlertModal: mockShowAlertModal,
    setAlertKey: mockSetAlertKey,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useAlerts as jest.Mock).mockReturnValue(useAlertsBase);
  });

  const LABEL_MOCK = 'Alert Label';
  const CHILDREN_MOCK = 'Test Children';
  const baseProps: AlertRowProps = {
    alertKey: ALERT_KEY_DANGER,
    label: LABEL_MOCK,
    children: CHILDREN_MOCK,
  };

  it('renders correctly inline alert', () => {
    const { getByText, getByTestId } = render(<AlertRow {...baseProps} />);
    expect(getByText(LABEL_MOCK)).toBeDefined();
    expect(getByText(CHILDREN_MOCK)).toBeDefined();
    expect(getByTestId('inline-alert')).toBeDefined();
    const icon = getByTestId('inline-alert-icon');
    expect(icon.props.name).toBe(IconName.Danger);
  });

  it('renders correctly with warning alert', () => {
    const props = { ...baseProps, alertKey: ALERT_KEY_WARNING };
    const { getByText, getByTestId} = render(<AlertRow {...props} />);
    expect(getByText(LABEL_MOCK)).toBeDefined();
    expect(getByText(CHILDREN_MOCK)).toBeDefined();
    const icon = getByTestId('inline-alert-icon');
    expect(icon.props.name).toBe(IconName.Danger);
  });

  it('renders correctly with default alert', () => {
    const props = { ...baseProps, alertKey: ALERT_KEY_INFO };
    const { getByText, getByTestId } = render(<AlertRow {...props} />);
    expect(getByText(LABEL_MOCK)).toBeDefined();
    expect(getByText(CHILDREN_MOCK)).toBeDefined();
    const icon = getByTestId('inline-alert-icon');
    expect(icon.props.name).toBe(IconName.Info);
  });

  it('does not render when isShownWithAlertsOnly is true and no alert is present', () => {
    const props = { ...baseProps, alertKey: 'alert4', isShownWithAlertsOnly: true };
    const { queryByText } = render(<AlertRow {...props} />);
    expect(queryByText(LABEL_MOCK)).toBeNull();
    expect(queryByText(CHILDREN_MOCK)).toBeNull();
  });

  it('renders when isShownWithAlertsOnly is true and alert is present', () => {
    const props = { ...baseProps, isShownWithAlertsOnly: true };
    const { getByText } = render(<AlertRow {...props} />);
    expect(getByText(LABEL_MOCK)).toBeDefined();
    expect(getByText(CHILDREN_MOCK)).toBeDefined();
  });

  it('calls showAlertModal and setAlertKey when inline alert is clicked', () => {
    const { getByText } = render(<AlertRow {...baseProps} />);
    const inlineAlert = getByText('Alert');
    fireEvent.press(inlineAlert);
    expect(mockSetAlertKey).toHaveBeenCalledWith(ALERT_KEY_DANGER);
    expect(mockShowAlertModal).toHaveBeenCalled();
  });
});
