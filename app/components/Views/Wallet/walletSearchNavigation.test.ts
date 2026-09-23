import Routes from '../../../constants/navigation/Routes';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { trackExploreSearchOpened } from '../TrendingView/search/analytics';
import { navigateToExploreSearch } from './walletSearchNavigation';

jest.mock('../TrendingView/search/analytics', () => ({
  trackExploreSearchOpened: jest.fn(),
}));

describe('navigateToExploreSearch', () => {
  const navigation = {
    navigate: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keeps control users on the legacy navigation path', () => {
    navigateToExploreSearch(navigation as unknown as AppNavigationProp, false);

    expect(trackExploreSearchOpened).toHaveBeenCalledWith('home');
    expect(navigation.navigate).toHaveBeenCalledWith(Routes.EXPLORE_SEARCH);
  });

  it('passes the home handoff params for treatment users', () => {
    navigateToExploreSearch(
      navigation as unknown as AppNavigationProp,
      true,
      '0xabc',
      {
        x: 10,
        y: 20,
        width: 200,
        height: 48,
      },
      true,
    );

    expect(trackExploreSearchOpened).not.toHaveBeenCalled();
    expect(navigation.navigate).toHaveBeenCalledWith(Routes.EXPLORE_SEARCH, {
      entryPoint: 'home',
      initialQuery: '0xabc',
      searchOrigin: {
        x: 10,
        y: 20,
        width: 200,
        height: 48,
      },
      pastePillVisible: true,
    });
  });
});
