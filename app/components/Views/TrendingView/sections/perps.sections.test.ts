/**
 * Tests for the perps section's `useSectionData` sorting behavior.
 * Lives next to perps.sections.tsx so the mocks below match the real import surface.
 */

jest.mock('../../../../constants/navigation/Routes', () => ({
  __esModule: true,
  default: {
    PERPS: {
      ROOT: 'PerpsRoot',
      MARKET_LIST: 'PerpsMarketList',
      MARKET_DETAILS: 'PerpsMarketDetails',
    },
  },
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('react-redux', () => ({ useSelector: jest.fn() }));

jest.mock('../../../UI/Perps/hooks', () => ({ usePerpsMarkets: jest.fn() }));

jest.mock('@metamask/perps-controller', () => ({
  filterMarketsByQuery: jest.fn((markets: unknown[]) => markets),
  PERPS_EVENT_VALUE: { SOURCE: { EXPLORE: 'explore' } },
}));

jest.mock('../../../UI/Perps/providers/PerpsConnectionProvider', () => ({
  PerpsConnectionContext: { _currentValue: null },
  PerpsConnectionProvider: ({ children }: { children: React.ReactNode }) =>
    children,
}));
jest.mock('../../../UI/Perps/providers/PerpsStreamManager', () => ({
  PerpsStreamProvider: ({ children }: { children: React.ReactNode }) =>
    children,
}));
jest.mock('../../../UI/Perps/components/PerpsMarketRowItem', () => () => null);
jest.mock('../../../UI/Perps/components/PerpsRowSkeleton', () => () => null);
jest.mock(
  '../../Homepage/Sections/Perpetuals/components/PerpsMarketTileCard',
  () => () => null,
);
jest.mock(
  '../../Homepage/Sections/Perpetuals/components/PerpsMarketTileCardSkeleton',
  () => () => null,
);
jest.mock(
  '../../Homepage/Sections/Perpetuals/hooks/useHomepageSparklines',
  () => ({ useHomepageSparklines: jest.fn(() => ({ sparklines: {} })) }),
);
jest.mock('../../../UI/Perps/selectors/perpsController', () => ({
  selectPerpsWatchlistMarkets: jest.fn(),
}));
jest.mock(
  '../../../UI/Trending/components/TrendingTokenSkeleton/TrendingTokensSkeleton',
  () => () => null,
);
jest.mock(
  '../components/Sections/SectionTypes/TilesSection/TileSection',
  () => () => null,
);
jest.mock(
  '../components/Sections/SectionTypes/PillToggledCardSection',
  () => () => null,
);
jest.mock('fuse.js', () =>
  jest.fn().mockImplementation(() => ({
    search: jest.fn().mockReturnValue([]),
  })),
);

import { renderHook } from '@testing-library/react-native';
import { perpsSections } from './perps.sections';
import { usePerpsMarkets } from '../../../UI/Perps/hooks';

const mockUsePerpsMarkets = usePerpsMarkets as jest.MockedFunction<
  typeof usePerpsMarkets
>;

const setMarkets = (markets: unknown[]) => {
  mockUsePerpsMarkets.mockReturnValue({
    markets,
    isLoading: false,
    refresh: jest.fn(),
    isRefreshing: false,
  } as never);
};

describe('perpsSections.perps.useSectionData sorting', () => {
  beforeEach(() => jest.clearAllMocks());

  it('sorts markets by change24hPercent descending when no search query', () => {
    setMarkets([
      { symbol: 'ETH', change24hPercent: '2.5' },
      { symbol: 'BTC', change24hPercent: '10.0' },
      { symbol: 'SOL', change24hPercent: '-3.0' },
      { symbol: 'DOGE', change24hPercent: '5.0' },
    ]);

    const { result } = renderHook(() => perpsSections.perps.useSectionData());
    const symbols = result.current.data.map(
      (m) => (m as { symbol: string }).symbol,
    );
    expect(symbols).toEqual(['BTC', 'DOGE', 'ETH', 'SOL']);
  });

  it('places markets with invalid change24hPercent at the end', () => {
    setMarkets([
      { symbol: 'ETH', change24hPercent: '5.0' },
      { symbol: 'BAD', change24hPercent: 'invalid' },
      { symbol: 'BTC', change24hPercent: '10.0' },
    ]);

    const { result } = renderHook(() => perpsSections.perps.useSectionData());
    const symbols = result.current.data.map(
      (m) => (m as { symbol: string }).symbol,
    );
    expect(symbols).toEqual(['BTC', 'ETH', 'BAD']);
  });

  it('does not sort when a search query is provided (delegates to fuse)', () => {
    setMarkets([
      { symbol: 'ETH', change24hPercent: '2.5' },
      { symbol: 'BTC', change24hPercent: '10.0' },
    ]);

    const { result } = renderHook(() =>
      perpsSections.perps.useSectionData('btc'),
    );
    // fuse.search is mocked to return []; this verifies the search branch is taken.
    expect(result.current.data).toEqual([]);
  });
});
