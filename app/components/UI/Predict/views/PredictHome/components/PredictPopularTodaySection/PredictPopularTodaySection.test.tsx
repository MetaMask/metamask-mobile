import React from 'react';
import { fireEvent, within } from '@testing-library/react-native';
import { backgroundState } from '../../../../../../../util/test/initial-root-state';
import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import { strings } from '../../../../../../../../locales/i18n';
import Routes from '../../../../../../../constants/navigation/Routes';
import { PredictEventValues } from '../../../../constants/eventNames';
import { usePredictFilterOptions } from '../../../../hooks/usePredictFilterOptions';
import type { PredictFilterOption } from '../../../../types';
import PredictPopularTodaySection, {
  PREDICT_POPULAR_TODAY_SECTION_TEST_IDS,
} from './PredictPopularTodaySection';

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

jest.mock('../../../../hooks/usePredictFilterOptions');

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: jest.fn(() => ({})) }),
}));

const mockUsePredictFilterOptions = jest.mocked(usePredictFilterOptions);

const createFilterOption = (
  id: string,
  label: string,
): PredictFilterOption => ({
  id,
  label,
  source: 'related-tags',
  params: {
    tagSlugs: [id],
    status: 'open',
    order: 'volume24hr',
    limit: 12,
  },
});

const setFilterOptions = (
  overrides: Partial<ReturnType<typeof usePredictFilterOptions>> = {},
) => {
  mockUsePredictFilterOptions.mockReturnValue({
    filterOptions: [],
    isLoading: false,
    error: null,
    refetch: jest.fn(),
    ...overrides,
  });
};

type RenderSectionProps = React.ComponentProps<
  typeof PredictPopularTodaySection
>;

const renderSection = (props: RenderSectionProps = {}) =>
  renderWithProvider(<PredictPopularTodaySection {...props} />, {
    state: { engine: { backgroundState } },
  });

