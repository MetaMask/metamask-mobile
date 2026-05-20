import React, { createRef } from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import type { PerpsMarketData } from '@metamask/perps-controller/types';
import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
} from '@metamask/perps-controller/constants';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { MetaMetricsEvents } from '../../../../../core/Analytics/MetaMetrics.events';
import { strings } from '../../../../../../locales/i18n';
import type { SectionRefreshHandle } from '../../types';
import useHomeViewedEvent, {
  HomeSectionNames,
} from '../../hooks/useHomeViewedEvent';
import { useSectionPerformance } from '../../hooks/useSectionPerformance';
import Routes from '../../../../../constants/navigation/Routes';
import { selectIsFirstTimePerpsUser } from '../../../../UI/Perps/selectors/perpsController';
import type { PerpsFeedItem } from '../../../TrendingView/feeds/perps/usePerpsFeed';
import HomepagePerpsMoversSection from './HomepagePerpsMoversSection';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

const mockUsePerpsFeed = jest.fn();
jest.mock('../../../TrendingView/feeds/perps/usePerpsFeed', () => ({
  usePerpsFeed: (...args: unknown[]) => mockUsePerpsFeed(...args),
}));

jest.mock('../../../../UI/Perps/selectors/perpsController', () => ({
  ...jest.requireActual('../../../../UI/Perps/selectors/perpsController'),
  selectIsFirstTimePerpsUser: jest.fn(),
}));

const mockTrack = jest.fn();
jest.mock('../../../../UI/Perps/hooks/usePerpsEventTracking', () => ({
  usePerpsEventTracking: () => ({ track: mockTrack }),
}));

jest.mock('../../hooks/useHomeViewedEvent', () => {
  const actualHomeViewedEvent = jest.requireActual<
    typeof import('../../hooks/useHomeViewedEvent')
  >('../../hooks/useHomeViewedEvent');
  return {
    __esModule: true,
    HomeSectionNames: actualHomeViewedEvent.HomeSectionNames,
    default: jest.fn(() => ({ onLayout: jest.fn() })),
  };
});

jest.mock('../../hooks/useSectionPerformance', () => ({
  useSectionPerformance: jest.fn(),
}));

jest.mock('../../../TrendingView/feeds/perps/PerpsPillItem', () => {
  const ReactLib = jest.requireActual('react');
  const RN = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      item,
      onCardPress,
      onNavigateToMarketDetails,
    }: {
      item: PerpsFeedItem;
      onCardPress?: () => void;
      onNavigateToMarketDetails?: (market: PerpsFeedItem['market']) => void;
    }) =>
      ReactLib.createElement(
        RN.Pressable,
        {
          testID: 'homepage-perps-movers-mock-pill',
          onPress: () => {
            onCardPress?.();
            onNavigateToMarketDetails?.(item.market);
          },
        },
        ReactLib.createElement(RN.Text, null, 'pill'),
      ),
  };
});

const mockedSelectIsFirstTimePerpsUser = jest.mocked(
  selectIsFirstTimePerpsUser,
);
const mockedUseHomeViewedEvent = jest.mocked(useHomeViewedEvent);
const mockedUseSectionPerformance = jest.mocked(useSectionPerformance);

const makeMarket = (symbol: string): PerpsMarketData =>
  ({
    symbol,
    change24hPercent: '1.5',
    isHip3: false,
  }) as PerpsMarketData;

const defaultFeedReturn = {
  data: [{ market: makeMarket('BTC') }],
  isLoading: false,
  refetch: jest.fn().mockResolvedValue(undefined),
  defaultSortOptionId: 'priceChange' as const,
};

