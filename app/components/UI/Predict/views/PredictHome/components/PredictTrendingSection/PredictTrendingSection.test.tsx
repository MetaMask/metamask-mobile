import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { backgroundState } from '../../../../../../../util/test/initial-root-state';
import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import { strings } from '../../../../../../../../locales/i18n';
import Routes from '../../../../../../../constants/navigation/Routes';
import type { PredictMarket } from '../../../../types';
import { PredictEventValues } from '../../../../constants/eventNames';
import PredictTrendingSection from './PredictTrendingSection';
import { PREDICT_TRENDING_SECTION_TEST_IDS } from './PredictTrendingSection.testIds';
import { usePredictTrendingSection } from './usePredictTrendingSection';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

const mockTrackHomeSectionInteraction = jest.fn();

jest.mock('../../../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      PredictController: {
        trackHomeSectionInteraction: (...args: unknown[]) =>
          mockTrackHomeSectionInteraction(...args),
      },
    },
  },
}));

// Mock only the data boundary: the section's own data hook. The hook's own
// logic (params, display cap, loading/unavailable) is covered by
// usePredictTrendingSection.test.ts. Here we exercise the real PredictMarket /
// PredictMarketSkeleton presentation against controlled hook output.
jest.mock('./usePredictTrendingSection');

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: jest.fn(() => ({})) }),
}));

// Mock the heavy leaf cards (charts/images/timers) — the same boundary the
// canonical PredictMarket.test.tsx uses — forwarding the section's testID so
// real PredictMarket dispatch is exercised.
jest.mock('../../../../components/PredictMarketSingle', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ testID }: { testID?: string }) => <View testID={testID} />,
  };
});
jest.mock('../../../../components/PredictMarketMultiple', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ testID }: { testID?: string }) => <View testID={testID} />,
  };
});
jest.mock('../../../../components/PredictMarketSportCard', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ testID }: { testID?: string }) => <View testID={testID} />,
  };
});
jest.mock('../../../../components/PredictCryptoUpDownMarketCard', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ testID }: { testID?: string }) => <View testID={testID} />,
  };
});

const mockUsePredictTrendingSection = usePredictTrendingSection as jest.Mock;

const createMarket = (id: string): PredictMarket =>
  ({
    id,
    outcomes: [{ id: `${id}-o1` }],
  }) as unknown as PredictMarket;

const setSection = (
  overrides: Partial<{
    markets: PredictMarket[];
    isLoading: boolean;
    showEmptyState: boolean;
  }> = {},
) => {
  mockUsePredictTrendingSection.mockReturnValue({
    markets: [],
    isLoading: false,
    showEmptyState: false,
    ...overrides,
  });
};

const renderSection = () =>
  renderWithProvider(<PredictTrendingSection />, {
    state: { engine: { backgroundState } },
  });

describe('PredictTrendingSection', () => {
  beforeEach(() => {
    setSection();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders a market card for each trending item', () => {
    setSection({ markets: [createMarket('T1'), createMarket('T2')] });

    const { getByTestId } = renderSection();

    expect(
      getByTestId(`${PREDICT_TRENDING_SECTION_TEST_IDS.CARD_PREFIX}-T1`),
    ).toBeOnTheScreen();
    expect(
      getByTestId(`${PREDICT_TRENDING_SECTION_TEST_IDS.CARD_PREFIX}-T2`),
    ).toBeOnTheScreen();
  });

  it('renders skeleton cards while loading', () => {
    setSection({ markets: [], isLoading: true });

    const { getByTestId } = renderSection();

    expect(
      getByTestId(`${PREDICT_TRENDING_SECTION_TEST_IDS.SKELETON_PREFIX}-0`),
    ).toBeOnTheScreen();
  });

  it('shows the unable-to-load message when unavailable (never disappears)', () => {
    setSection({ markets: [], showEmptyState: true });

    const { getByTestId, getByText } = renderSection();

    expect(
      getByTestId(PREDICT_TRENDING_SECTION_TEST_IDS.SECTION),
    ).toBeOnTheScreen();
    expect(
      getByTestId(PREDICT_TRENDING_SECTION_TEST_IDS.ERROR_STATE),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('predict.home.trending_unable_to_load')),
    ).toBeOnTheScreen();
  });

  it('renders a pressable "Trending" header that navigates to the trending feed', () => {
    setSection({ markets: [createMarket('T1')] });

    const { getByTestId, getByText } = renderSection();

    const header = getByTestId(PREDICT_TRENDING_SECTION_TEST_IDS.HEADER);
    expect(header).toBeOnTheScreen();
    expect(getByText(strings('predict.home.trending_title'))).toBeOnTheScreen();
    // The chevron renders only when the header is pressable (onPress set).
    expect(getByTestId('section-header-arrow-icon')).toBeOnTheScreen();

    fireEvent.press(header);

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.FEED,
      params: {
        feedId: 'trending',
        entryPoint: PredictEventValues.ENTRY_POINT.HOME_SECTION,
      },
    });
    expect(mockTrackHomeSectionInteraction).toHaveBeenCalledWith({
      sectionId: PredictEventValues.SECTION_ID.TRENDING,
      actionType: PredictEventValues.ACTION_TYPE.SEE_ALL,
      entryPoint: PredictEventValues.ENTRY_POINT.HOME_SECTION,
    });
  });
});
