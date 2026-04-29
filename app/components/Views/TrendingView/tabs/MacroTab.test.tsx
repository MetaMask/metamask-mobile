import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import MacroTab from './MacroTab';
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
const mockUsePerpsFeed = jest.fn();

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

jest.mock('../feeds/predictions/PredictionRowItem', () => ({
  PredictionCarouselRowItem: () => null,
}));

jest.mock('../components/HorizontalCarousel', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../components/PillToggleCardList', () => ({
  __esModule: true,
  default: () => null,
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

describe('MacroTab', () => {
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
    mockUsePerpsFeed.mockReturnValue({ data: [], isLoading: false });
  });

  describe('politics predictions section', () => {
    it('omits politics when predict is disabled', () => {
      const { queryByTestId } = render(<MacroTab {...defaultTabProps} />);

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

      const { getByTestId } = render(<MacroTab {...defaultTabProps} />);

      expect(
        getByTestId('section-header-view-all-politics_predictions'),
      ).toBeOnTheScreen();
    });

    it('navigates to predict market list with politics tab when header is pressed', () => {
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

      const { getByTestId } = render(<MacroTab {...defaultTabProps} />);

      fireEvent.press(
        getByTestId('section-header-view-all-politics_predictions'),
      );

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
        screen: Routes.PREDICT.MARKET_LIST,
        params: { tab: 'politics' },
      });
    });
  });

  describe('macro perps section', () => {
    it('omits macro perps when perps feature flag is off', () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectPredictEnabledFlag) {
          return false;
        }
        if (selector === selectPerpsEnabledFlag) {
          return false;
        }
        return undefined;
      });

      const { queryByTestId } = render(<MacroTab {...defaultTabProps} />);

      expect(
        queryByTestId('section-header-view-all-macro_stocks_commodity_perps'),
      ).not.toBeOnTheScreen();
    });

    it('renders macro perps header when perps is enabled and feed is loading', () => {
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

      const { getByTestId } = render(<MacroTab {...defaultTabProps} />);

      expect(
        getByTestId('section-header-view-all-macro_stocks_commodity_perps'),
      ).toBeOnTheScreen();
    });

    it('navigates to perps market list when macro perps header is pressed', () => {
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

      const { getByTestId } = render(<MacroTab {...defaultTabProps} />);

      fireEvent.press(
        getByTestId('section-header-view-all-macro_stocks_commodity_perps'),
      );

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.PERPS.ROOT,
        expect.objectContaining({
          screen: Routes.PERPS.MARKET_LIST,
        }),
      );
    });
  });

  describe('feed hooks', () => {
    it('passes refresh and variant into feeds', () => {
      const refresh = { trigger: 1, silentRefresh: false };

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
      mockUsePerpsFeed.mockReturnValue({ data: [], isLoading: true });

      render(<MacroTab {...defaultTabProps} refresh={refresh} />);

      expect(mockUsePredictionsFeed).toHaveBeenCalledWith({
        variant: 'politics',
        refresh,
      });
      expect(mockUsePerpsFeed).toHaveBeenCalledWith({
        variant: 'macro',
        refresh,
      });
    });
  });
});
