import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import CryptoTab from './CryptoTab';
import Routes from '../../../../constants/navigation/Routes';
import { selectPerpsEnabledFlag } from '../../../UI/Perps';
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

const mockUseTokensFeed = jest.fn();
const mockUsePredictionsFeed = jest.fn();
const mockUsePerpsFeed = jest.fn();

jest.mock('../feeds/tokens/useTokensFeed', () => ({
  useTokensFeed: (...args: unknown[]) => mockUseTokensFeed(...args),
}));

jest.mock('../feeds/predictions/usePredictionsFeed', () => ({
  usePredictionsFeed: (...args: unknown[]) => mockUsePredictionsFeed(...args),
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

describe('CryptoTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectPerpsEnabledFlag) {
        return false;
      }
      return undefined;
    });

    mockUseTokensFeed.mockReturnValue({ data: [], isLoading: false });
    mockUsePredictionsFeed.mockReturnValue({ data: [], isLoading: false });
    mockUsePerpsFeed.mockReturnValue({ data: [], isLoading: false });
  });

  describe('trending tokens section', () => {
    it('omits tokens when feed is empty and not loading', () => {
      const { queryByTestId } = render(<CryptoTab {...defaultTabProps} />);

      expect(
        queryByTestId('section-header-view-all-tokens'),
      ).not.toBeOnTheScreen();
    });

    it('renders tokens header when loading', () => {
      mockUseTokensFeed.mockReturnValue({ data: [], isLoading: true });

      const { getByTestId } = render(<CryptoTab {...defaultTabProps} />);

      expect(getByTestId('section-header-view-all-tokens')).toBeOnTheScreen();
    });

    it('navigates to trending tokens full view when header is pressed', () => {
      mockUseTokensFeed.mockReturnValue({ data: [], isLoading: true });

      const { getByTestId } = render(<CryptoTab {...defaultTabProps} />);

      fireEvent.press(getByTestId('section-header-view-all-tokens'));

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.WALLET.TRENDING_TOKENS_FULL_VIEW,
      );
    });
  });

  describe('crypto perps section', () => {
    it('omits crypto perps when perps flag is off', () => {
      const { queryByTestId } = render(<CryptoTab {...defaultTabProps} />);

      expect(
        queryByTestId('section-header-view-all-crypto_perps'),
      ).not.toBeOnTheScreen();
    });

    it('renders crypto perps header when perps is enabled and feed is loading', () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectPerpsEnabledFlag) {
          return true;
        }
        return undefined;
      });
      mockUsePerpsFeed.mockReturnValue({ data: [], isLoading: true });

      const { getByTestId } = render(<CryptoTab {...defaultTabProps} />);

      expect(
        getByTestId('section-header-view-all-crypto_perps'),
      ).toBeOnTheScreen();
    });

    it('navigates to perps market list with crypto filter when header is pressed', () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectPerpsEnabledFlag) {
          return true;
        }
        return undefined;
      });
      mockUsePerpsFeed.mockReturnValue({ data: [], isLoading: true });

      const { getByTestId } = render(<CryptoTab {...defaultTabProps} />);

      fireEvent.press(getByTestId('section-header-view-all-crypto_perps'));

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.PERPS.ROOT,
        expect.objectContaining({
          screen: Routes.PERPS.MARKET_LIST,
          params: expect.objectContaining({
            defaultMarketTypeFilter: 'crypto',
          }),
        }),
      );
    });
  });

  describe('crypto predictions section', () => {
    it('omits predictions when feed is empty and not loading', () => {
      const { queryByTestId } = render(<CryptoTab {...defaultTabProps} />);

      expect(
        queryByTestId('section-header-view-all-crypto_predictions'),
      ).not.toBeOnTheScreen();
    });

    it('renders predictions header when loading', () => {
      mockUsePredictionsFeed.mockReturnValue({ data: [], isLoading: true });

      const { getByTestId } = render(<CryptoTab {...defaultTabProps} />);

      expect(
        getByTestId('section-header-view-all-crypto_predictions'),
      ).toBeOnTheScreen();
    });

    it('navigates to predict market list with crypto tab when header is pressed', () => {
      mockUsePredictionsFeed.mockReturnValue({ data: [], isLoading: true });

      const { getByTestId } = render(<CryptoTab {...defaultTabProps} />);

      fireEvent.press(
        getByTestId('section-header-view-all-crypto_predictions'),
      );

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
        screen: Routes.PREDICT.MARKET_LIST,
        params: { tab: 'crypto' },
      });
    });
  });

  describe('feed hooks', () => {
    it('passes refresh into token, predictions, and perps feeds', () => {
      const refresh = { trigger: 2, silentRefresh: false };

      mockUseTokensFeed.mockReturnValue({ data: [], isLoading: true });
      mockUsePredictionsFeed.mockReturnValue({ data: [], isLoading: true });
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectPerpsEnabledFlag) {
          return true;
        }
        return undefined;
      });
      mockUsePerpsFeed.mockReturnValue({ data: [], isLoading: true });

      render(<CryptoTab {...defaultTabProps} refresh={refresh} />);

      expect(mockUseTokensFeed).toHaveBeenCalledWith({ refresh });
      expect(mockUsePredictionsFeed).toHaveBeenCalledWith({
        variant: 'crypto',
        refresh,
      });
      expect(mockUsePerpsFeed).toHaveBeenCalledWith({
        variant: 'crypto',
        refresh,
        withTileExtras: true,
      });
    });
  });
});
