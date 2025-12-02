import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useAlerts } from '../../../../context/alert-system-context';
import AlertRow, { AlertRowProps } from './alert-row';
import { Severity } from '../../../../types/alerts';
import { IconName } from '../../../../../../../component-library/components/Icons/Icon';
import { useConfirmationAlertMetrics } from '../../../../hooks/metrics/useConfirmationAlertMetrics';
import { InfoRowVariant } from '../info-row';
import styleSheet from './alert-row.styles';

jest.mock('../../../../context/alert-system-context', () => ({
  useAlerts: jest.fn(),
}));

jest.mock('../../../../hooks/metrics/useConfirmationAlertMetrics', () => ({
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

describe('AlertRow', () => {
  const mockShowAlertModal = jest.fn();
  const mockSetAlertKey = jest.fn();
  const mockTrackInlineAlertClicked = jest.fn();
  const useAlertsBase = {
    alerts: mockAlerts,
    fieldAlerts: mockAlerts,
    showAlertModal: mockShowAlertModal,
    setAlertKey: mockSetAlertKey,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useAlerts as jest.Mock).mockReturnValue(useAlertsBase);
    (useConfirmationAlertMetrics as jest.Mock).mockReturnValue({
      trackInlineAlertClicked: mockTrackInlineAlertClicked,
    });
  });

  const LABEL_MOCK = 'Alert Label';
  const CHILDREN_MOCK = 'Test Children';
  const baseProps: AlertRowProps = {
    alertField: ALERT_FIELD_DANGER,
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
    const props = { ...baseProps, alertField: ALERT_FIELD_WARNING };
    const { getByText, getByTestId } = render(<AlertRow {...props} />);
    expect(getByText(LABEL_MOCK)).toBeDefined();
    expect(getByText(CHILDREN_MOCK)).toBeDefined();
    const icon = getByTestId('inline-alert-icon');
    expect(icon.props.name).toBe(IconName.Danger);
  });

  it('renders correctly with default alert', () => {
    const props = { ...baseProps, alertField: ALERT_FIELD_INFO };
    const { getByText, getByTestId } = render(<AlertRow {...props} />);
    expect(getByText(LABEL_MOCK)).toBeDefined();
    expect(getByText(CHILDREN_MOCK)).toBeDefined();
    const icon = getByTestId('inline-alert-icon');
    expect(icon.props.name).toBe(IconName.Info);
  });

  it('does not render when isShownWithAlertsOnly is true and no alert is present', () => {
    const props = {
      ...baseProps,
      alertField: 'alert4',
      isShownWithAlertsOnly: true,
    };
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

  it('calls showAlertModal, setAlertKey and trackInlineAlertClicked when inline alert is clicked', () => {
    const { getByTestId } = render(<AlertRow {...baseProps} />);
    const inlineAlert = getByTestId('inline-alert');
    fireEvent.press(inlineAlert);
    expect(mockSetAlertKey).toHaveBeenCalledWith(ALERT_KEY_DANGER);
    expect(mockShowAlertModal).toHaveBeenCalled();
    expect(mockTrackInlineAlertClicked).toHaveBeenCalled();
    expect(mockTrackInlineAlertClicked).toHaveBeenCalledWith(
      ALERT_FIELD_DANGER,
    );
  });

  it('does not render inline alert for small variant', () => {
    const { getByText, queryByTestId } = render(
      <AlertRow {...baseProps} rowVariant={InfoRowVariant.Small} />,
    );

    expect(getByText(LABEL_MOCK)).toBeDefined();
    expect(getByText(CHILDREN_MOCK)).toBeDefined();
    expect(queryByTestId('inline-alert')).toBeNull();
  });

  it('disables inline alert interaction when disableAlertInteraction prop is true', () => {
    const { getByTestId } = render(
      <AlertRow {...baseProps} disableAlertInteraction />,
    );
    const inlineAlert = getByTestId('inline-alert');

    fireEvent.press(inlineAlert);

    expect(mockSetAlertKey).not.toHaveBeenCalled();
    expect(mockShowAlertModal).not.toHaveBeenCalled();
    expect(mockTrackInlineAlertClicked).not.toHaveBeenCalled();
  });

  it('renders with the given style if provided', () => {
    const props = { ...baseProps, style: { backgroundColor: 'red' } };
    const { getByTestId } = render(<AlertRow {...props} />);
    const infoRow = getByTestId('info-row');
    expect(infoRow.props.style.backgroundColor).toBe('red');
  });

  it('renders with styles.infoRowOverride if no style is provided', () => {
    const styles = styleSheet();
    const { getByTestId } = render(<AlertRow {...baseProps} />);
    const infoRow = getByTestId('info-row');

    expect(infoRow.props.style).toMatchObject(styles.infoRowOverride);
  });
});
