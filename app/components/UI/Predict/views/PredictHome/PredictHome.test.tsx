import React from 'react';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { TraceName } from '../../../../../util/trace';
import PredictHome from './PredictHome';

const mockUsePredictMeasurement = jest.fn();

let mockSearchVisible = false;
let mockHomeError: Error | null = null;
let mockHomeMarkets: { id: string }[] = [{ id: 'trending-1' }];
let mockLiveNowSettled = false;

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: () => false,
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    canGoBack: () => true,
    goBack: jest.fn(),
    navigate: jest.fn(),
    setParams: jest.fn(),
  }),
  useRoute: () => ({ params: {} }),
  useFocusEffect: (callback: () => void | (() => void)) => {
    const ReactActual = jest.requireActual('react');
    ReactActual.useEffect(() => callback(), [callback]);
  },
}));

jest.mock('../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      PredictController: {
        trackHomeViewed: jest.fn(),
        trackHomeSectionInteraction: jest.fn(),
        trackSearchInteracted: jest.fn(),
      },
    },
  },
}));

jest.mock('../../hooks/usePredictSearch', () => ({
  usePredictSearch: () => ({
    isSearchVisible: mockSearchVisible,
    searchQuery: '',
    setSearchQuery: jest.fn(),
    showSearch: jest.fn(),
    hideSearch: jest.fn(),
    clearSearchAndClose: jest.fn(),
  }),
}));

jest.mock('../../hooks/usePredictMeasurement', () => ({
  usePredictMeasurement: (options: unknown) =>
    mockUsePredictMeasurement(options),
}));

jest.mock(
  './components/PredictTrendingSection/usePredictTrendingSection',
  () => ({
    usePredictTrendingSection: () => ({
      error: mockHomeError,
      markets: mockHomeMarkets,
      refetch: jest.fn(),
      isLoading: false,
      showEmptyState: false,
    }),
  }),
);

jest.mock('../../hooks/usePredictSectionImpressions', () => ({
  usePredictSectionImpressions: () => ({
    registerSection: () => jest.fn(),
    setViewportHeight: jest.fn(),
    reset: jest.fn(),
  }),
}));

jest.mock('../../hooks/usePredictStackedHeader', () => ({
  usePredictStackedHeader: () => ({
    scrollY: { value: 0 },
    titleSectionHeight: 0,
    onScroll: jest.fn(),
    setTitleSectionHeight: jest.fn(),
  }),
}));

jest.mock(
  '../../../../../component-library/components-temp/HeaderGlass',
  () => ({
    useHeaderGlassInset: () => ({ inset: 0, onLayout: jest.fn() }),
  }),
);

jest.mock('../../../../hooks/useIsGlassSurfaceEnabled', () => ({
  useIsGlassSurfaceEnabled: () => false,
}));

jest.mock('./components/PredictLiveNowSection', () => {
  const ReactActual = jest.requireActual('react');
  return {
    __esModule: true,
    default: ({
      onSettledChange,
    }: {
      onSettledChange?: (settled: boolean) => void;
    }) => {
      ReactActual.useEffect(() => {
        onSettledChange?.(mockLiveNowSettled);
      }, [onSettledChange]);
      return null;
    },
  };
});

jest.mock('./components/PredictPortfolio', () => ({
  PredictPortfolioModule: () => null,
}));

jest.mock('./components/PredictCategoriesSection', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('./components/PredictPopularTodaySection', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('./components/PredictTrendingSection', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../../components/PredictFeedBanner', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../../components/PredictSearchOverlay', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../../components/PredictWithdrawUnavailableSheet', () => {
  const ReactActual = jest.requireActual('react');
  return {
    __esModule: true,
    default: ReactActual.forwardRef(() => null),
  };
});

jest.mock('../../components/PredictOffline', () => ({
  __esModule: true,
  default: () => null,
}));

const renderHome = () =>
  renderWithProvider(<PredictHome />, {
    state: { engine: { backgroundState } },
  });

describe('PredictHome TTI measurement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchVisible = false;
    mockHomeError = null;
    mockHomeMarkets = [{ id: 'trending-1' }];
    mockLiveNowSettled = false;
  });

  it('keeps the home trace open until the live rail settles', () => {
    renderHome();

    expect(mockUsePredictMeasurement).toHaveBeenCalledWith(
      expect.objectContaining({
        traceName: TraceName.PredictHomeView,
        conditions: [true, false],
      }),
    );
  });

  it('ends the home trace once the live rail has settled', () => {
    mockLiveNowSettled = true;

    renderHome();

    expect(mockUsePredictMeasurement).toHaveBeenLastCalledWith(
      expect.objectContaining({
        traceName: TraceName.PredictHomeView,
        conditions: [true, true],
      }),
    );
  });

  it('ends the home trace on the full-screen error without waiting for the rail', () => {
    mockHomeError = new Error('feed failed');
    mockHomeMarkets = [];

    renderHome();

    expect(mockUsePredictMeasurement).toHaveBeenCalledWith(
      expect.objectContaining({
        traceName: TraceName.PredictHomeView,
        conditions: [true, true],
      }),
    );
  });

  it('resets the home trace while search is open', () => {
    mockSearchVisible = true;
    mockLiveNowSettled = true;

    renderHome();

    expect(mockUsePredictMeasurement).toHaveBeenLastCalledWith(
      expect.objectContaining({
        traceName: TraceName.PredictHomeView,
        conditions: [false, true],
      }),
    );
  });
});
