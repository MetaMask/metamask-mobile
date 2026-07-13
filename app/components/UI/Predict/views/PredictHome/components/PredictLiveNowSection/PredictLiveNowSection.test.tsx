import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { backgroundState } from '../../../../../../../util/test/initial-root-state';
import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import { strings } from '../../../../../../../../locales/i18n';
import Routes from '../../../../../../../constants/navigation/Routes';
import type { PredictMarket } from '../../../../types';
import { CRYPTO_TAG, UP_OR_DOWN_TAG } from '../../../../utils/cryptoUpDown';
import { PredictEventValues } from '../../../../constants/eventNames';
import PredictLiveNowSection from './PredictLiveNowSection';
import { PREDICT_LIVE_NOW_SECTION_TEST_IDS } from './PredictLiveNowSection.testIds';
import { usePredictLiveNowSection } from './usePredictLiveNowSection';

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
// logic (params, filtering, interleave, loading) is covered by
// usePredictLiveNowSection.test.ts. Here we exercise the real PredictMarket /
// PredictMarketSkeleton presentation against controlled hook output.
jest.mock('./usePredictLiveNowSection');

// Keep the Up/Down flag on so crypto markets route to the crypto card via the
// real PredictMarket dispatcher.
jest.mock('../../../../selectors/featureFlags', () => ({
  selectPredictUpDownEnabledFlag: jest.fn(() => true),
}));

// Tailwind preset is environment-only styling; stub it like sibling carousels.
jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: jest.fn(() => ({})) }),
}));

// FlashList renders asynchronously via layout effects; swap it for a simple
// ScrollView so renders are deterministic (no act() warnings) while still
// invoking renderItem/keyExtractor/onScroll exactly as the component wires them.
jest.mock('@shopify/flash-list', () => {
  const MockReact = jest.requireActual('react');
  const { View: MockView, ScrollView: MockScrollView } =
    jest.requireActual('react-native');

  const MockFlashList = MockReact.forwardRef(
    (
      {
        data,
        renderItem,
        keyExtractor,
        testID,
        onScroll,
      }: {
        data: unknown[];
        renderItem: (info: { item: unknown; index: number }) => React.ReactNode;
        keyExtractor: (item: unknown, index: number) => string;
        testID?: string;
        onScroll?: (event: unknown) => void;
      },
      ref: React.Ref<unknown>,
    ) => {
      MockReact.useImperativeHandle(ref, () => ({}));

      return (
        <MockScrollView testID={testID} onScroll={onScroll}>
          {data?.map((item, index) => (
            <MockView key={keyExtractor?.(item, index) ?? index}>
              {renderItem({ item, index })}
            </MockView>
          ))}
        </MockScrollView>
      );
    },
  );

  return { FlashList: MockFlashList, FlashListRef: {} };
});

// Mock the heavy leaf cards (charts/images/timers) — the same boundary the
// canonical PredictMarket.test.tsx uses — forwarding the section's testID so
// real PredictMarket dispatch (game -> sport, crypto -> up/down) is exercised.
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

const mockUsePredictLiveNowSection = usePredictLiveNowSection as jest.Mock;

const createLiveMarket = (id: string): PredictMarket =>
  ({
    id,
    outcomes: [{ id: `${id}-o1` }],
    game: { id: `game-${id}` },
  }) as unknown as PredictMarket;

const createCryptoMarket = (id: string): PredictMarket =>
  ({
    id,
    outcomes: [{ id: `${id}-o1` }],
    tags: [CRYPTO_TAG, UP_OR_DOWN_TAG],
    series: { id: '10684', slug: 'btc-up-or-down-5m', recurrence: '5m' },
  }) as unknown as PredictMarket;

const setSection = (
  overrides: Partial<{
    items: PredictMarket[];
    isLoading: boolean;
    isEmpty: boolean;
  }> = {},
) => {
  mockUsePredictLiveNowSection.mockReturnValue({
    items: [],
    isLoading: false,
    isEmpty: false,
    ...overrides,
  });
};

