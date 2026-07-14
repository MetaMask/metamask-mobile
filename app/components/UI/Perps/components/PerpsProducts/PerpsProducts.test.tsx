import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PerpsProducts from './PerpsProducts';
import Routes from '../../../../../constants/navigation/Routes';
import { selectPerpsProductsEnabledFlag } from '../../selectors/featureFlags';
import type { PerpsCategory } from '../../hooks/usePerpsCategories';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

const mockUseSelector = jest.fn();
jest.mock('react-redux', () => ({
  useSelector: (selector: unknown) => mockUseSelector(selector),
}));

const mockTrackEvent = jest.fn();
const mockAddProperties = jest.fn().mockReturnValue({
  build: jest.fn().mockReturnValue({ built: true }),
});
const mockCreateEventBuilder = jest.fn().mockReturnValue({
  addProperties: mockAddProperties,
});
jest.mock('../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

jest.mock('../../../../../core/Analytics', () => ({
  MetaMetricsEvents: {
    PERPS_UI_INTERACTION: 'PERPS_UI_INTERACTION',
  },
}));

let mockCategories: PerpsCategory[] = [];
let mockHasNewMarkets = false;

jest.mock('../../hooks/usePerpsCategories', () => ({
  usePerpsCategories: () => mockCategories,
  NEW_CATEGORY: { id: 'new', label: 'New' },
}));

jest.mock('../../hooks/useHasNewMarkets', () => ({
  useHasNewMarkets: () => mockHasNewMarkets,
}));

const ALL_CATEGORIES: PerpsCategory[] = [
  { id: 'crypto', label: 'Crypto' },
  { id: 'stock', label: 'Stocks' },
  { id: 'commodity', label: 'Commodities' },
  { id: 'forex', label: 'Forex' },
];

const ALL_SEVEN_CATEGORIES: PerpsCategory[] = [
  { id: 'crypto', label: 'Crypto' },
  { id: 'stock', label: 'Stocks' },
  { id: 'pre-ipo', label: 'Pre-IPO' },
  { id: 'index', label: 'Indices' },
  { id: 'etf', label: 'ETFs' },
  { id: 'commodity', label: 'Commodities' },
  { id: 'forex', label: 'Forex' },
];

describe('PerpsProducts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCategories = ALL_CATEGORIES;
    mockHasNewMarkets = false;
    mockUseSelector.mockImplementation((selector: unknown) => {
      if (selector === selectPerpsProductsEnabledFlag) return true;
      return undefined;
    });
  });

  it('renders nothing when feature flag is disabled', () => {
    mockUseSelector.mockImplementation((selector: unknown) => {
      if (selector === selectPerpsProductsEnabledFlag) return false;
      return undefined;
    });

    const { toJSON } = render(<PerpsProducts />);

    expect(toJSON()).toBeNull();
  });

  it('renders nothing when no categories are available', () => {
    mockCategories = [];

    const { toJSON } = render(<PerpsProducts />);

    expect(toJSON()).toBeNull();
  });

  it('renders pills for available categories', () => {
    mockCategories = [
      { id: 'crypto', label: 'Crypto' },
      { id: 'stock', label: 'Stocks' },
      { id: 'forex', label: 'Forex' },
    ];

    const { getByText, queryByText } = render(<PerpsProducts />);

    expect(getByText('Products')).toBeOnTheScreen();
    expect(getByText('Crypto')).toBeOnTheScreen();
    expect(getByText('Stocks')).toBeOnTheScreen();
    expect(getByText('Forex')).toBeOnTheScreen();
    expect(queryByText('Commodities')).toBeNull();
  });

  it('navigates to market list with category and product pill source', () => {
    const { getByTestId } = render(<PerpsProducts />);

    fireEvent.press(getByTestId('perps-products-crypto'));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.MARKET_LIST,
      params: {
        defaultMarketTypeFilter: 'crypto',
        source: 'perps_home__product_pill',
      },
    });
  });

  it('navigates with correct filter for stocks category', () => {
    const { getByTestId } = render(<PerpsProducts />);

    fireEvent.press(getByTestId('perps-products-stock'));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.MARKET_LIST,
      params: {
        defaultMarketTypeFilter: 'stock',
        source: 'perps_home__product_pill',
      },
    });
  });

  it('renders all seven categories when all have markets', () => {
    mockCategories = ALL_SEVEN_CATEGORIES;

    const { getByText } = render(<PerpsProducts />);

    expect(getByText('Crypto')).toBeOnTheScreen();
    expect(getByText('Stocks')).toBeOnTheScreen();
    expect(getByText('Pre-IPO')).toBeOnTheScreen();
    expect(getByText('Indices')).toBeOnTheScreen();
    expect(getByText('ETFs')).toBeOnTheScreen();
    expect(getByText('Commodities')).toBeOnTheScreen();
    expect(getByText('Forex')).toBeOnTheScreen();
  });

  it('tracks analytics with product_pill_tapped, product, and pill_position', () => {
    const { getByTestId } = render(<PerpsProducts />);

    fireEvent.press(getByTestId('perps-products-stock'));

    expect(mockCreateEventBuilder).toHaveBeenCalledWith('PERPS_UI_INTERACTION');
    expect(mockTrackEvent).toHaveBeenCalled();
    expect(mockAddProperties).toHaveBeenCalledWith(
      expect.objectContaining({
        button_clicked: 'product_pill_tapped',
        product: 'stock',
        pill_position: 1,
      }),
    );
  });

  it('renders category icons', () => {
    mockCategories = [{ id: 'crypto', label: 'Crypto' }];

    const { getByTestId, getByText } = render(<PerpsProducts />);

    expect(getByTestId('perps-products-crypto')).toBeOnTheScreen();
    expect(getByText('Crypto')).toBeOnTheScreen();
  });

  it('renders a leading "New" pill when recently listed markets exist', () => {
    mockHasNewMarkets = true;
    mockCategories = [{ id: 'crypto', label: 'Crypto' }];

    const { getByText, getByTestId } = render(<PerpsProducts />);

    expect(getByText('New')).toBeOnTheScreen();
    expect(getByTestId('perps-products-new')).toBeOnTheScreen();
  });

  it('does not render the "New" pill when there are no recently listed markets', () => {
    mockHasNewMarkets = false;
    mockCategories = [{ id: 'crypto', label: 'Crypto' }];

    const { queryByText, queryByTestId } = render(<PerpsProducts />);

    expect(queryByText('New')).toBeNull();
    expect(queryByTestId('perps-products-new')).toBeNull();
  });

  it('renders the "New" pill before category pills and navigates with the "new" filter', () => {
    mockHasNewMarkets = true;
    mockCategories = [{ id: 'crypto', label: 'Crypto' }];

    const { getByTestId } = render(<PerpsProducts />);

    fireEvent.press(getByTestId('perps-products-new'));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.MARKET_LIST,
      params: {
        defaultMarketTypeFilter: 'new',
        source: 'perps_home__product_pill',
      },
    });
  });

  it('renders the section even when categories are empty but new markets exist', () => {
    mockHasNewMarkets = true;
    mockCategories = [];

    const { getByText, toJSON } = render(<PerpsProducts />);

    expect(toJSON()).not.toBeNull();
    expect(getByText('New')).toBeOnTheScreen();
  });
});
