import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import I18n from '../../../../../../../locales/i18n';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';
import { useAnalytics } from '../../../../../hooks/useAnalytics/useAnalytics';
import {
  type AbsolutePriceAlert,
  type CreatePriceAlertRouteParams,
  CreatePriceAlertTestIds,
  type PercentChangeAlert,
} from '../../constants';
import useAlertSaveFlow from '../../hooks/useAlertSaveFlow';
import type { usePerpsLiveFocusedPrice } from '../../../../Perps/hooks/stream/usePerpsLiveFocusedPrice';
import CreatePriceAlertView from './CreatePriceAlertView';

const mockGoBack = jest.fn();
const mockAbsoluteForm = jest.fn((_props: unknown) => (
  <Text testID="mock-absolute-form">Absolute form</Text>
));
const mockPercentForm = jest.fn((_props: unknown) => (
  <Text testID="mock-percent-form">Percent form</Text>
));
const mockFeatureGate = jest.fn((_props: unknown) => (
  <Text testID="mock-feature-gate">Feature gate</Text>
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

jest.mock('../../hooks/useAlertSaveFlow', () => ({
  __esModule: true,
  default: jest.fn(() => ({ saveAlert: jest.fn() })),
}));

jest.mock('../../perpApi', () => ({
  __esModule: true,
  default: jest.fn(() => ({ saveAlert: jest.fn() })),
  perpAlertsQueryKey: jest.fn((marketId: string) => ['perp-alerts', marketId]),
  fetchPerpAlerts: jest.fn(),
  createPerpAlert: jest.fn(),
  updatePerpAlert: jest.fn(),
  deletePerpAlert: jest.fn(),
  useSubmitPerpAlert: jest.fn(() => ({
    submit: jest.fn(),
    isSubmitting: false,
  })),
}));

jest.mock('./AbsolutePriceAlertForm', () => ({
  __esModule: true,
  default: (props: unknown) => mockAbsoluteForm(props),
}));

jest.mock('./PercentChangeAlertForm', () => ({
  __esModule: true,
  default: (props: unknown) => mockPercentForm(props),
}));

jest.mock(
  '../../../../../../components/Views/Settings/NotificationsSettings/FeatureNotificationsGate',
  () => ({
    FeatureNotificationsGate: (props: unknown) => mockFeatureGate(props),
  }),
);

const mockUsePerpsLiveFocusedPrice = jest.fn<
  ReturnType<typeof usePerpsLiveFocusedPrice>,
  []
>(() => undefined);
jest.mock('../../../../Perps/hooks/stream/usePerpsLiveFocusedPrice', () => ({
  usePerpsLiveFocusedPrice: () => mockUsePerpsLiveFocusedPrice(),
}));
jest.mock('../../../../Perps/providers/PerpsStreamManager', () => ({
  PerpsStreamProvider: ({ children }: { children: React.ReactNode }) =>
    children,
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
const mockUseAlertSaveFlow = jest.mocked(useAlertSaveFlow);
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
    mockUsePerpsLiveFocusedPrice.mockReturnValue(undefined);
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
      alert_market_type: 'spot',
    });
  });

  it('enables auto-watchlisting when creating the first alert for an asset', () => {
    mockRouteParams = {
      ...baseRoute,
      existingAbsoluteAlerts: [],
      existingPercentAlerts: [],
    };

    render(<CreatePriceAlertView />);

    expect(mockUseAlertSaveFlow).toHaveBeenCalledWith(
      expect.objectContaining({
        assetId: 'eip155:1/slip44:60',
        shouldAutoWatchlistOnCreate: true,
      }),
    );
  });

  it('disables auto-watchlisting while editing an alert', () => {
    mockRouteParams = {
      ...baseRoute,
      editingAlert: absoluteAlert,
      existingAbsoluteAlerts: [],
      existingPercentAlerts: [],
    };

    render(<CreatePriceAlertView />);

    expect(mockUseAlertSaveFlow).toHaveBeenCalledWith(
      expect.objectContaining({
        assetId: 'eip155:1/slip44:60',
        shouldAutoWatchlistOnCreate: false,
      }),
    );
  });

  it('disables auto-watchlisting when the asset has an existing alert', () => {
    mockRouteParams = {
      ...baseRoute,
      existingAbsoluteAlerts: [absoluteAlert],
      existingPercentAlerts: [],
    };

    render(<CreatePriceAlertView />);

    expect(mockUseAlertSaveFlow).toHaveBeenCalledWith(
      expect.objectContaining({
        assetId: 'eip155:1/slip44:60',
        shouldAutoWatchlistOnCreate: false,
      }),
    );
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

  it('renders the price alerts notifications gate', () => {
    const screen = render(<CreatePriceAlertView />);

    expect(screen.getByTestId('mock-feature-gate')).toBeOnTheScreen();
    expect(mockFeatureGate).toHaveBeenCalledWith(
      expect.objectContaining({ feature: 'priceAlerts' }),
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

  it('centers the header title and subtitle text', () => {
    const screen = render(<CreatePriceAlertView />);

    expect(
      StyleSheet.flatten(
        screen.getByTestId(CreatePriceAlertTestIds.HEADER_TITLE).props.style,
      ),
    ).toEqual(expect.objectContaining({ textAlign: 'center' }));
    expect(
      StyleSheet.flatten(
        screen.getByTestId(CreatePriceAlertTestIds.HEADER_SUBTITLE).props.style,
      ),
    ).toEqual(expect.objectContaining({ textAlign: 'center' }));
  });

  it('centers the longest localized title when it wraps', () => {
    const originalLocale = I18n.locale;
    I18n.locale = 'el';

    try {
      const screen = render(<CreatePriceAlertView />);

      expect(
        screen.getByText('Δημιουργία ειδοποίησης τιμής για ETH'),
      ).toBeOnTheScreen();
      expect(
        StyleSheet.flatten(
          screen.getByTestId(CreatePriceAlertTestIds.HEADER_TITLE).props.style,
        ),
      ).toEqual(expect.objectContaining({ textAlign: 'center' }));
    } finally {
      I18n.locale = originalLocale;
    }
  });

  it('formats a Perps BTC header like the live market header', () => {
    mockRouteParams = {
      symbol: 'BTC',
      ticker: 'BTC',
      currentPrice: 83714,
      currentCurrency: 'usd',
      assetId: 'BTC',
      mode: 'perps',
      marketId: 'btc-hyperliquid-mainnet',
      szDecimals: 5,
    };

    const screen = render(<CreatePriceAlertView />);

    expect(screen.getByText('$83,714')).toBeOnTheScreen();
  });

  it('formats a Perps kPEPE header like the live market header', () => {
    mockRouteParams = {
      symbol: 'kPEPE',
      ticker: 'kPEPE',
      currentPrice: 0.008764,
      currentCurrency: 'usd',
      assetId: 'kPEPE',
      mode: 'perps',
      marketId: 'kpepe-hyperliquid-mainnet',
      szDecimals: 0,
    };

    const screen = render(<CreatePriceAlertView />);

    expect(screen.getByText('$0.008764')).toBeOnTheScreen();
  });

  it('updates the Perps header subtitle when a live tick arrives', () => {
    mockUsePerpsLiveFocusedPrice.mockReturnValue({
      symbol: 'BTC',
      price: '84000',
      markPrice: '84000',
      timestamp: 1,
      isTradable: true,
    });
    mockRouteParams = {
      symbol: 'BTC',
      ticker: 'BTC',
      currentPrice: 83714,
      currentCurrency: 'usd',
      assetId: 'BTC',
      mode: 'perps',
      marketId: 'btc-hyperliquid-mainnet',
      szDecimals: 5,
    };

    const screen = render(<CreatePriceAlertView />);

    expect(screen.getByText('$84,000')).toBeOnTheScreen();
    expect(mockAbsoluteForm).toHaveBeenCalledWith(
      expect.objectContaining({ currentPrice: 84000, szDecimals: 5 }),
    );
  });
});
