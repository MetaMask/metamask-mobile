import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PerpsProducts from './PerpsProducts';
import Routes from '../../../../../constants/navigation/Routes';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../../../../../component-library/hooks', () => ({
  useStyles: () => ({
    styles: {
      container: {},
      grid: {},
      pill: {},
      pillPressed: {},
      pillIcon: {},
    },
  }),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const labels: Record<string, string> = {
      'perps.home.products': 'Products',
      'perps.home.tabs.crypto': 'Crypto',
      'perps.home.tabs.stocks': 'Stocks',
      'perps.home.tabs.pre_ipo': 'Pre-IPO',
      'perps.home.tabs.indices': 'Indices',
      'perps.home.tabs.etfs': 'ETFs',
      'perps.home.tabs.commodities': 'Commodities',
      'perps.home.tabs.forex': 'Forex',
    };
    return labels[key] || key;
  },
}));

jest.mock('@metamask/design-system-react-native', () => {
  const { Text: RNText } = jest.requireActual('react-native');
  const React = jest.requireActual('react');
  return {
    Text: ({
      children,
      style,
      testID,
    }: {
      children?: React.ReactNode;
      style?: object;
      testID?: string;
    }) => React.createElement(RNText, { style, testID }, children),
    TextVariant: { BodyMd: 'BodyMd' },
    FontWeight: { Medium: 'Medium' },
  };
});

jest.mock(
  '../../../../../component-library/components-temp/SectionHeader',
  () => {
    const { Text } = jest.requireActual('react-native');
    const React = jest.requireActual('react');
    return function MockSectionHeader({ title }: { title: string }) {
      return React.createElement(Text, null, title);
    };
  },
);

const mockTrackEvent = jest.fn();
jest.mock('../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: jest.fn(() => ({
      addProperties: jest.fn(() => ({
        build: jest.fn(() => ({})),
      })),
    })),
  }),
}));

jest.mock('../../../../../core/Analytics', () => ({
  MetaMetricsEvents: {
    PERPS_UI_INTERACTION: 'PERPS_UI_INTERACTION',
  },
}));

describe('PerpsProducts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when all market counts are zero', () => {
    const { toJSON } = render(
      <PerpsProducts
        marketCounts={{ crypto: 0, stocks: 0, commodities: 0, forex: 0 }}
      />,
    );

    expect(toJSON()).toBeNull();
  });

  it('renders pills only for categories with markets', () => {
    const { getByText, queryByText } = render(
      <PerpsProducts
        marketCounts={{
          crypto: 10,
          stocks: 5,
          commodities: 0,
          forex: 3,
        }}
        testID="perps-products"
      />,
    );

    expect(getByText('Products')).toBeOnTheScreen();
    expect(getByText('Crypto')).toBeOnTheScreen();
    expect(getByText('Stocks')).toBeOnTheScreen();
    expect(getByText('Forex')).toBeOnTheScreen();
    expect(queryByText('Commodities')).toBeNull();
  });

  it('navigates to market list with category on pill press', () => {
    const { getByTestId } = render(
      <PerpsProducts
        marketCounts={{ crypto: 10, stocks: 5 }}
        source="perps_home"
        testID="perps-products"
      />,
    );

    fireEvent.press(getByTestId('perps-products-crypto'));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.MARKET_LIST,
      params: {
        defaultMarketTypeFilter: 'crypto',
        source: 'perps_home',
      },
    });
  });

  it('navigates with correct filter for stocks category', () => {
    const { getByTestId } = render(
      <PerpsProducts
        marketCounts={{ crypto: 10, stocks: 5 }}
        source="perps_home"
        testID="perps-products"
      />,
    );

    fireEvent.press(getByTestId('perps-products-stocks'));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.MARKET_LIST,
      params: {
        defaultMarketTypeFilter: 'stocks',
        source: 'perps_home',
      },
    });
  });

  it('renders all seven categories when all have markets', () => {
    const { getByText } = render(
      <PerpsProducts
        marketCounts={{
          crypto: 10,
          stocks: 5,
          'pre-ipo': 2,
          indices: 3,
          etfs: 4,
          commodities: 6,
          forex: 8,
        }}
        testID="perps-products"
      />,
    );

    expect(getByText('Crypto')).toBeOnTheScreen();
    expect(getByText('Stocks')).toBeOnTheScreen();
    expect(getByText('Pre-IPO')).toBeOnTheScreen();
    expect(getByText('Indices')).toBeOnTheScreen();
    expect(getByText('ETFs')).toBeOnTheScreen();
    expect(getByText('Commodities')).toBeOnTheScreen();
    expect(getByText('Forex')).toBeOnTheScreen();
  });

  it('tracks analytics event on pill press', () => {
    const { getByTestId } = render(
      <PerpsProducts marketCounts={{ crypto: 10 }} testID="perps-products" />,
    );

    fireEvent.press(getByTestId('perps-products-crypto'));

    expect(mockTrackEvent).toHaveBeenCalled();
  });

  it('renders category icons', () => {
    const { getByText } = render(
      <PerpsProducts marketCounts={{ crypto: 10 }} testID="perps-products" />,
    );

    expect(getByText('⟠')).toBeOnTheScreen();
  });
});
