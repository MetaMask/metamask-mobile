import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import RwasTab from './RwasTab';
import Routes from '../../../../constants/navigation/Routes';
import { selectPerpsEnabledFlag } from '../../../UI/Perps';
import { selectPredictEnabledFlag } from '../../../UI/Predict';
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
const mockUseStocksFeed = jest.fn();
const mockUsePerpsFeed = jest.fn();

jest.mock('../feeds/predictions/usePredictionsFeed', () => ({
  usePredictionsFeed: (...args: unknown[]) => mockUsePredictionsFeed(...args),
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

jest.mock('../components/PillToggleCardList', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../feeds/tokens/TokenRowItem', () => ({
  TokenRowItem: () => null,
}));

jest.mock('../feeds/predictions/PredictionRowItem', () => ({
  PredictionCarouselRowItem: () => null,
}));

jest.mock('../feeds/perps/PerpsRowItem', () => ({
  __esModule: true,
  default: () => null,
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

describe('RwasTab', () => {
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
    mockUseStocksFeed.mockReturnValue({ data: [], isLoading: false });
    mockUsePerpsFeed.mockReturnValue({ data: [], isLoading: false });
  });

  describe('politics predictions section', () => {
    it('omits politics when predict is disabled', () => {
      const { queryByTestId } = render(<RwasTab {...defaultTabProps} />);

      expect(
        queryByTestId('section-header-view-all-politics_predictions'),
      ).not.toBeOnTheScreen();
    });

    it('renders politics header when predict is enabled and feed is loading', () => {
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

      const { getByTestId } = render(<RwasTab {...defaultTabProps} />);

      expect(
        getByTestId('section-header-view-all-politics_predictions'),
      ).toBeOnTheScreen();
    });

    it('navigates to predict politics tab when header is pressed', () => {
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

      const { getByTestId } = render(<RwasTab {...defaultTabProps} />);

      fireEvent.press(
        getByTestId('section-header-view-all-politics_predictions'),
      );

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
        screen: Routes.PREDICT.MARKET_LIST,
        params: { tab: 'politics' },
      });
    });
  });

  describe('stocks section', () => {
    it('omits stocks when feed is empty and not loading', () => {
      const { queryByTestId } = render(<RwasTab {...defaultTabProps} />);

      expect(
        queryByTestId('section-header-view-all-stocks'),
      ).not.toBeOnTheScreen();
    });

    it('renders stocks header when loading', () => {
      mockUseStocksFeed.mockReturnValue({ data: [], isLoading: true });

      const { getByTestId } = render(<RwasTab {...defaultTabProps} />);

      expect(getByTestId('section-header-view-all-stocks')).toBeOnTheScreen();
    });

    it('navigates to RWA tokens full view when stocks header is pressed', () => {
      mockUseStocksFeed.mockReturnValue({ data: [], isLoading: true });

      const { getByTestId } = render(<RwasTab {...defaultTabProps} />);

      fireEvent.press(getByTestId('section-header-view-all-stocks'));

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.WALLET.RWA_TOKENS_FULL_VIEW,
      );
    });
  });

  describe('RWA perps section', () => {
    it('omits rwa perps when perps flag is off', () => {
      const { queryByTestId } = render(<RwasTab {...defaultTabProps} />);

      expect(
        queryByTestId('section-header-view-all-rwa_perps'),
      ).not.toBeOnTheScreen();
    });

    it('renders rwa perps header when perps is enabled and feed is loading', () => {
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

      const { getByTestId } = render(<RwasTab {...defaultTabProps} />);

      expect(
        getByTestId('section-header-view-all-rwa_perps'),
      ).toBeOnTheScreen();
    });

    it('navigates to perps market list when rwa perps header is pressed', () => {
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

      const { getByTestId } = render(<RwasTab {...defaultTabProps} />);

      fireEvent.press(getByTestId('section-header-view-all-rwa_perps'));

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.PERPS.ROOT,
        expect.objectContaining({
          screen: Routes.PERPS.MARKET_LIST,
        }),
      );
    });
  });

  describe('feed hooks', () => {
    it('passes refresh and variants into feeds', () => {
      const refresh = { trigger: 4, silentRefresh: false };

      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectPredictEnabledFlag) {
          return true;
        }
        if (selector === selectPerpsEnabledFlag) {
          return true;
        }
        return undefined;
      });
      mockUsePredictionsFeed.mockReturnValue({ data: [], isLoading: true });
      mockUseStocksFeed.mockReturnValue({ data: [], isLoading: true });
      mockUsePerpsFeed.mockReturnValue({ data: [], isLoading: true });

      render(<RwasTab {...defaultTabProps} refresh={refresh} />);

      expect(mockUsePredictionsFeed).toHaveBeenCalledWith({
        variant: 'politics',
        refresh,
      });
      expect(mockUseStocksFeed).toHaveBeenCalledWith({ refresh });
      expect(mockUsePerpsFeed).toHaveBeenCalledWith({
        variant: 'rwa',
        refresh,
      });
    });
  });
});
