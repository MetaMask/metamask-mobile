import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import {
  PERPS_EVENT_VALUE,
  type PerpsMarketData,
} from '@metamask/perps-controller';
import PerpsTopMoversSection, {
  type PerpsTopMoversSectionProps,
} from './PerpsTopMoversSection';
import { usePerpsTopMovers } from '../../hooks/usePerpsTopMovers';
import { usePerpsNavigation } from '../../hooks';
import { PerpsHomeViewSelectorsIDs } from '../../Perps.testIds';

const mockNavigateToMarketList = jest.fn();

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('../../hooks/usePerpsTopMovers', () => ({
  usePerpsTopMovers: jest.fn(),
}));

jest.mock('../../hooks', () => ({
  usePerpsNavigation: jest.fn(),
}));

jest.mock('../../../Trending/components/PillScrollList', () => ({
  PillScrollList: ({
    data,
    isLoading,
    renderItem,
    keyExtractor,
    listTestId,
  }: {
    data: PerpsMarketData[];
    isLoading: boolean;
    renderItem: (item: PerpsMarketData) => React.ReactNode;
    keyExtractor: (item: PerpsMarketData) => string;
    listTestId: string;
  }) => {
    const ReactModule = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    return ReactModule.createElement(
      View,
      { testID: listTestId },
      isLoading
        ? ReactModule.createElement(View, { testID: 'mock-pill-skeleton' })
        : data.map((item) =>
            ReactModule.createElement(
              View,
              { key: keyExtractor(item) },
              renderItem(item),
            ),
          ),
    );
  },
}));

jest.mock('../PerpsPillItem', () => ({
  PerpsPillItem: ({
    item,
    marketDetailsSource,
    transactionActiveAbTests,
  }: {
    item: { market: { symbol: string } };
    marketDetailsSource: string;
    transactionActiveAbTests?: unknown[];
  }) => {
    const ReactModule = jest.requireActual('react');
    const { View, Text } = jest.requireActual('react-native');
    return ReactModule.createElement(
      View,
      { testID: `mock-pill-${item.market.symbol}` },
      ReactModule.createElement(
        Text,
        { testID: `mock-pill-source-${item.market.symbol}` },
        marketDetailsSource,
      ),
      ReactModule.createElement(
        Text,
        { testID: `mock-pill-ab-tests-${item.market.symbol}` },
        JSON.stringify(transactionActiveAbTests ?? null),
      ),
    );
  },
}));

const mockUseSelector = useSelector as jest.Mock;
const mockUsePerpsTopMovers = usePerpsTopMovers as jest.Mock;
const mockUsePerpsNavigation = usePerpsNavigation as jest.Mock;

const DEFAULT_SOURCE = PERPS_EVENT_VALUE.SOURCE.PERPS_HOME;

const buildMarket = (symbol: string): PerpsMarketData =>
  ({ symbol }) as PerpsMarketData;

const renderSection = (props: Partial<PerpsTopMoversSectionProps> = {}) =>
  render(<PerpsTopMoversSection source={DEFAULT_SOURCE} {...props} />);

