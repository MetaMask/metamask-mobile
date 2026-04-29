import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import NowTab from './NowTab';
import Routes from '../../../../constants/navigation/Routes';
import { selectPerpsEnabledFlag } from '../../../UI/Perps';
import { selectPredictEnabledFlag } from '../../../UI/Predict';
import { TrendingViewSelectorsIDs } from '../TrendingView.testIds';
import type { TabProps } from '../hooks/useExploreRefresh';
import { useSelector } from 'react-redux';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

const mockUsePredictionsFeed = jest.fn();
const mockUseTokensFeed = jest.fn();
const mockUseStocksFeed = jest.fn();
const mockUsePerpsFeed = jest.fn();

jest.mock('../feeds/predictions/usePredictionsFeed', () => ({
  usePredictionsFeed: (...args: unknown[]) => mockUsePredictionsFeed(...args),
}));

jest.mock('../feeds/tokens/useTokensFeed', () => ({
  useTokensFeed: (...args: unknown[]) => mockUseTokensFeed(...args),
}));

jest.mock('../feeds/stocks/useStocksFeed', () => ({
  useStocksFeed: (...args: unknown[]) => mockUseStocksFeed(...args),
}));

jest.mock('../feeds/perps/usePerpsFeed', () => ({
  usePerpsFeed: (...args: unknown[]) => mockUsePerpsFeed(...args),
}));

jest.mock('../feeds/perps/PerpsSectionProvider', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('../components/CardList', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../components/HorizontalCarousel', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../components/PillScrollList', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../components/TileCarousel', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../feeds/perps/PerpsTileRowItem', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../feeds/tokens/TokenRowItem', () => ({
  TokenRowItem: () => null,
}));

jest.mock('../feeds/tokens/CryptoMoversPillItem', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../feeds/predictions/PredictionRowItem', () => ({
  PredictionCarouselRowItem: () => null,
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => {
    const tw = () => ({});
    tw.style = jest.fn(() => ({}));
    return tw;
  },
}));

jest.mock('../../../../util/theme', () => {
  const actual = jest.requireActual<typeof import('../../../../util/theme')>(
    '../../../../util/theme',
  );
  return {
    ...actual,
    useTheme: () => actual.mockTheme,
    useAppThemeFromContext: () => actual.mockTheme,
  };
});

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

const defaultTabProps: TabProps = {
  refresh: { trigger: 0, silentRefresh: true },
  refreshing: false,
  onRefresh: jest.fn(),
};

