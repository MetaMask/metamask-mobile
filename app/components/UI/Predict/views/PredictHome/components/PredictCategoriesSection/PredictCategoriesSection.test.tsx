import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { backgroundState } from '../../../../../../../util/test/initial-root-state';
import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import { strings } from '../../../../../../../../locales/i18n';
import Routes from '../../../../../../../constants/navigation/Routes';
import { PredictEventValues } from '../../../../constants/eventNames';
import PredictCategoriesSection from './PredictCategoriesSection';
import { PREDICT_CATEGORIES_SECTION_TEST_IDS } from './PredictCategoriesSection.testIds';
import { PREDICT_HOME_CATEGORIES } from './categories';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

const mockTrackCategoryClicked = jest.fn();
const mockTrackHomeSectionInteraction = jest.fn();

jest.mock('../../../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      PredictController: {
        trackCategoryClicked: (
          ...args: Parameters<typeof mockTrackCategoryClicked>
        ) => mockTrackCategoryClicked(...args),
        trackHomeSectionInteraction: (
          ...args: Parameters<typeof mockTrackHomeSectionInteraction>
        ) => mockTrackHomeSectionInteraction(...args),
      },
    },
  },
}));

const renderSection = () =>
  renderWithProvider(<PredictCategoriesSection />, {
    state: { engine: { backgroundState } },
  });

describe('PredictCategoriesSection', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the section header and a tile for each category', () => {
    const { getByTestId, getByText } = renderSection();

    expect(
      getByTestId(PREDICT_CATEGORIES_SECTION_TEST_IDS.SECTION),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('predict.home.categories_title')),
    ).toBeOnTheScreen();

    PREDICT_HOME_CATEGORIES.forEach((category) => {
      expect(
        getByTestId(
          `${PREDICT_CATEGORIES_SECTION_TEST_IDS.TILE_PREFIX}-${category.id}`,
        ),
      ).toBeOnTheScreen();
      expect(getByText(strings(category.titleKey))).toBeOnTheScreen();
    });
  });

  it('renders a static header with no "See all" chevron', () => {
    const { queryByTestId } = renderSection();

    expect(queryByTestId('section-header-arrow-icon')).not.toBeOnTheScreen();
  });

  it('renders the three categories in Figma order (politics, sports, crypto)', () => {
    const { getAllByTestId } = renderSection();

    const tiles = getAllByTestId(
      new RegExp(`^${PREDICT_CATEGORIES_SECTION_TEST_IDS.TILE_PREFIX}-`),
    );

    expect(
      tiles.map((tile) =>
        tile.props.testID.replace(
          `${PREDICT_CATEGORIES_SECTION_TEST_IDS.TILE_PREFIX}-`,
          '',
        ),
      ),
    ).toEqual(['politics', 'sports', 'crypto']);
  });

  it.each(PREDICT_HOME_CATEGORIES)(
    'pressing the $id tile navigates to its feed and tracks the analytics event',
    (category) => {
      const { getByTestId } = renderSection();

      fireEvent.press(
        getByTestId(
          `${PREDICT_CATEGORIES_SECTION_TEST_IDS.TILE_PREFIX}-${category.id}`,
        ),
      );

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
        screen: Routes.PREDICT.FEED,
        params: {
          feedId: category.id,
          entryPoint: PredictEventValues.ENTRY_POINT.HOME_SECTION,
        },
      });

      expect(mockTrackCategoryClicked).toHaveBeenCalledWith({
        categoryName: category.id,
        entryPoint: PredictEventValues.ENTRY_POINT.HOME_SECTION,
      });
      expect(mockTrackHomeSectionInteraction).toHaveBeenCalledWith({
        sectionId: PredictEventValues.SECTION_ID.CATEGORIES,
        actionType: PredictEventValues.ACTION_TYPE.CLICKED,
        categoryName: category.id,
        entryPoint: PredictEventValues.ENTRY_POINT.HOME_SECTION,
      });
    },
  );
});