describe('PerpsTopMoversSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockReturnValue(true);
    mockUsePerpsTopMovers.mockReturnValue({
      data: [buildMarket('ETH'), buildMarket('BTC')],
      isLoading: false,
    });
    mockUsePerpsNavigation.mockReturnValue({
      navigateToMarketList: mockNavigateToMarketList,
    });
  });

  it('returns null when the feature flag is disabled', () => {
    mockUseSelector.mockReturnValue(false);

    renderSection();

    expect(
      screen.queryByTestId(PerpsHomeViewSelectorsIDs.TOP_MOVERS_SECTION),
    ).not.toBeOnTheScreen();
  });

  it('returns null when not loading and there is no market data', () => {
    mockUsePerpsTopMovers.mockReturnValue({ data: [], isLoading: false });

    renderSection();

    expect(
      screen.queryByTestId(PerpsHomeViewSelectorsIDs.TOP_MOVERS_SECTION),
    ).not.toBeOnTheScreen();
  });

  it('renders the section when enabled with market data', () => {
    renderSection();

    expect(
      screen.getByTestId(PerpsHomeViewSelectorsIDs.TOP_MOVERS_SECTION),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('mock-pill-ETH')).toBeOnTheScreen();
    expect(screen.getByTestId('mock-pill-BTC')).toBeOnTheScreen();
  });

  it('renders the section while loading even when data is empty', () => {
    mockUsePerpsTopMovers.mockReturnValue({ data: [], isLoading: true });

    renderSection();

    expect(
      screen.getByTestId(PerpsHomeViewSelectorsIDs.TOP_MOVERS_SECTION),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('mock-pill-skeleton')).toBeOnTheScreen();
  });

  it('selects the gainers (desc) toggle by default', () => {
    renderSection();

    expect(
      screen.getByTestId(PerpsHomeViewSelectorsIDs.TOP_MOVERS_GAINERS_PILL)
        .props.accessibilityState.selected,
    ).toBe(true);
    expect(
      screen.getByTestId(PerpsHomeViewSelectorsIDs.TOP_MOVERS_LOSERS_PILL).props
        .accessibilityState.selected,
    ).toBe(false);
  });

  it('selects the losers toggle after pressing it', () => {
    renderSection();

    fireEvent.press(
      screen.getByTestId(PerpsHomeViewSelectorsIDs.TOP_MOVERS_LOSERS_PILL),
    );

    expect(
      screen.getByTestId(PerpsHomeViewSelectorsIDs.TOP_MOVERS_LOSERS_PILL).props
        .accessibilityState.selected,
    ).toBe(true);
    expect(
      screen.getByTestId(PerpsHomeViewSelectorsIDs.TOP_MOVERS_GAINERS_PILL)
        .props.accessibilityState.selected,
    ).toBe(false);
  });

  it('requests the losers (asc) direction from the data hook after selecting losers', () => {
    renderSection();

    fireEvent.press(
      screen.getByTestId(PerpsHomeViewSelectorsIDs.TOP_MOVERS_LOSERS_PILL),
    );

    expect(mockUsePerpsTopMovers).toHaveBeenLastCalledWith({
      direction: 'asc',
    });
  });

  it('navigates to the market list with the desc direction and provided source when the header is pressed', () => {
    renderSection();

    fireEvent.press(
      screen.getByTestId(PerpsHomeViewSelectorsIDs.TOP_MOVERS_HEADER),
    );

    expect(mockNavigateToMarketList).toHaveBeenCalledWith({
      defaultSortOptionId: 'priceChange',
      defaultSortDirection: 'desc',
      source: DEFAULT_SOURCE,
    });
  });

  it('navigates with the asc direction after selecting losers', () => {
    renderSection();

    fireEvent.press(
      screen.getByTestId(PerpsHomeViewSelectorsIDs.TOP_MOVERS_LOSERS_PILL),
    );
    fireEvent.press(
      screen.getByTestId(PerpsHomeViewSelectorsIDs.TOP_MOVERS_HEADER),
    );

    expect(mockNavigateToMarketList).toHaveBeenCalledWith({
      defaultSortOptionId: 'priceChange',
      defaultSortDirection: 'asc',
      source: DEFAULT_SOURCE,
    });
  });

  it('passes the section source to each rendered pill', () => {
    renderSection({ source: PERPS_EVENT_VALUE.SOURCE.EXPLORE });

    expect(screen.getByTestId('mock-pill-source-ETH')).toHaveTextContent(
      PERPS_EVENT_VALUE.SOURCE.EXPLORE,
    );
    expect(screen.getByTestId('mock-pill-source-BTC')).toHaveTextContent(
      PERPS_EVENT_VALUE.SOURCE.EXPLORE,
    );
  });

  it('forwards transactionActiveAbTests to each pill', () => {
    const abTests = [{ testName: 'perps_fee_discount', variant: 'control' }];

    renderSection({ transactionActiveAbTests: abTests as never });

    expect(screen.getByTestId('mock-pill-ab-tests-ETH')).toHaveTextContent(
      JSON.stringify(abTests),
    );
    expect(screen.getByTestId('mock-pill-ab-tests-BTC')).toHaveTextContent(
      JSON.stringify(abTests),
    );
  });

  it('forwards transactionActiveAbTests to navigateToMarketList when View All is pressed', () => {
    const abTests = [{ testName: 'perps_fee_discount', variant: 'control' }];

    renderSection({ transactionActiveAbTests: abTests as never });

    fireEvent.press(
      screen.getByTestId(PerpsHomeViewSelectorsIDs.TOP_MOVERS_HEADER),
    );

    expect(mockNavigateToMarketList).toHaveBeenCalledWith({
      defaultSortOptionId: 'priceChange',
      defaultSortDirection: 'desc',
      source: DEFAULT_SOURCE,
      transactionActiveAbTests: abTests,
    });
  });

  it('does not include transactionActiveAbTests in navigateToMarketList when not provided', () => {
    renderSection();

    fireEvent.press(
      screen.getByTestId(PerpsHomeViewSelectorsIDs.TOP_MOVERS_HEADER),
    );

    expect(mockNavigateToMarketList).toHaveBeenCalledWith({
      defaultSortOptionId: 'priceChange',
      defaultSortDirection: 'desc',
      source: DEFAULT_SOURCE,
    });
  });
});
