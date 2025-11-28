import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import { IconName } from '../../../../../../component-library/components/Icons/Icon';
import { Alert, Severity } from '../../../types/alerts';
import { useAlerts } from '../../../context/alert-system-context';
import { useConfirmationAlertMetrics } from '../../../hooks/metrics/useConfirmationAlertMetrics';
import InlineAlert from './inline-alert';

jest.mock('../../../context/alert-system-context', () => ({
  useAlerts: jest.fn(),
}));

jest.mock('../../../hooks/metrics/useConfirmationAlertMetrics', () => ({
  useConfirmationAlertMetrics: jest.fn(),
}));

const ALERT_KEY_DANGER = 'DANGER_ALERT';
const ALERT_KEY_WARNING = 'WARNING_ALERT';
const ALERT_KEY_INFO = 'INFO_ALERT';
const ALERT_FIELD_DANGER = 'field_danger';
const ALERT_FIELD_WARNING = 'field_warning';
const ALERT_FIELD_INFO = 'field_info';
const mockAlerts = [
  {
    key: ALERT_KEY_DANGER,
    field: ALERT_FIELD_DANGER,
    severity: Severity.Danger,
    message: 'This is a danger alert',
  },
  {
    key: ALERT_KEY_WARNING,
    field: ALERT_FIELD_WARNING,
    severity: Severity.Warning,
    message: 'This is a warning alert',
  },
  {
    key: ALERT_KEY_INFO,
    field: ALERT_FIELD_INFO,
    severity: Severity.Info,
    message: 'This is an info alert',
  },
];

describe('InlineAlert', () => {
  const INLINE_ALERT_LABEL = 'Alert';
  const mockShowAlertModal = jest.fn();
  const mockSetAlertKey = jest.fn();
  const mockTrackInlineAlertClicked = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    const useAlertsBase = {
      alerts: mockAlerts,
      fieldAlerts: mockAlerts,
      showAlertModal: mockShowAlertModal,
      setAlertKey: mockSetAlertKey,
    };

    (useAlerts as jest.Mock).mockReturnValue(useAlertsBase);
    (useConfirmationAlertMetrics as jest.Mock).mockReturnValue({
      trackInlineAlertClicked: mockTrackInlineAlertClicked,
    });
  });

  const renderComponent = (alertObj: Alert = mockAlerts[0], disabled = false) =>
    render(<InlineAlert alertObj={alertObj} disabled={disabled} />);

  it('renders correctly with default props', () => {
    const { getByTestId, getByText } = renderComponent();
    const inlineAlert = getByTestId('inline-alert');
    const label = getByText(INLINE_ALERT_LABEL);

    expect(inlineAlert).toBeDefined();
    expect(label).toBeDefined();
  });

  it('renders with danger severity', () => {
    const { getByTestId } = renderComponent(mockAlerts[0]);
    const icon = getByTestId('inline-alert-icon');

    expect(icon.props.name).toBe(IconName.Danger);
  });

  it('renders with warning severity', () => {
    const { getByTestId } = renderComponent(mockAlerts[1]);
    const icon = getByTestId('inline-alert-icon');

    expect(icon.props.name).toBe(IconName.Danger);
  });

  it('renders with info severity', () => {
    const { getByTestId } = renderComponent(mockAlerts[2]);
    const icon = getByTestId('inline-alert-icon');

    expect(icon.props.name).toBe(IconName.Info);
  });

  it('renders with default severity', () => {
    const { getByTestId } = renderComponent({
      key: ALERT_KEY_INFO,
      field: ALERT_FIELD_INFO,
      message: 'This is a info alert',
    } as unknown as Alert);
    const icon = getByTestId('inline-alert-icon');

    expect(icon.props.name).toBe(IconName.Info);
  });

  it('calls showAlertModal, setAlertKey and trackInlineAlertClicked when inline alert is clicked', () => {
    const { getByTestId } = renderComponent(mockAlerts[0]);
    const inlineAlert = getByTestId('inline-alert');
    fireEvent.press(inlineAlert);
    expect(mockSetAlertKey).toHaveBeenCalledWith(ALERT_KEY_DANGER);
    expect(mockShowAlertModal).toHaveBeenCalled();
    expect(mockTrackInlineAlertClicked).toHaveBeenCalled();
    expect(mockTrackInlineAlertClicked).toHaveBeenCalledWith(
      ALERT_FIELD_DANGER,
    );
  });

  it('does not call showAlertModal when inline alert is disabled and clicked', () => {
    const { getByTestId } = renderComponent(mockAlerts[0], true);
    const inlineAlert = getByTestId('inline-alert');

    fireEvent.press(inlineAlert);

    expect(mockSetAlertKey).not.toHaveBeenCalled();
    expect(mockShowAlertModal).not.toHaveBeenCalled();
    expect(mockTrackInlineAlertClicked).not.toHaveBeenCalled();
  });
});
