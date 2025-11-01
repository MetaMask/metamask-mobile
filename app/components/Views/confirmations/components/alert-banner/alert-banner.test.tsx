import React from 'react';
import { render } from '@testing-library/react-native';
import { BannerAlertSeverity } from '../../../../../component-library/components/Banners/Banner';
import Text from '../../../../../component-library/components/Texts/Text';
import { Alert, Severity } from '../../types/alerts';
import { useAlerts } from '../../context/alert-system-context';
import AlertBanner from './alert-banner';
import { getBannerAlertSeverity } from '../../utils/alert-system';
import { RowAlertKey } from '../UI/info-row/alert-row/constants';
import { useTransactionMetadataRequest } from '../../hooks/transactions/useTransactionMetadataRequest';
import { TransactionType } from '@metamask/transaction-controller';
import { AlertKeys } from '../../constants/alerts';

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

  it('renders correctly when there are general alerts', () => {
    const { getByText, queryByText } = render(<AlertBanner />);

    expect(getByText('Alert 1')).toBeDefined();
    expect(getByText('Alert 2')).toBeDefined();
    expect(queryByText('Alert 3')).toBeNull();
    expect(queryByText('Alert 4')).toBeNull();
    expect(queryByText('Alert 5')).toBeNull();
  });

  it('does not render when there are no general alerts', () => {
    (useAlerts as jest.Mock).mockReturnValue({
      generalAlerts: [],
    });

    const { toJSON } = render(<AlertBanner />);
    expect(toJSON()).toBeNull();
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

  it('renders field alerts if includeFields set', () => {
    const { getByText } = render(<AlertBanner includeFields />);

    expect(getByText('Alert 1')).toBeDefined();
    expect(getByText('Alert 2')).toBeDefined();
    expect(getByText('Alert 3')).toBeDefined();
    expect(getByText('Alert 4')).toBeDefined();
    expect(getByText('Alert 5')).toBeDefined();
  });

  it('renders blocking only if set', () => {
    const { getByText, queryByText } = render(
      <AlertBanner blockingOnly includeFields />,
    );

    expect(queryByText('Alert 1')).toBeNull();
    expect(queryByText('Alert 2')).toBeNull();
    expect(getByText('Alert 3')).toBeDefined();
    expect(getByText('Alert 4')).toBeDefined();
    expect(queryByText('Alert 5')).toBeNull();
  });

  it('renders nothing if transaction type ignored', () => {
    (useTransactionMetadataRequest as jest.Mock).mockReturnValue({
      type: TransactionType.perpsDeposit,
    });

    const { toJSON } = render(
      <AlertBanner ignoreTypes={[TransactionType.perpsDeposit]} />,
    );

    expect(toJSON()).toBeNull();
  });

  it('does not render excluded keys', () => {
    const { getByText, queryByText } = render(
      <AlertBanner
        blockingOnly
        includeFields
        excludeKeys={['4' as AlertKeys]}
      />,
    );

    expect(queryByText('Alert 1')).toBeNull();
    expect(queryByText('Alert 2')).toBeNull();
    expect(getByText('Alert 3')).toBeDefined();
    expect(queryByText('Alert 4')).toBeNull();
    expect(queryByText('Alert 5')).toBeNull();
  });
});
