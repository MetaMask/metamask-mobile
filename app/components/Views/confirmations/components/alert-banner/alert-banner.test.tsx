import React from 'react';
import { render } from '@testing-library/react-native';
import { BannerAlertSeverity } from '../../../../../component-library/components/Banners/Banner';
import Text from '../../../../../component-library/components/Texts/Text';
import { Alert, Severity } from '../../types/alerts';
import { useAlerts } from '../../context/alert-system-context';
import AlertBanner from './alert-banner';
import { getBannerAlertSeverity } from '../../utils/alert-system';
import { RowAlertKey } from '../UI/info-row/alert-row/constants';

jest.mock('../../context/alert-system-context', () => ({
  useAlerts: jest.fn(),
}));

describe('AlertBanner', () => {
  const mockAlerts: Alert[] = [
    {
      key: '1',
      title: 'Alert 1',
      severity: Severity.Danger,
      content: <Text>Details for alert 1</Text>,
      alertDetails: ['Detail 1', 'Detail 2'],
    },
    {
      key: '2',
      title: 'Alert 2',
      message: 'This is alert 2',
      severity: Severity.Warning,
      alertDetails: ['Detail 3', 'Detail 4'],
    },
    {
      key: '3',
      title: 'Alert 3',
      severity: Severity.Info,
      content: <Text>Details for alert 3</Text>,
      alertDetails: ['Detail 5', 'Detail 6'],
      field: RowAlertKey.Amount,
    },
    {
      key: '4',
      title: 'Alert 4',
      severity: Severity.Info,
      content: <Text>Details for alert 4</Text>,
      alertDetails: ['Detail 7', 'Detail 8'],
      field: RowAlertKey.Amount,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    (useAlerts as jest.Mock).mockReturnValue({
      generalAlerts: mockAlerts,
      fieldAlerts: mockAlerts,
    });
  });

  it('renders correctly when there are general alerts', () => {
    const { getByText } = render(<AlertBanner />);
    expect(getByText('Alert 1')).toBeDefined();
    expect(getByText('Details for alert 1')).toBeDefined();
    expect(getByText('Alert 2')).toBeDefined();
    expect(getByText('This is alert 2')).toBeDefined();
  });

  it('does not render when there are no general alerts', () => {
    (useAlerts as jest.Mock).mockReturnValue({
      generalAlerts: [],
    });
    const { queryByText } = render(<AlertBanner />);
    expect(queryByText('Alert 1')).toBeNull();
    expect(queryByText('Alert 2')).toBeNull();
  });

  it('converts severity correctly', () => {
    expect(getBannerAlertSeverity(Severity.Danger)).toBe(
      BannerAlertSeverity.Error,
    );
    expect(getBannerAlertSeverity(Severity.Warning)).toBe(
      BannerAlertSeverity.Warning,
    );
    expect(getBannerAlertSeverity(Severity.Info)).toBe(
      BannerAlertSeverity.Info,
    );
  });

  it('renders field alerts if field specified', () => {
    const { getByText } = render(<AlertBanner field={RowAlertKey.Amount} />);

    expect(getByText('Alert 3')).toBeDefined();
    expect(getByText('Details for alert 3')).toBeDefined();

    expect(getByText('Alert 4')).toBeDefined();
    expect(getByText('Details for alert 4')).toBeDefined();
  });

  it('renders nothing if no field alerts mathcing specified field', () => {
    const { queryByText } = render(
      <AlertBanner field={RowAlertKey.Blockaid} />,
    );

    expect(queryByText('Alert 3')).toBeNull();
    expect(queryByText('Details for alert 3')).toBeNull();

    expect(queryByText('Alert 4')).toBeNull();
    expect(queryByText('Details for alert 4')).toBeNull();
  });
});
