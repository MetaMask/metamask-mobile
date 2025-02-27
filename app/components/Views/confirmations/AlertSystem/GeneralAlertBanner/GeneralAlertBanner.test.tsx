import React from 'react';
import { render } from '@testing-library/react-native';
import { BannerAlertSeverity } from '../../../../../component-library/components/Banners/Banner';
import Text from '../../../../../component-library/components/Texts/Text';
import { Alert, Severity } from '../../types/alerts';
import { useAlerts } from '../context';
import GeneralAlertBanner from './GeneralAlertBanner';
import { getBannerAlertSeverity } from '../utils';

jest.mock('../context', () => ({
  useAlerts: jest.fn(),
}));

describe('GeneralAlertBanner', () => {
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
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (useAlerts as jest.Mock).mockReturnValue({
      generalAlerts: mockAlerts,
    });
  });

  it('renders correctly when there are general alerts', () => {
    const { getByText } = render(<GeneralAlertBanner />);
    expect(getByText('Alert 1')).toBeDefined();
    expect(getByText('Details for alert 1')).toBeDefined();
    expect(getByText('Alert 2')).toBeDefined();
    expect(getByText('This is alert 2')).toBeDefined();
  });

  it('does not render when there are no general alerts', () => {
    (useAlerts as jest.Mock).mockReturnValue({
      generalAlerts: [],
    });
    const { queryByText } = render(<GeneralAlertBanner />);
    expect(queryByText('Alert 1')).toBeNull();
    expect(queryByText('Alert 2')).toBeNull();
  });

  it('converts severity correctly', () => {
    expect(getBannerAlertSeverity(Severity.Danger)).toBe(BannerAlertSeverity.Error);
    expect(getBannerAlertSeverity(Severity.Warning)).toBe(BannerAlertSeverity.Warning);
    expect(getBannerAlertSeverity(Severity.Info)).toBe(BannerAlertSeverity.Info);
  });
});
