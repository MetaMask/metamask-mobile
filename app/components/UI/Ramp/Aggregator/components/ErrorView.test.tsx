import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import ErrorView from './ErrorView';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';

const mockUseRampSDK = jest.fn();
const mockTrackEvent = jest.fn();

jest.mock('../../hooks/useAnalytics', () => ({
  __esModule: true,
  default: () => mockTrackEvent,
}));

jest.mock('../sdk', () => ({
  useRampSDK: () => mockUseRampSDK(),
}));

function renderWithProvider(component: React.ComponentType) {
  return renderScreen(
    component,
    {
      name: 'ErrorView',
    },
    {
      state: {
        engine: {
          backgroundState,
        },
      },
    },
  );
}

describe('ErrorView Component', () => {
  const mockCtaOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRampSDK.mockReturnValue({
      selectedPaymentMethodId: null,
      selectedRegion: null,
      selectedAsset: null,
      selectedFiatCurrencyId: null,
      isBuy: true,
    });
  });

  it('renders with description only', () => {
    const { toJSON, getByText } = renderWithProvider(() => (
      <ErrorView description="Test error message" location="Provider Webview" />
    ));
    expect(getByText('Test error message')).toBeOnTheScreen();
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders with custom title', () => {
    const { getByText } = renderWithProvider(() => (
      <ErrorView
        title="Custom Error"
        description="Test description"
        location="Provider Webview"
      />
    ));
    expect(getByText('Custom Error')).toBeOnTheScreen();
  });

  it('renders with custom CTA label', () => {
    const { getByText } = renderWithProvider(() => (
      <ErrorView
        description="Test error"
        ctaLabel="Retry Now"
        ctaOnPress={mockCtaOnPress}
        location="Provider Webview"
      />
    ));
    expect(getByText('Retry Now')).toBeOnTheScreen();
  });

  it('calls ctaOnPress when button is pressed', () => {
    const { getByText } = renderWithProvider(() => (
      <ErrorView
        description="Test error"
        ctaOnPress={mockCtaOnPress}
        location="Provider Webview"
      />
    ));

    const button = getByText('fiat_on_ramp_aggregator.try_again');
    fireEvent.press(button);

    expect(mockCtaOnPress).toHaveBeenCalledTimes(1);
  });

  it('renders without CTA button when ctaOnPress is not provided', () => {
    const { queryByText } = renderWithProvider(() => (
      <ErrorView description="Test error" location="Provider Webview" />
    ));

    expect(queryByText('fiat_on_ramp_aggregator.try_again')).toBeNull();
  });

  it('renders with error icon by default', () => {
    const { toJSON } = renderWithProvider(() => (
      <ErrorView description="Test error" location="Provider Webview" />
    ));
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders with info icon when specified', () => {
    const { toJSON } = renderWithProvider(() => (
      <ErrorView
        description="Info message"
        icon="info"
        location="Provider Webview"
      />
    ));
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders with expired icon when specified', () => {
    const { toJSON } = renderWithProvider(() => (
      <ErrorView
        description="Session expired"
        icon="expired"
        location="Provider Webview"
      />
    ));
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders as non-screen when asScreen is false', () => {
    const { toJSON } = renderWithProvider(() => (
      <ErrorView
        description="Inline error"
        asScreen={false}
        location="Provider Webview"
      />
    ));
    expect(toJSON()).toMatchSnapshot();
  });

  it('tracks ONRAMP_ERROR event when SDK is available for buy', () => {
    mockUseRampSDK.mockReturnValue({
      selectedPaymentMethodId: 'card',
      selectedRegion: { id: 'us-ny', country: {} },
      selectedAsset: { symbol: 'ETH' },
      selectedFiatCurrencyId: 'USD',
      isBuy: true,
    });

    renderWithProvider(() => (
      <ErrorView description="Test error" location="Provider Webview" />
    ));

    expect(mockTrackEvent).toHaveBeenCalledWith('ONRAMP_ERROR', {
      location: 'Provider Webview',
      message: 'Test error',
      payment_method_id: 'card',
      region: 'us-ny',
      currency_source: 'USD',
      currency_destination: 'ETH',
    });
  });

  it('tracks OFFRAMP_ERROR event when SDK is available for sell', () => {
    mockUseRampSDK.mockReturnValue({
      selectedPaymentMethodId: 'bank',
      selectedRegion: { id: 'uk-gb', country: {} },
      selectedAsset: { symbol: 'USDC' },
      selectedFiatCurrencyId: 'GBP',
      isBuy: false,
    });

    renderWithProvider(() => (
      <ErrorView description="Sell error" location="Provider Webview" />
    ));

    expect(mockTrackEvent).toHaveBeenCalledWith('OFFRAMP_ERROR', {
      location: 'Provider Webview',
      message: 'Sell error',
      payment_method_id: 'bank',
      region: 'uk-gb',
      currency_source: 'USDC',
      currency_destination: 'GBP',
    });
  });

  it('does not track analytics when SDK is null', () => {
    mockUseRampSDK.mockReturnValue(null);

    renderWithProvider(() => (
      <ErrorView description="Test error" location="Provider Webview" />
    ));

    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it('matches snapshot with all props', () => {
    mockUseRampSDK.mockReturnValue({
      selectedPaymentMethodId: 'card',
      selectedRegion: { id: 'us-ny', country: {} },
      selectedAsset: { symbol: 'ETH' },
      selectedFiatCurrencyId: 'USD',
      isBuy: true,
    });

    const { toJSON } = renderWithProvider(() => (
      <ErrorView
        title="Network Error"
        description="Failed to connect"
        ctaLabel="Try Again"
        ctaOnPress={mockCtaOnPress}
        icon="error"
        asScreen
        location="Provider Webview"
      />
    ));
    expect(toJSON()).toMatchSnapshot();
  });
});
