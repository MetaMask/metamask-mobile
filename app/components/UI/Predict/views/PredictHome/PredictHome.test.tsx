import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../../constants/navigation/Routes';
import { PredictMarketListSelectorsIDs } from '../../Predict.testIds';
import PredictHome from './PredictHome';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockCanGoBack = jest.fn(() => true);

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
  useRoute: () => ({ params: {} }),
  useFocusEffect: () => undefined,
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: () => ({}),
  }),
}));

jest.mock('../../../../../util/theme', () => ({
  useTheme: () => ({
    colors: { background: { default: '#ffffff' } },
  }),
}));

jest.mock('react-redux', () => ({
  useSelector: () => false,
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../hooks/usePredictSearch', () => ({
  usePredictSearch: () => ({
    isSearchVisible: false,
    searchQuery: '',
    setSearchQuery: jest.fn(),
    showSearch: jest.fn(),
    clearSearchAndClose: jest.fn(),
  }),
}));

jest.mock('../../hooks/usePredictSectionImpressions', () => ({
  usePredictSectionImpressions: () => ({
    registerSection: jest.fn(),
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
  './components/PredictTrendingSection/usePredictTrendingSection',
  () => ({
    usePredictTrendingSection: () => ({
      error: null,
      markets: [{ id: 'market' }],
      refetch: jest.fn(),
    }),
  }),
);

jest.mock(
  '../../../../../component-library/components-temp/HeaderGlass',
  () => ({
    useHeaderGlassInset: () => ({ inset: 0, onLayout: jest.fn() }),
  }),
);

jest.mock('../../../../hooks/useIsGlassSurfaceEnabled', () => ({
  useIsGlassSurfaceEnabled: () => false,
}));

jest.mock('../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      PredictController: {
        trackHomeSectionInteraction: jest.fn(),
        trackHomeViewed: jest.fn(),
        trackSearchInteracted: jest.fn(),
      },
    },
  },
}));

jest.mock('../../components/PredictHeaderStacked', () => {
  const ReactActual = jest.requireActual<typeof import('react')>('react');
  const { Pressable } = jest.requireActual<typeof import('react-native')>(
    'react-native',
  );
  const { PredictMarketListSelectorsIDs: testIds } = jest.requireActual<
    typeof import('../../Predict.testIds')
  >('../../Predict.testIds');

  return {
    __esModule: true,
    default: ({ onBack }: { onBack: () => void }) =>
      ReactActual.createElement(Pressable, {
        testID: testIds.BACK_BUTTON,
        onPress: onBack,
      }),
  };
});

jest.mock('../../components/PredictSearchOverlay', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../../components/PredictWithdrawUnavailableSheet', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('./components/PredictPortfolio', () => ({
  PredictPortfolioModule: () => null,
}));

jest.mock('./components/PredictLiveNowSection', () => ({
  __esModule: true,
  default: () => null,
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

jest.mock('../../components/PredictOffline', () => ({
  __esModule: true,
  default: () => null,
}));

describe('PredictHome', () => {
  const useNavigationMock = jest.mocked(useNavigation);

  beforeEach(() => {
    jest.clearAllMocks();
    mockCanGoBack.mockReturnValue(true);
    useNavigationMock.mockReturnValue({
      canGoBack: mockCanGoBack,
      goBack: mockGoBack,
      navigate: mockNavigate,
    } as unknown as ReturnType<typeof useNavigation>);
  });

  it('navigates to the wallet tab when back is pressed from the root', () => {
    mockCanGoBack.mockReturnValue(false);

    const { getByTestId } = render(<PredictHome />);

    fireEvent.press(getByTestId(PredictMarketListSelectorsIDs.BACK_BUTTON));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME);
  });
});
