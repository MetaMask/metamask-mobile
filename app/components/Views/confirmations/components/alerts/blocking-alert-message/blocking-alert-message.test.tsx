import React from 'react';
import { Text } from 'react-native';
import { screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { useAlerts } from '../../../context/alert-system-context';
import { Alert, Severity } from '../../../types/alerts';
import { BlockingAlertMessage } from './blocking-alert-message';

jest.mock('../../../context/alert-system-context', () => ({
  useAlerts: jest.fn(),
}));

const mockUseAlerts = jest.mocked(useAlerts);

const buildBlockingAlert = (overrides: Partial<Alert> = {}): Alert => ({
  key: 'blocking-alert',
  severity: Severity.Danger,
  message: 'Blocking alert message',
  isBlocking: true,
  ...overrides,
});

const mockAlertsContext = (alerts: Alert[]) => {
  mockUseAlerts.mockReturnValue({
    alerts,
  } as ReturnType<typeof useAlerts>);
};

describe('BlockingAlertMessage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when there is no blocking alert message', () => {
    mockAlertsContext([
      buildBlockingAlert({ message: undefined }),
      buildBlockingAlert({ isBlocking: false }),
    ]);

    const { toJSON } = renderWithProvider(<BlockingAlertMessage />, {
      state: {},
    });

    expect(toJSON()).toBeNull();
  });

  it('renders the first blocking string message', () => {
    mockAlertsContext([
      buildBlockingAlert({ message: 'First blocking message' }),
      buildBlockingAlert({
        key: 'blocking-alert-2',
        message: 'Second blocking message',
      }),
    ]);

    renderWithProvider(<BlockingAlertMessage />, { state: {} });

    expect(screen.getByText('First blocking message')).toBeOnTheScreen();
    expect(screen.queryByText('Second blocking message')).toBeNull();
  });

  it('renders a blocking React element message', () => {
    mockAlertsContext([
      buildBlockingAlert({
        message: <Text>React element alert content</Text>,
      }),
    ]);

    renderWithProvider(<BlockingAlertMessage />, { state: {} });

    expect(screen.getByText('React element alert content')).toBeOnTheScreen();
  });
});
