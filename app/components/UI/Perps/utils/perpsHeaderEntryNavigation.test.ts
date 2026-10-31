import Routes from '../../../../constants/navigation/Routes';
import { resolvePerpsHeaderEntryTarget } from './perpsHeaderEntryNavigation';

describe('resolvePerpsHeaderEntryTarget', () => {
  it('keeps casual mode on Perps Home even when the assignment is treatment', () => {
    expect(
      resolvePerpsHeaderEntryTarget({
        isEligible: false,
        destination: 'marketList',
        watchlistCount: 2,
        extraParams: { source: 'home_section' },
      }),
    ).toEqual({
      screen: Routes.PERPS.PERPS_HOME,
      params: { source: 'home_section' },
    });
  });

  it('sends an eligible control user to the last-viewed market', () => {
    expect(
      resolvePerpsHeaderEntryTarget({
        isEligible: true,
        destination: 'lastViewedMarket',
        watchlistCount: 3,
        lastViewedMarketSymbol: 'ETH',
        extraParams: { source: 'home_section' },
      }),
    ).toEqual({
      screen: Routes.PERPS.MARKET_DETAILS,
      params: {
        market: { symbol: 'ETH' },
        source: 'home_section',
      },
    });
  });

  it('falls back to BTC when an eligible control user has no last-viewed market', () => {
    expect(
      resolvePerpsHeaderEntryTarget({
        isEligible: true,
        destination: 'lastViewedMarket',
        watchlistCount: 0,
        lastViewedMarketSymbol: '',
      }),
    ).toEqual({
      screen: Routes.PERPS.MARKET_DETAILS,
      params: {
        market: { symbol: 'BTC' },
      },
    });
  });

  it('opens the Watchlist tab for a treatment user with a non-empty watchlist', () => {
    expect(
      resolvePerpsHeaderEntryTarget({
        isEligible: true,
        destination: 'marketList',
        watchlistCount: 1,
        extraParams: { source: 'home_section' },
      }),
    ).toEqual({
      screen: Routes.PERPS.MARKET_LIST,
      params: {
        source: 'home_section',
        showWatchlistOnly: true,
      },
    });
  });

  it('opens All when the watchlist feature is off even if symbols are saved', () => {
    expect(
      resolvePerpsHeaderEntryTarget({
        isEligible: true,
        destination: 'marketList',
        watchlistCount: 2,
        isWatchlistEnabled: false,
        extraParams: { source: 'home_section' },
      }),
    ).toEqual({
      screen: Routes.PERPS.MARKET_LIST,
      params: {
        source: 'home_section',
        showWatchlistOnly: false,
        defaultMarketTypeFilter: 'all',
      },
    });
  });

  it('opens the All tab for a treatment user with an empty watchlist', () => {
    expect(
      resolvePerpsHeaderEntryTarget({
        isEligible: true,
        destination: 'marketList',
        watchlistCount: 0,
        extraParams: { button_location: 'perps_section_header' },
      }),
    ).toEqual({
      screen: Routes.PERPS.MARKET_LIST,
      params: {
        button_location: 'perps_section_header',
        showWatchlistOnly: false,
        defaultMarketTypeFilter: 'all',
      },
    });
  });
});
