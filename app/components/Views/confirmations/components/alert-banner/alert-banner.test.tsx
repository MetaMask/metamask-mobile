import React from 'react';
import { render } from '@testing-library/react-native';
import { TransactionType } from '@metamask/transaction-controller';
import { Alert, Severity } from '../../types/alerts';
import { useAlerts } from '../../context/alert-system-context';
import AlertBanner from './alert-banner';
import { RowAlertKey } from '../UI/info-row/alert-row/constants';
import { useTransactionMetadataRequest } from '../../hooks/transactions/useTransactionMetadataRequest';
import { AlertKeys } from '../../constants/alerts';
import { Text } from '@metamask/design-system-react-native';

jest.mock('../../hooks/transactions/useTransactionMetadataRequest');

jest.mock('../../context/alert-system-context', () => ({
  useAlerts: jest.fn(),
}));

const GENERAL_ALERTS_MOCK: Alert[] = [
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

const FIELD_ALERTS_MOCK: Alert[] = [
  {
    key: '3',
    title: 'Alert 3',
    severity: Severity.Info,
    content: <Text>Details for alert 3</Text>,
    alertDetails: ['Detail 5', 'Detail 6'],
    field: RowAlertKey.Amount,
    isBlocking: true,
  },
  {
    key: '4',
    title: 'Alert 4',
    severity: Severity.Info,
    content: <Text>Details for alert 4</Text>,
    alertDetails: ['Detail 7', 'Detail 8'],
    field: RowAlertKey.PayWith,
    isBlocking: true,
  },
  {
    key: '5',
    title: 'Alert 5',
    severity: Severity.Info,
    content: <Text>Details for alert 5</Text>,
    alertDetails: ['Detail 9', 'Detail 10'],
    field: RowAlertKey.PendingTransaction,
  },
];

describe('AlertBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (useAlerts as jest.Mock).mockReturnValue({
      generalAlerts: GENERAL_ALERTS_MOCK,
      fieldAlerts: FIELD_ALERTS_MOCK,
    });

    (useTransactionMetadataRequest as jest.Mock).mockReturnValue({});
  });

  it('renders general alert banners', () => {
    const { getByTestId, queryByTestId } = render(<AlertBanner />);

    expect(getByTestId('security-alert-banner-0')).toBeOnTheScreen();
    expect(getByTestId('security-alert-banner-1')).toBeOnTheScreen();
    expect(queryByTestId('security-alert-banner-2')).toBeNull();
  });

  it('does not render when there are no general alerts', () => {
    (useAlerts as jest.Mock).mockReturnValue({
      generalAlerts: [],
    });

    const { queryByTestId } = render(<AlertBanner />);

    expect(queryByTestId('security-alert-banner-0')).toBeNull();
  });

  it('renders field alerts when includeFields is set', () => {
    const { getByTestId } = render(<AlertBanner includeFields />);

    expect(getByTestId('security-alert-banner-0')).toBeOnTheScreen();
    expect(getByTestId('security-alert-banner-1')).toBeOnTheScreen();
    expect(getByTestId('security-alert-banner-2')).toBeOnTheScreen();
    expect(getByTestId('security-alert-banner-3')).toBeOnTheScreen();
    expect(getByTestId('security-alert-banner-4')).toBeOnTheScreen();
  });

  it('renders only blocking alerts when blockingOnly is set', () => {
    const { getByTestId, queryByTestId, getByText } = render(
      <AlertBanner blockingOnly includeFields />,
    );

    expect(getByTestId('security-alert-banner-0')).toBeOnTheScreen();
    expect(getByTestId('security-alert-banner-1')).toBeOnTheScreen();
    expect(queryByTestId('security-alert-banner-2')).toBeNull();
    expect(getByText('Alert 3')).toBeOnTheScreen();
    expect(getByText('Alert 4')).toBeOnTheScreen();
  });

  it('renders nothing when transaction type is ignored', () => {
    (useTransactionMetadataRequest as jest.Mock).mockReturnValue({
      type: TransactionType.perpsDeposit,
    });

    const { queryByTestId } = render(
      <AlertBanner ignoreTypes={[TransactionType.perpsDeposit]} />,
    );

    expect(queryByTestId('security-alert-banner-0')).toBeNull();
  });

  it('does not render excluded keys', () => {
    const { getByTestId, queryByTestId, getByText, queryByText } = render(
      <AlertBanner
        blockingOnly
        includeFields
        excludeKeys={['4' as AlertKeys]}
      />,
    );

    expect(getByTestId('security-alert-banner-0')).toBeOnTheScreen();
    expect(queryByTestId('security-alert-banner-1')).toBeNull();
    expect(getByText('Alert 3')).toBeOnTheScreen();
    expect(queryByText('Alert 4')).toBeNull();
  });
});