describe('PredictPopularTodaySection', () => {
  beforeEach(() => {
    setFilterOptions();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('does not render when there are no popular filter options', () => {
    const { queryByTestId } = renderSection();

    expect(
      queryByTestId(PREDICT_POPULAR_TODAY_SECTION_TEST_IDS.SECTION),
    ).toBeNull();
  });

  it('renders the Popular today header', () => {
    setFilterOptions({
      filterOptions: [createFilterOption('elections', 'Elections')],
    });

    const { getByTestId, getByText } = renderSection();

    expect(
      getByTestId(PREDICT_POPULAR_TODAY_SECTION_TEST_IDS.SECTION),
    ).toBeOnTheScreen();
    expect(
      getByTestId(PREDICT_POPULAR_TODAY_SECTION_TEST_IDS.HEADER),
    ).toBeOnTheScreen();
    expect(getByText(strings('predict.feed.popular_today'))).toBeOnTheScreen();
  });

  it('renders skeleton chips while loading', () => {
    setFilterOptions({ isLoading: true });

    const { getByTestId } = renderSection();

    expect(
      getByTestId(
        `${PREDICT_POPULAR_TODAY_SECTION_TEST_IDS.SKELETON_PREFIX}-0`,
      ),
    ).toBeOnTheScreen();
  });

  it('renders a chip for each popular filter option', () => {
    setFilterOptions({
      filterOptions: [
        createFilterOption('elections', 'Elections'),
        createFilterOption('crypto', 'Crypto'),
      ],
    });

    const { getByTestId, getByText } = renderSection();

    expect(
      getByTestId(
        `${PREDICT_POPULAR_TODAY_SECTION_TEST_IDS.CHIP_PREFIX}-elections`,
      ),
    ).toBeOnTheScreen();
    expect(
      getByTestId(
        `${PREDICT_POPULAR_TODAY_SECTION_TEST_IDS.CHIP_PREFIX}-crypto`,
      ),
    ).toBeOnTheScreen();
    expect(getByText('Elections')).toBeOnTheScreen();
    expect(getByText('Crypto')).toBeOnTheScreen();
  });

  it('renders popular filter chips across two rows', () => {
    setFilterOptions({
      filterOptions: [
        createFilterOption('iran', 'Iran'),
        createFilterOption('esports', 'E-Sports'),
        createFilterOption('march-madness', 'March Madness'),
        createFilterOption('nba', 'NBA'),
        createFilterOption('ufc', 'UFC'),
      ],
    });

    const { getByTestId } = renderSection();
    const firstRow = getByTestId(
      `${PREDICT_POPULAR_TODAY_SECTION_TEST_IDS.ROW_PREFIX}-0`,
    );
    const secondRow = getByTestId(
      `${PREDICT_POPULAR_TODAY_SECTION_TEST_IDS.ROW_PREFIX}-1`,
    );

    expect(within(firstRow).getByText('Iran')).toBeOnTheScreen();
    expect(within(firstRow).getByText('E-Sports')).toBeOnTheScreen();
    expect(within(firstRow).getByText('March Madness')).toBeOnTheScreen();
    expect(within(secondRow).getByText('NBA')).toBeOnTheScreen();
    expect(within(secondRow).getByText('UFC')).toBeOnTheScreen();
  });

  it('can render popular filter chips in a single row when configured', () => {
    setFilterOptions({
      filterOptions: [
        createFilterOption('iran', 'Iran'),
        createFilterOption('esports', 'E-Sports'),
        createFilterOption('march-madness', 'March Madness'),
      ],
    });

    const { getByTestId, queryByTestId } = renderSection({ rowCount: 1 });
    const firstRow = getByTestId(
      `${PREDICT_POPULAR_TODAY_SECTION_TEST_IDS.ROW_PREFIX}-0`,
    );

    expect(within(firstRow).getByText('Iran')).toBeOnTheScreen();
    expect(within(firstRow).getByText('E-Sports')).toBeOnTheScreen();
    expect(within(firstRow).getByText('March Madness')).toBeOnTheScreen();
    expect(
      queryByTestId(`${PREDICT_POPULAR_TODAY_SECTION_TEST_IDS.ROW_PREFIX}-1`),
    ).toBeNull();
  });

  it('navigates to the Popular Today feed when the header is pressed', () => {
    setFilterOptions({
      filterOptions: [createFilterOption('elections', 'Elections')],
    });

    const { getByTestId } = renderSection();

    fireEvent.press(getByTestId(PREDICT_POPULAR_TODAY_SECTION_TEST_IDS.HEADER));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.FEED,
      params: {
        feedId: 'popular-today',
        entryPoint: PredictEventValues.ENTRY_POINT.HOME_SECTION,
      },
    });
    expect(mockTrackHomeSectionInteraction).toHaveBeenCalledWith({
      sectionId: PredictEventValues.SECTION_ID.POPULAR_TODAY,
      actionType: PredictEventValues.ACTION_TYPE.SEE_ALL,
      entryPoint: PredictEventValues.ENTRY_POINT.HOME_SECTION,
    });
  });

  it('navigates to the Popular Today feed with the selected filter when a chip is pressed', () => {
    setFilterOptions({
      filterOptions: [createFilterOption('elections', 'Elections')],
    });

    const { getByTestId } = renderSection();

    fireEvent.press(
      getByTestId(
        `${PREDICT_POPULAR_TODAY_SECTION_TEST_IDS.CHIP_PREFIX}-elections`,
      ),
    );

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.FEED,
      params: {
        feedId: 'popular-today',
        initialFilterId: 'elections',
        entryPoint: PredictEventValues.ENTRY_POINT.HOME_SECTION,
      },
    });
    expect(mockTrackHomeSectionInteraction).toHaveBeenCalledWith({
      sectionId: PredictEventValues.SECTION_ID.POPULAR_TODAY,
      actionType: PredictEventValues.ACTION_TYPE.CLICKED,
      filterId: 'elections',
      isDynamicFilter: true,
      entryPoint: PredictEventValues.ENTRY_POINT.HOME_SECTION,
    });
  });
});
