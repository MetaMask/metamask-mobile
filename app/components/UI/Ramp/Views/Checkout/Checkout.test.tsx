import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import Checkout from './Checkout';
import { ThemeContext, mockTheme } from '../../../../../util/theme';

const mockNavigate = jest.fn();
const mockSetOptions = jest.fn();
const mockGoBack = jest.fn();

const mockOnCloseBottomSheet = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    setOptions: mockSetOptions,
    goBack: mockGoBack,
  }),
  useRoute: () => ({
    params: {
      url: 'https://provider.example.com/widget?test=1',
      providerName: 'Test Provider',
    },
  }),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
  I18nEvents: {
    addListener: jest.fn(),
  },
}));

jest.mock('../../../Navbar', () => ({}));

jest.mock('../../../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../../../util/navigation/navUtils'),
  useParams: jest.fn(() => ({
    url: 'https://provider.example.com/widget?test=1',
    providerName: 'Test Provider',
  })),
}));

jest.mock('../../../../../util/browser', () => ({
  shouldStartLoadWithRequest: jest.fn(() => true),
}));

jest.mock('../../../../../util/Logger', () => ({
  log: jest.fn(),
  error: jest.fn(),
}));

jest.mock('../../Aggregator/sdk', () => ({
  useRampSDK: jest.fn(() => ({
    selectedPaymentMethodId: null,
    selectedRegion: null,
    selectedAsset: null,
    selectedFiatCurrencyId: null,
    isBuy: true,
  })),
}));

jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const mockReact = jest.requireActual('react');
    return {
      __esModule: true,
      default: mockReact.forwardRef(
        (
          {
            children,
          }: {
            children: React.ReactNode;
          },
          ref: React.Ref<unknown>,
        ) => {
          mockReact.useImperativeHandle(ref, () => ({
            onCloseBottomSheet: mockOnCloseBottomSheet,
          }));
          return <>{children}</>;
        },
      ),
    };
  },
);

describe('Checkout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with valid URL', () => {
    const { toJSON } = render(
      <ThemeContext.Provider value={mockTheme}>
        <Checkout />
      </ThemeContext.Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders WebView when URL is provided', () => {
    const { getByTestId } = render(
      <ThemeContext.Provider value={mockTheme}>
        <Checkout />
      </ThemeContext.Provider>,
    );

    expect(getByTestId('checkout-webview')).toBeOnTheScreen();
  });

  it('renders close button', () => {
    const { getByTestId } = render(
      <ThemeContext.Provider value={mockTheme}>
        <Checkout />
      </ThemeContext.Provider>,
    );

    expect(getByTestId('checkout-close-button')).toBeOnTheScreen();
  });

  it('passes userAgent to WebView when provided in params', () => {
    const useParamsMock = jest.requireMock<
      typeof import('../../../../../util/navigation/navUtils')
    >('../../../../../util/navigation/navUtils').useParams as jest.Mock;

    useParamsMock.mockReturnValue({
      url: 'https://provider.example.com/widget',
      providerName: 'Test Provider',
      userAgent: 'CustomProvider/1.0 (MetaMask)',
    });

    const { getByTestId } = render(
      <ThemeContext.Provider value={mockTheme}>
        <Checkout />
      </ThemeContext.Provider>,
    );

    const webview = getByTestId('checkout-webview');
    expect(webview.props.userAgent).toBe('CustomProvider/1.0 (MetaMask)');

    useParamsMock.mockReturnValue({
      url: 'https://provider.example.com/widget?test=1',
      providerName: 'Test Provider',
    });
  });

  it('does not show error view for auxiliary resource HTTP errors', () => {
    const { getByTestId, queryByText } = render(
      <ThemeContext.Provider value={mockTheme}>
        <Checkout />
      </ThemeContext.Provider>,
    );

    const webview = getByTestId('checkout-webview');

    // Simulate an HTTP error for an auxiliary resource (not the initial URL)
    fireEvent(webview, 'onHttpError', {
      nativeEvent: {
        url: 'https://analytics.example.com/track.js',
        statusCode: 404,
      },
    });

    // Error view should NOT be shown for auxiliary resource failures
    expect(
      queryByText('fiat_on_ramp_aggregator.webview_received_error'),
    ).not.toBeOnTheScreen();
  });

  it('shows error view on HTTP error for initial URL', () => {
    const { getByTestId, getByText } = render(
      <ThemeContext.Provider value={mockTheme}>
        <Checkout />
      </ThemeContext.Provider>,
    );

    const webview = getByTestId('checkout-webview');

    fireEvent(webview, 'onHttpError', {
      nativeEvent: {
        url: 'https://provider.example.com/widget?test=1',
        statusCode: 500,
      },
    });

    expect(
      getByText('fiat_on_ramp_aggregator.webview_received_error'),
    ).toBeOnTheScreen();
  });
});
