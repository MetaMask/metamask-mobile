import { renderHook } from '@testing-library/react-native';
import { PerpsMode } from '@metamask/perps-controller';
import { useABTest } from '../../../../hooks/useABTest';
import {
  PERPS_HEADER_AB_TEST_EXPOSURE_OPTIONS,
  PERPS_HEADER_AB_TEST_KEY,
  PERPS_HEADER_NAV_VARIANTS,
  PerpsHeaderNavVariant,
} from '../abTestConfig';
import {
  selectPerpsProModeEnabledFlag,
  selectPerpsWatchlistEnabledFlag,
} from '../selectors/featureFlags';
import {
  selectPerpsLastViewedMarketSymbol,
  selectPerpsMode,
  selectPerpsWatchlistMarkets,
} from '../selectors/perpsController';
import Routes from '../../../../constants/navigation/Routes';
import { usePerpsHeaderEntryNavigation } from './usePerpsHeaderEntryNavigation';

jest.mock('../../../../hooks/useABTest', () => ({
  useABTest: jest.fn(),
}));

const mockUseABTest = jest.mocked(useABTest);
const mockUseSelector = jest.fn();

jest.mock('react-redux', () => ({
  useSelector: (selector: unknown) => mockUseSelector(selector),
}));

const mockSelectors = ({
  isProModeEnabled = false,
  isWatchlistEnabled = true,
  perpsMode = PerpsMode.Lite,
  lastViewed = 'BTC',
  watchlist = [] as string[],
}: {
  isProModeEnabled?: boolean;
  isWatchlistEnabled?: boolean;
  perpsMode?: PerpsMode;
  lastViewed?: string;
  watchlist?: string[];
} = {}) => {
  mockUseSelector.mockImplementation((selector: unknown) => {
    if (selector === selectPerpsProModeEnabledFlag) return isProModeEnabled;
    if (selector === selectPerpsWatchlistEnabledFlag) return isWatchlistEnabled;
    if (selector === selectPerpsMode) return perpsMode;
    if (selector === selectPerpsLastViewedMarketSymbol) return lastViewed;
    if (selector === selectPerpsWatchlistMarkets) return watchlist;
    return undefined;
  });
};

describe('usePerpsHeaderEntryNavigation', () => {
  beforeEach(() => {
    mockUseABTest.mockReturnValue({
      variant: PERPS_HEADER_NAV_VARIANTS[PerpsHeaderNavVariant.Control],
      variantName: PerpsHeaderNavVariant.Control,
      isActive: false,
    });
    mockSelectors();
  });

  it('resolves assignment through useABTest and skips exposure while Lite', () => {
    renderHook(() => usePerpsHeaderEntryNavigation());

    expect(mockUseABTest).toHaveBeenCalledWith(
      PERPS_HEADER_AB_TEST_KEY,
      PERPS_HEADER_NAV_VARIANTS,
      {
        ...PERPS_HEADER_AB_TEST_EXPOSURE_OPTIONS,
        trackExposure: false,
      },
    );
  });

  it('tracks exposure for users already in Pro mode', () => {
    mockSelectors({ isProModeEnabled: true, perpsMode: PerpsMode.Pro });

    renderHook(() => usePerpsHeaderEntryNavigation());

    expect(mockUseABTest).toHaveBeenCalledWith(
      PERPS_HEADER_AB_TEST_KEY,
      PERPS_HEADER_NAV_VARIANTS,
      expect.objectContaining({ trackExposure: true }),
    );
  });

  it('honors an explicit exposure override for the lite-pill switch', () => {
    renderHook(() => usePerpsHeaderEntryNavigation({ trackExposure: true }));

    expect(mockUseABTest).toHaveBeenCalledWith(
      PERPS_HEADER_AB_TEST_KEY,
      PERPS_HEADER_NAV_VARIANTS,
      expect.objectContaining({ trackExposure: true }),
    );
  });

  it('does not open the market list for a Lite user assigned to treatment', () => {
    mockUseABTest.mockReturnValue({
      variant: PERPS_HEADER_NAV_VARIANTS[PerpsHeaderNavVariant.Treatment],
      variantName: PerpsHeaderNavVariant.Treatment,
      isActive: true,
    });

    const { result } = renderHook(() => usePerpsHeaderEntryNavigation());

    expect(result.current.getTarget({ source: 'home_section' })).toEqual({
      screen: Routes.PERPS.PERPS_HOME,
      params: { source: 'home_section' },
    });
  });

  it('uses the Pro switch target even while the current mode is still Lite', () => {
    mockSelectors({ watchlist: [] });
    mockUseABTest.mockReturnValue({
      variant: PERPS_HEADER_NAV_VARIANTS[PerpsHeaderNavVariant.Treatment],
      variantName: PerpsHeaderNavVariant.Treatment,
      isActive: true,
    });

    const { result } = renderHook(() =>
      usePerpsHeaderEntryNavigation({ trackExposure: true }),
    );

    expect(result.current.getProSwitchTarget({ source: 'perps_home' })).toEqual(
      {
        screen: Routes.PERPS.MARKET_LIST,
        params: {
          source: 'perps_home',
          showWatchlistOnly: false,
          defaultMarketTypeFilter: 'all',
        },
      },
    );
  });
});