describe('HomepagePerpsMoversSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedSelectIsFirstTimePerpsUser.mockReturnValue(false);
    mockUsePerpsFeed.mockReturnValue(defaultFeedReturn);
  });

  it('returns null when feed is not loading and has no markets', () => {
    mockUsePerpsFeed.mockReturnValue({
      data: [],
      isLoading: false,
      refetch: jest.fn(),
      defaultSortOptionId: 'priceChange',
    });

    renderWithProvider(
      <HomepagePerpsMoversSection sectionIndex={1} totalSectionsLoaded={5} />,
    );

    expect(screen.toJSON()).toBeNull();
    expect(mockedUseHomeViewedEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        isEmpty: true,
        itemCount: 0,
        sectionRef: null,
      }),
    );
  });

  it('renders the pill list when feed has data', () => {
    renderWithProvider(
      <HomepagePerpsMoversSection sectionIndex={1} totalSectionsLoaded={5} />,
    );

    expect(screen.getByTestId('homepage-perps-pills-list')).toBeOnTheScreen();
    expect(
      screen.getByText(strings('trending.perps_movers')),
    ).toBeOnTheScreen();
  });

  it('passes usePerpsFeed options for homepage movers rail', () => {
    renderWithProvider(
      <HomepagePerpsMoversSection sectionIndex={1} totalSectionsLoaded={5} />,
    );

    expect(mockUsePerpsFeed).toHaveBeenCalledWith({
      variant: 'all',
      withTileExtras: false,
    });
  });

  it('navigates to the market list when the section header is pressed', () => {
    renderWithProvider(
      <HomepagePerpsMoversSection sectionIndex={1} totalSectionsLoaded={5} />,
    );

    fireEvent.press(
      screen.getByRole('button', { name: strings('trending.perps_movers') }),
    );

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.MARKET_LIST,
      params: {
        defaultMarketTypeFilter: 'all',
        defaultSortOptionId: 'priceChange',
        source: PERPS_EVENT_VALUE.SOURCE.HOME_SECTION,
      },
    });
  });

  it('routes first-time users through tutorial from the section header', () => {
    mockedSelectIsFirstTimePerpsUser.mockReturnValue(true);

    renderWithProvider(
      <HomepagePerpsMoversSection sectionIndex={1} totalSectionsLoaded={5} />,
    );

    fireEvent.press(
      screen.getByRole('button', { name: strings('trending.perps_movers') }),
    );

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.TUTORIAL, {
      source: PERPS_EVENT_VALUE.SOURCE.HOME_SECTION,
      redirectScreen: Routes.PERPS.MARKET_LIST,
      redirectParams: {
        defaultMarketTypeFilter: 'all',
        defaultSortOptionId: 'priceChange',
        source: PERPS_EVENT_VALUE.SOURCE.HOME_SECTION,
      },
    });
  });

  it('invokes ref.refresh so it awaits refetch from the feed', async () => {
    const refetch = jest.fn().mockResolvedValue(undefined);
    mockUsePerpsFeed.mockReturnValue({
      ...defaultFeedReturn,
      refetch,
    });
    const ref = createRef<SectionRefreshHandle>();

    renderWithProvider(
      <HomepagePerpsMoversSection
        ref={ref}
        sectionIndex={1}
        totalSectionsLoaded={5}
      />,
    );

    await ref.current?.refresh();

    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('sends PERPS_UI_INTERACTION with WALLET_HOME when a pill is pressed', () => {
    renderWithProvider(
      <HomepagePerpsMoversSection sectionIndex={1} totalSectionsLoaded={5} />,
    );

    fireEvent.press(screen.getByTestId('homepage-perps-movers-mock-pill'));

    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.PERPS_UI_INTERACTION,
      {
        [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
          PERPS_EVENT_VALUE.INTERACTION_TYPE.BUTTON_CLICKED,
        [PERPS_EVENT_PROPERTY.BUTTON_CLICKED]:
          PERPS_EVENT_VALUE.BUTTON_CLICKED.OPEN_POSITION,
        [PERPS_EVENT_PROPERTY.BUTTON_LOCATION]:
          PERPS_EVENT_VALUE.BUTTON_LOCATION.WALLET_HOME,
      },
    );
  });

  it('routes first-time users through tutorial from a pill press', () => {
    mockedSelectIsFirstTimePerpsUser.mockReturnValue(true);

    renderWithProvider(
      <HomepagePerpsMoversSection sectionIndex={1} totalSectionsLoaded={5} />,
    );

    fireEvent.press(screen.getByTestId('homepage-perps-movers-mock-pill'));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.TUTORIAL, {
      source: PERPS_EVENT_VALUE.SOURCE.HOME_SECTION,
      redirectScreen: Routes.PERPS.MARKET_DETAILS,
      redirectParams: {
        market: defaultFeedReturn.data[0].market,
        source: PERPS_EVENT_VALUE.SOURCE.HOME_SECTION,
      },
    });
  });

  it('registers useHomeViewedEvent with overridden section name when provided', () => {
    renderWithProvider(
      <HomepagePerpsMoversSection
        sectionIndex={2}
        totalSectionsLoaded={6}
        sectionName={HomeSectionNames.TRENDING_PERPS}
      />,
    );

    expect(mockedUseHomeViewedEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        sectionName: HomeSectionNames.TRENDING_PERPS,
        sectionIndex: 2,
        totalSectionsLoaded: 6,
        isEmpty: false,
        itemCount: 1,
      }),
    );
  });

  it('registers useHomeViewedEvent with perps section name by default', () => {
    renderWithProvider(
      <HomepagePerpsMoversSection sectionIndex={1} totalSectionsLoaded={5} />,
    );

    expect(mockedUseHomeViewedEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        sectionName: HomeSectionNames.PERPS,
      }),
    );
  });

  it('passes loading and empty flags into useHomeViewedEvent while markets load', () => {
    mockUsePerpsFeed.mockReturnValue({
      data: [],
      isLoading: true,
      refetch: jest.fn(),
      defaultSortOptionId: 'priceChange',
    });

    renderWithProvider(
      <HomepagePerpsMoversSection sectionIndex={1} totalSectionsLoaded={5} />,
    );

    expect(mockedUseHomeViewedEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        isLoading: true,
        isEmpty: false,
        itemCount: 0,
      }),
    );
  });

  it('wires useSectionPerformance with overridden section name when provided', () => {
    renderWithProvider(
      <HomepagePerpsMoversSection
        sectionIndex={2}
        totalSectionsLoaded={6}
        sectionName={HomeSectionNames.TRENDING_PERPS}
      />,
    );

    expect(mockedUseSectionPerformance).toHaveBeenCalledWith({
      sectionId: HomeSectionNames.TRENDING_PERPS,
      contentReady: true,
      isEmpty: false,
      isLoading: false,
    });
  });

  it('wires useSectionPerformance for the perps section by default', () => {
    mockUsePerpsFeed.mockReturnValue({
      data: [],
      isLoading: true,
      refetch: jest.fn(),
      defaultSortOptionId: 'priceChange',
    });

    renderWithProvider(
      <HomepagePerpsMoversSection sectionIndex={1} totalSectionsLoaded={5} />,
    );

    expect(mockedUseSectionPerformance).toHaveBeenCalledWith({
      sectionId: HomeSectionNames.PERPS,
      contentReady: false,
      isEmpty: false,
      isLoading: true,
    });
  });

  it('marks section performance ready when loading completes with data', () => {
    renderWithProvider(
      <HomepagePerpsMoversSection sectionIndex={1} totalSectionsLoaded={5} />,
    );

    expect(mockedUseSectionPerformance).toHaveBeenCalledWith({
      sectionId: HomeSectionNames.PERPS,
      contentReady: true,
      isEmpty: false,
      isLoading: false,
    });
  });
});