describe('NowTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectPredictEnabledFlag) {
        return false;
      }
      if (selector === selectPerpsEnabledFlag) {
        return false;
      }
      return undefined;
    });

    mockUsePredictionsFeed.mockReturnValue({ data: [], isLoading: false });
    mockUseTokensFeed.mockReturnValue({ data: [], isLoading: false });
    mockUseStocksFeed.mockReturnValue({ data: [], isLoading: false });
    mockUsePerpsFeed.mockReturnValue({ data: [], isLoading: false });
  });

  it('sets explore scroll test id on the scroll container', () => {
    const { getByTestId } = render(<NowTab {...defaultTabProps} />);

    expect(
      getByTestId(TrendingViewSelectorsIDs.TRENDING_FEED_SCROLL_VIEW),
    ).toBeOnTheScreen();
  });

  describe('predictions section', () => {
    it('omits predictions when predict is disabled', () => {
      const { queryByTestId } = render(<NowTab {...defaultTabProps} />);

      expect(
        queryByTestId('section-header-view-all-predictions'),
      ).not.toBeOnTheScreen();
    });

    it('renders predictions header when predict is enabled and feed is loading', () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectPredictEnabledFlag) {
          return true;
        }
        if (selector === selectPerpsEnabledFlag) {
          return false;
        }
        return undefined;
      });
      mockUsePredictionsFeed.mockReturnValue({ data: [], isLoading: true });

      const { getByTestId } = render(<NowTab {...defaultTabProps} />);

      expect(
        getByTestId('section-header-view-all-predictions'),
      ).toBeOnTheScreen();
    });

    it('navigates to predict trending list when predictions header is pressed', () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectPredictEnabledFlag) {
          return true;
        }
        if (selector === selectPerpsEnabledFlag) {
          return false;
        }
        return undefined;
      });
      mockUsePredictionsFeed.mockReturnValue({ data: [], isLoading: true });

      const { getByTestId } = render(<NowTab {...defaultTabProps} />);

      fireEvent.press(getByTestId('section-header-view-all-predictions'));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
        screen: Routes.PREDICT.MARKET_LIST,
        params: undefined,
      });
    });
  });

  describe('crypto movers section', () => {
    it('omits crypto movers when feed is empty and not loading', () => {
      const { queryByTestId } = render(<NowTab {...defaultTabProps} />);

      expect(
        queryByTestId('section-header-view-all-crypto_movers'),
      ).not.toBeOnTheScreen();
    });

    it('renders crypto movers header when loading', () => {
      mockUseTokensFeed.mockReturnValue({ data: [], isLoading: true });

      const { getByTestId } = render(<NowTab {...defaultTabProps} />);

      expect(
        getByTestId('section-header-view-all-crypto_movers'),
      ).toBeOnTheScreen();
    });

    it('navigates to trending tokens full view when crypto movers header is pressed', () => {
      mockUseTokensFeed.mockReturnValue({ data: [], isLoading: true });

      const { getByTestId } = render(<NowTab {...defaultTabProps} />);

      fireEvent.press(getByTestId('section-header-view-all-crypto_movers'));

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.WALLET.TRENDING_TOKENS_FULL_VIEW,
      );
    });
  });

  describe('perps section', () => {
    it('omits perps when flag is off', () => {
      const { queryByTestId } = render(<NowTab {...defaultTabProps} />);

      expect(
        queryByTestId('section-header-view-all-perps'),
      ).not.toBeOnTheScreen();
    });

    it('renders perps header when perps is enabled and feed is loading', () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectPredictEnabledFlag) {
          return false;
        }
        if (selector === selectPerpsEnabledFlag) {
          return true;
        }
        return undefined;
      });
      mockUsePerpsFeed.mockReturnValue({ data: [], isLoading: true });

      const { getByTestId } = render(<NowTab {...defaultTabProps} />);

      expect(getByTestId('section-header-view-all-perps')).toBeOnTheScreen();
    });
  });

  describe('stocks section', () => {
    it('omits stocks when feed is empty and not loading', () => {
      const { queryByTestId } = render(<NowTab {...defaultTabProps} />);

      expect(
        queryByTestId('section-header-view-all-stocks'),
      ).not.toBeOnTheScreen();
    });

    it('navigates to RWA tokens full view when stocks header is pressed', () => {
      mockUseStocksFeed.mockReturnValue({ data: [], isLoading: true });

      const { getByTestId } = render(<NowTab {...defaultTabProps} />);

      fireEvent.press(getByTestId('section-header-view-all-stocks'));

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.WALLET.RWA_TOKENS_FULL_VIEW,
      );
    });
  });

  describe('feed hooks', () => {
    it('passes refresh into feeds', () => {
      const refresh = { trigger: 5, silentRefresh: false };

      mockUsePredictionsFeed.mockReturnValue({ data: [], isLoading: true });
      mockUseTokensFeed.mockReturnValue({ data: [], isLoading: true });
      mockUseStocksFeed.mockReturnValue({ data: [], isLoading: true });
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectPredictEnabledFlag) {
          return true;
        }
        if (selector === selectPerpsEnabledFlag) {
          return true;
        }
        return undefined;
      });
      mockUsePerpsFeed.mockReturnValue({ data: [], isLoading: true });

      render(<NowTab {...defaultTabProps} refresh={refresh} />);

      expect(mockUsePredictionsFeed).toHaveBeenCalledWith({ refresh });
      expect(mockUseTokensFeed).toHaveBeenCalledWith({ refresh });
      expect(mockUseStocksFeed).toHaveBeenCalledWith({ refresh });
      expect(mockUsePerpsFeed).toHaveBeenCalledWith({
        variant: 'all',
        refresh,
        withTileExtras: true,
      });
    });
  });
});
