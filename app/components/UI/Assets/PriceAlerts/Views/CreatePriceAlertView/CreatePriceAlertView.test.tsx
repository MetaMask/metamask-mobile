import React from 'react';
import { Text } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';
import { useAnalytics } from '../../../../../hooks/useAnalytics/useAnalytics';
import {
  type AbsolutePriceAlert,
  type CreatePriceAlertRouteParams,
  CreatePriceAlertTestIds,
  type PercentChangeAlert,
} from '../../constants';
import CreatePriceAlertView from './CreatePriceAlertView';

const mockGoBack = jest.fn();
const mockAbsoluteForm = jest.fn((_props: unknown) => (
  <Text testID="mock-absolute-form">Absolute form</Text>
));
const mockPercentForm = jest.fn((_props: unknown) => (
  <Text testID="mock-percent-form">Percent form</Text>
));

const baseRoute: CreatePriceAlertRouteParams = {
  symbol: 'ETH',
  ticker: 'ETH',
  currentPrice: 1201.98,
  currentCurrency: 'USD',
  assetId: 'eip155:1/slip44:60',
};
let mockRouteParams: CreatePriceAlertRouteParams = baseRoute;

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: mockGoBack }),
  useRoute: () => ({ params: mockRouteParams }),
}));

jest.mock('./AbsolutePriceAlertForm', () => ({
  __esModule: true,
  default: (props: unknown) => mockAbsoluteForm(props),
}));

jest.mock('./PercentChangeAlertForm', () => ({
  __esModule: true,
  default: (props: unknown) => mockPercentForm(props),
}));

const absoluteAlert: AbsolutePriceAlert = {
  id: 'absolute-alert-1',
  userId: 'user-1',
  asset: 'eip155:1/slip44:60',
  type: 'absolute_price',
  threshold: 1500,
  recurring: true,
  active: true,
  createdAt: '2025-01-01T00:00:00.000Z',
};

const percentAlert: PercentChangeAlert = {
  id: 'percent-alert-1',
  userId: 'user-1',
  asset: 'eip155:1/slip44:60',
  type: 'percent_change',
  threshold: 10,
  period: '24h',
  direction: 'up',
  recurring: true,
  active: true,
  createdAt: '2025-01-01T00:00:00.000Z',
};

const mockAnalytics = jest.mocked(useAnalytics)();
const viewedBuilder = () => {
  const calls = jest.mocked(mockAnalytics.createEventBuilder).mock.calls;
  const index = calls.findIndex(
    ([event]) => event === MetaMetricsEvents.PRICE_ALERT_CREATION_VIEWED,
  );
  return jest.mocked(mockAnalytics.createEventBuilder).mock.results[index]
    .value;
};

describe('CreatePriceAlertView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = baseRoute;
  });

  it('switches from the absolute form to the percent-change form', () => {
    const screen = render(<CreatePriceAlertView />);
    expect(screen.getByTestId('mock-absolute-form')).toBeOnTheScreen();
    expect(screen.queryByTestId('mock-percent-form')).not.toBeOnTheScreen();

    fireEvent.press(
      screen.getByTestId(CreatePriceAlertTestIds.TYPE_SEGMENT_CHANGE),
    );

    expect(screen.getByTestId('mock-percent-form')).toBeOnTheScreen();
    expect(screen.queryByTestId('mock-absolute-form')).not.toBeOnTheScreen();
  });

  it('preselects the percent-change form from initialType', () => {
    mockRouteParams = { ...baseRoute, initialType: 'percent_change' };

    const screen = render(<CreatePriceAlertView />);

    expect(screen.getByTestId('mock-percent-form')).toBeOnTheScreen();
    expect(screen.queryByTestId('mock-absolute-form')).not.toBeOnTheScreen();
  });

  it.each([
    ['absolute', absoluteAlert, 'mock-absolute-form'],
    ['percent-change', percentAlert, 'mock-percent-form'],
  ] as const)(
    'selects the %s form and disables type switching while editing',
    (_label, editingAlert, expectedFormTestId) => {
      mockRouteParams = { ...baseRoute, editingAlert };

      const screen = render(<CreatePriceAlertView />);

      expect(screen.getByTestId(expectedFormTestId)).toBeOnTheScreen();
      expect(
        screen.getByTestId(CreatePriceAlertTestIds.TYPE_SEGMENT_TARGET),
      ).toBeDisabled();
      expect(
        screen.getByTestId(CreatePriceAlertTestIds.TYPE_SEGMENT_CHANGE),
      ).toBeDisabled();
    },
  );

  it('tracks creation viewed with has_existing_alert false', () => {
    render(<CreatePriceAlertView />);

    expect(mockAnalytics.createEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.PRICE_ALERT_CREATION_VIEWED,
    );
    expect(viewedBuilder().addProperties).toHaveBeenCalledWith({
      asset_id: 'eip155:1/slip44:60',
      token_symbol: 'ETH',
      has_existing_alert: false,
    });
  });

  it('tracks creation viewed with has_existing_alert true for an absolute alert', () => {
    mockRouteParams = {
      ...baseRoute,
      existingAbsoluteAlerts: [absoluteAlert],
    };

    render(<CreatePriceAlertView />);

    expect(viewedBuilder().addProperties).toHaveBeenCalledWith(
      expect.objectContaining({ has_existing_alert: true }),
    );
  });

  it('tracks creation viewed with has_existing_alert true for a percent alert', () => {
    mockRouteParams = {
      ...baseRoute,
      existingPercentAlerts: [percentAlert],
    };

    render(<CreatePriceAlertView />);

    expect(viewedBuilder().addProperties).toHaveBeenCalledWith(
      expect.objectContaining({ has_existing_alert: true }),
    );
  });

  it('skips creation viewed analytics while editing', () => {
    mockRouteParams = { ...baseRoute, editingAlert: absoluteAlert };

    render(<CreatePriceAlertView />);

    expect(mockAnalytics.createEventBuilder).not.toHaveBeenCalledWith(
      MetaMetricsEvents.PRICE_ALERT_CREATION_VIEWED,
    );
  });

  it('renders the create title and current price subtitle', () => {
    const screen = render(<CreatePriceAlertView />);

    expect(screen.getByText('Create ETH price alert')).toBeOnTheScreen();
    expect(screen.getByText('$1,201.98')).toBeOnTheScreen();
  });

  it('renders the edit title and current price subtitle', () => {
    mockRouteParams = { ...baseRoute, editingAlert: absoluteAlert };

    const screen = render(<CreatePriceAlertView />);

    expect(screen.getByText('Edit ETH price alert')).toBeOnTheScreen();
    expect(screen.getByText('$1,201.98')).toBeOnTheScreen();
  });
});