const renderSection = () =>
  renderWithProvider(<PredictLiveNowSection />, {
    state: { engine: { backgroundState } },
  });

describe('PredictLiveNowSection', () => {
  beforeEach(() => {
    setSection();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders a market card for each live item', () => {
    setSection({ items: [createLiveMarket('L1'), createLiveMarket('L2')] });

    const { getByTestId } = renderSection();

    expect(
      getByTestId(`${PREDICT_LIVE_NOW_SECTION_TEST_IDS.CARD_PREFIX}-L1`),
    ).toBeOnTheScreen();
    expect(
      getByTestId(`${PREDICT_LIVE_NOW_SECTION_TEST_IDS.CARD_PREFIX}-L2`),
    ).toBeOnTheScreen();
  });

  it('renders a crypto Up/Down card through the shared PredictMarket dispatcher', () => {
    setSection({ items: [createCryptoMarket('CRYPTO')] });

    const { getByTestId } = renderSection();

    expect(
      getByTestId(`${PREDICT_LIVE_NOW_SECTION_TEST_IDS.CARD_PREFIX}-CRYPTO`),
    ).toBeOnTheScreen();
  });

  it('renders skeleton cards while loading with no items yet', () => {
    setSection({ items: [], isLoading: true });

    const { getByTestId } = renderSection();

    expect(
      getByTestId(`${PREDICT_LIVE_NOW_SECTION_TEST_IDS.SKELETON_PREFIX}-0`),
    ).toBeOnTheScreen();
  });

  it('returns null (renders no section) when empty', () => {
    setSection({ items: [], isEmpty: true });

    const { queryByTestId } = renderSection();

    expect(
      queryByTestId(PREDICT_LIVE_NOW_SECTION_TEST_IDS.SECTION),
    ).not.toBeOnTheScreen();
  });

  it('renders a pressable "Live now" header that navigates to the live feed', () => {
    setSection({ items: [createLiveMarket('L1')] });

    const { getByTestId, getByText } = renderSection();

    const header = getByTestId(PREDICT_LIVE_NOW_SECTION_TEST_IDS.HEADER);
    expect(header).toBeOnTheScreen();
    expect(getByText(strings('predict.home.live_now_title'))).toBeOnTheScreen();

    fireEvent.press(header);

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.FEED,
      params: {
        feedId: 'live',
        entryPoint: PredictEventValues.ENTRY_POINT.HOME_SECTION,
      },
    });
    expect(mockTrackHomeSectionInteraction).toHaveBeenCalledWith({
      sectionId: PredictEventValues.SECTION_ID.LIVE_NOW,
      actionType: PredictEventValues.ACTION_TYPE.SEE_ALL,
      entryPoint: PredictEventValues.ENTRY_POINT.HOME_SECTION,
    });
  });

  it('renders pagination dots when there are 2+ items after load', () => {
    setSection({ items: [createLiveMarket('L1'), createLiveMarket('L2')] });

    const { getByTestId } = renderSection();

    expect(
      getByTestId(PREDICT_LIVE_NOW_SECTION_TEST_IDS.PAGINATION_DOTS),
    ).toBeOnTheScreen();
  });

  it('does not render pagination dots when there is fewer than 2 items', () => {
    setSection({ items: [createLiveMarket('L1')] });

    const { queryByTestId } = renderSection();

    expect(
      queryByTestId(PREDICT_LIVE_NOW_SECTION_TEST_IDS.PAGINATION_DOTS),
    ).not.toBeOnTheScreen();
  });

  it('updates the active card without crashing when the carousel is scrolled', () => {
    setSection({ items: [createLiveMarket('L1'), createLiveMarket('L2')] });

    const { getByTestId } = renderSection();
    const carousel = getByTestId(PREDICT_LIVE_NOW_SECTION_TEST_IDS.CAROUSEL);

    fireEvent.scroll(carousel, {
      nativeEvent: { contentOffset: { x: 320, y: 0 } },
    });

    expect(carousel).toBeOnTheScreen();
  });
});
