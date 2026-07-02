import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import {
  PERPS_EVENT_VALUE,
  PERPS_EVENT_PROPERTY,
  type PerpsMarketData,
} from '@metamask/perps-controller';
import PerpsTopMoversSection, {
  type PerpsTopMoversSectionProps,
} from './PerpsTopMoversSection';
import { usePerpsTopMovers } from '../../hooks/usePerpsTopMovers';
import { usePerpsNavigation } from '../../hooks';
import { PerpsHomeViewSelectorsIDs } from '../../Perps.testIds';

const mockNavigateToMarketList = jest.fn();
const mockTrack = jest.fn();

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('../../hooks/usePerpsTopMovers', () => ({
  usePerpsTopMovers: jest.fn(),
  isPerpsTopMoversSectionVisible: jest.requireActual(
    '../../hooks/usePerpsTopMovers',
  ).isPerpsTopMoversSectionVisible,
}));

jest.mock('../../hooks', () => ({
  usePerpsNavigation: jest.fn(),
}));

jest.mock('../../hooks/usePerpsEventTracking', () => ({
  usePerpsEventTracking: () => ({ track: mockTrack }),
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
    marketDetailsSourceSection,
    transactionActiveAbTests,
  }: {
    item: { market: { symbol: string } };
    marketDetailsSource: string;
    marketDetailsSourceSection?: string;
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
        { testID: `mock-pill-source-section-${item.market.symbol}` },
        marketDetailsSourceSection ?? '',
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
    mockTrack.mockReset();
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

    expect(mockUsePerpsTopMovers).toHaveBeenCalledWith({
      direction: 'desc',
    });
  });

  it('selects the losers toggle after pressing it', () => {
    renderSection();

    fireEvent.press(
      screen.getByTestId(PerpsHomeViewSelectorsIDs.TOP_MOVERS_LOSERS_PILL),
    );

    expect(mockUsePerpsTopMovers).toHaveBeenLastCalledWith({
      direction: 'asc',
    });

    fireEvent.press(
      screen.getByTestId(PerpsHomeViewSelectorsIDs.TOP_MOVERS_GAINERS_PILL),
    );

    expect(mockUsePerpsTopMovers).toHaveBeenLastCalledWith({
      direction: 'desc',
    });
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

  it('fires PERPS_UI_INTERACTION with button_clicked=top_movers when the header is pressed', () => {
    renderSection();

    fireEvent.press(
      screen.getByTestId(PerpsHomeViewSelectorsIDs.TOP_MOVERS_HEADER),
    );

    expect(mockTrack).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
          PERPS_EVENT_VALUE.INTERACTION_TYPE.BUTTON_CLICKED,
        [PERPS_EVENT_PROPERTY.BUTTON_CLICKED]:
          PERPS_EVENT_VALUE.BUTTON_CLICKED.TOP_MOVERS,
        [PERPS_EVENT_PROPERTY.BUTTON_LOCATION]:
          PERPS_EVENT_VALUE.BUTTON_LOCATION.PERPS_HOME,
      }),
    );
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

  it('passes source=perps_home and source_section=top_gainers to each pill when gainers toggle is active (default)', () => {
    renderSection();

    // source is perps_home (unified model)
    expect(screen.getByTestId('mock-pill-source-ETH')).toHaveTextContent(
      PERPS_EVENT_VALUE.SOURCE.PERPS_HOME,
    );
    expect(screen.getByTestId('mock-pill-source-BTC')).toHaveTextContent(
      PERPS_EVENT_VALUE.SOURCE.PERPS_HOME,
    );
    // source_section distinguishes gainers from losers
    expect(
      screen.getByTestId('mock-pill-source-section-ETH'),
    ).toHaveTextContent(PERPS_EVENT_VALUE.SOURCE_SECTION.TOP_GAINERS);
    expect(
      screen.getByTestId('mock-pill-source-section-BTC'),
    ).toHaveTextContent(PERPS_EVENT_VALUE.SOURCE_SECTION.TOP_GAINERS);
  });

  it('passes source=perps_home and source_section=top_losers to each pill after switching to losers toggle', () => {
    renderSection();

    fireEvent.press(
      screen.getByTestId(PerpsHomeViewSelectorsIDs.TOP_MOVERS_LOSERS_PILL),
    );

    expect(screen.getByTestId('mock-pill-source-ETH')).toHaveTextContent(
      PERPS_EVENT_VALUE.SOURCE.PERPS_HOME,
    );
    expect(screen.getByTestId('mock-pill-source-BTC')).toHaveTextContent(
      PERPS_EVENT_VALUE.SOURCE.PERPS_HOME,
    );
    expect(
      screen.getByTestId('mock-pill-source-section-ETH'),
    ).toHaveTextContent(PERPS_EVENT_VALUE.SOURCE_SECTION.TOP_LOSERS);
    expect(
      screen.getByTestId('mock-pill-source-section-BTC'),
    ).toHaveTextContent(PERPS_EVENT_VALUE.SOURCE_SECTION.TOP_LOSERS);
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
