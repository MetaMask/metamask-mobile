import { renderHook } from '@testing-library/react-hooks';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { PerpsMode } from '@metamask/perps-controller';
import Routes from '../../../../../constants/navigation/Routes';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { selectPerpsProModeEnabledFlag } from '../../../../UI/Perps/selectors/featureFlags';
import { selectPerpsMode } from '../../../../UI/Perps/selectors/perpsController';
import {
  HOMESCREEN_PILL_SOURCE,
  useHomepageDiscoveryPillsNavigation,
} from './useHomepageDiscoveryPillsNavigation';

// The PredictNext entry point's PredictRoot loads the whole Predict stack,
// which this suite's navigation mocks cannot satisfy.
jest.mock('../../../../UI/PredictNext/navigation/root/PredictRoot', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('../../../../../util/analytics/analytics', () => ({
  analytics: { trackEvent: jest.fn() },
}));

describe('useHomepageDiscoveryPillsNavigation', () => {
  const mockNavigate = jest.fn();
  const mockUseNavigation = useNavigation as jest.MockedFunction<
    typeof useNavigation
  >;
  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNavigation.mockReturnValue({
      navigate: mockNavigate,
    } as unknown as ReturnType<typeof useNavigation>);
    mockUseSelector.mockImplementation((selector: unknown) => {
      if (selector === selectPerpsProModeEnabledFlag) return false;
      if (selector === selectPerpsMode) return PerpsMode.Lite;
      // Other selectors, such as Predict's Active Venue, read the default state.
      return (selector as (state: unknown) => unknown)({
        engine: { backgroundState },
      });
    });
  });

  it('navigates to Perps home for the perpetuals pill when Pro mode is inactive', () => {
    const { result } = renderHook(() => useHomepageDiscoveryPillsNavigation());

    result.current.navigateToPill('perpetuals');

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.PERPS_HOME,
      params: { source: HOMESCREEN_PILL_SOURCE },
    });
  });

  it('navigates to the default Pro market instead of Perps home when Pro mode is active', () => {
    mockUseSelector.mockImplementation((selector: unknown) => {
      if (selector === selectPerpsProModeEnabledFlag) return true;
      if (selector === selectPerpsMode) return PerpsMode.Pro;
      // Other selectors, such as Predict's Active Venue, read the default state.
      return (selector as (state: unknown) => unknown)({
        engine: { backgroundState },
      });
    });

    const { result } = renderHook(() => useHomepageDiscoveryPillsNavigation());

    result.current.navigateToPill('perpetuals');

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.MARKET_DETAILS,
      params: expect.objectContaining({
        market: expect.objectContaining({ symbol: 'BTC' }),
        source: HOMESCREEN_PILL_SOURCE,
      }),
    });
  });

  it('navigates to the Predict market list for the predictions pill', () => {
    const { result } = renderHook(() => useHomepageDiscoveryPillsNavigation());

    result.current.navigateToPill('predictions');

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MARKET_LIST,
      params: { entryPoint: HOMESCREEN_PILL_SOURCE },
    });
  });
});
