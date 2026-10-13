import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { backgroundState } from '../../../../../../../util/test/initial-root-state';
import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import I18n, {
  I18nEvents,
  strings,
} from '../../../../../../../../locales/i18n';
import Routes from '../../../../../../../constants/navigation/Routes';
import { IconName as LocalIconName } from '../../../../../../../component-library/components/Icons/Icon';
import { PredictEventValues } from '../../../../constants/eventNames';
import { DEFAULT_PREDICT_HOME_CATEGORIES_FLAG } from '../../../../constants/flags';
import type { PredictHomeCategoriesConfig } from '../../../../types/flags';
import PredictCategoriesSection, {
  getPredictCategoryTileWidth,
} from './PredictCategoriesSection';
import { PREDICT_CATEGORIES_SECTION_TEST_IDS } from './PredictCategoriesSection.testIds';
import {
  PREDICT_HOME_CATEGORIES,
  resolvePredictHomeCategories,
  resolvePredictHomeCategoryDisplayTitle,
  resolvePredictHomeCategoryIcon,
} from './categories';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('1.0.0'),
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

const TILE_PREFIX = PREDICT_CATEGORIES_SECTION_TEST_IDS.TILE_PREFIX;

const renderSection = (remoteFlag?: unknown) =>
  renderWithProvider(<PredictCategoriesSection />, {
    state: {
      engine: {
        backgroundState: {
          ...backgroundState,
          RemoteFeatureFlagController: {
            ...backgroundState.RemoteFeatureFlagController,
            remoteFeatureFlags: {
              ...backgroundState.RemoteFeatureFlagController.remoteFeatureFlags,
              ...(remoteFlag === undefined
                ? {}
                : { predictHomeCategories: remoteFlag }),
            },
          },
        },
      },
    },
  });

const getRenderedTileIds = (
  getAllByTestId: ReturnType<typeof renderSection>['getAllByTestId'],
) =>
  getAllByTestId(new RegExp(`^${TILE_PREFIX}-`)).map((tile) =>
    tile.props.testID.replace(`${TILE_PREFIX}-`, ''),
  );

describe('PredictCategoriesSection', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the section header and a tile for each bundled category', () => {
    const { getByTestId, getByText } = renderSection();

    expect(
      getByTestId(PREDICT_CATEGORIES_SECTION_TEST_IDS.SECTION),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('predict.home.categories_title')),
    ).toBeOnTheScreen();

    expect(PREDICT_HOME_CATEGORIES.length).toBeGreaterThanOrEqual(7);
    PREDICT_HOME_CATEGORIES.forEach((category) => {
      expect(getByTestId(`${TILE_PREFIX}-${category.id}`)).toBeOnTheScreen();
      expect(getByText(category.title)).toBeOnTheScreen();
    });
  });

  it('renders a static header with no "See all" chevron', () => {
    const { queryByTestId } = renderSection();

    expect(queryByTestId('section-header-arrow-icon')).not.toBeOnTheScreen();
  });

  it('renders the tiles inside a horizontal carousel', () => {
    const { getByTestId } = renderSection();

    const carousel = getByTestId(PREDICT_CATEGORIES_SECTION_TEST_IDS.CAROUSEL);

    expect(carousel.props.horizontal).toBe(true);
    expect(carousel.props.showsHorizontalScrollIndicator).toBe(false);
  });

  it('sizes tiles so the fourth tile peeks on a standard phone width', () => {
    const tileWidth = getPredictCategoryTileWidth(390);
    const gap = 12;
    const contentWidth = 390 - 16 * 2;
    const threeTilesWithGaps = tileWidth * 3 + gap * 3;

    // Three full tiles fit, and the fourth is partially visible.
    expect(threeTilesWithGaps).toBeLessThan(contentWidth);
    expect(threeTilesWithGaps + tileWidth).toBeGreaterThan(contentWidth);
  });

  it('renders the bundled default order when the remote flag is missing', () => {
    const { getAllByTestId } = renderSection();

    expect(getRenderedTileIds(getAllByTestId)).toEqual([
      'politics',
      'sports',
      'crypto',
      'esports',
      'culture',
      'finance',
      'tech',
    ]);
  });

  it('orders tiles by the LaunchDarkly array order and drops disabled ones', () => {
    const remoteFlag: PredictHomeCategoriesConfig = {
      enabled: true,
      minimumVersion: '1.0.0',
      categories: [
        {
          id: 'crypto',
          tagSlug: 'crypto',
          label: 'Crypto',
          iconName: 'MoneyBag',
        },
        { id: 'politics', tagSlug: 'politics', label: 'Politics' },
        { id: 'sports', tagSlug: 'sports', label: 'Sports', enabled: false },
        { id: 'tech', tagSlug: 'tech', label: 'Tech', enabled: true },
      ],
    };

    const { getAllByTestId, queryByTestId } = renderSection(remoteFlag);

    expect(getRenderedTileIds(getAllByTestId)).toEqual([
      'crypto',
      'politics',
      'tech',
    ]);
    expect(queryByTestId(`${TILE_PREFIX}-sports`)).not.toBeOnTheScreen();
  });

  it('renders a remotely added category with its remote label and navigates to its feed', () => {
    const remoteFlag: PredictHomeCategoriesConfig = {
      enabled: true,
      minimumVersion: '1.0.0',
      categories: [
        { id: 'politics', tagSlug: 'politics', label: 'Politics' },
        {
          id: 'weather',
          tagSlug: 'weather',
          label: 'Weather',
          iconName: 'NotAnIcon',
        },
      ],
    };

    const { getByTestId, getByText } = renderSection(remoteFlag);

    expect(getByText('Weather')).toBeOnTheScreen();

    fireEvent.press(getByTestId(`${TILE_PREFIX}-weather`));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.FEED,
      params: {
        feedId: 'weather',
        entryPoint: PredictEventValues.ENTRY_POINT.HOME_SECTION,
      },
    });
    expect(mockTrackCategoryClicked).toHaveBeenCalledWith({
      categoryName: 'weather',
      entryPoint: PredictEventValues.ENTRY_POINT.HOME_SECTION,
    });
    expect(mockTrackHomeSectionInteraction).toHaveBeenCalledWith({
      sectionId: PredictEventValues.SECTION_ID.CATEGORIES,
      actionType: PredictEventValues.ACTION_TYPE.CLICKED,
      categoryName: 'weather',
      entryPoint: PredictEventValues.ENTRY_POINT.HOME_SECTION,
    });
  });

  it('falls back to the bundled rail when the remote flag is invalid', () => {
    const { getAllByTestId } = renderSection({
      enabled: true,
      minimumVersion: '1.0.0',
      categories: [{ label: 'missing id and tagSlug' }],
    });

    expect(getRenderedTileIds(getAllByTestId)).toEqual(
      PREDICT_HOME_CATEGORIES.map((category) => category.id),
    );
  });

  it('falls back to the bundled rail when the remote flag is disabled', () => {
    const { getAllByTestId } = renderSection({
      ...DEFAULT_PREDICT_HOME_CATEGORIES_FLAG,
      enabled: false,
      categories: [{ id: 'tech', tagSlug: 'tech', label: 'Tech' }],
    });

    expect(getRenderedTileIds(getAllByTestId)).toEqual(
      PREDICT_HOME_CATEGORIES.map((category) => category.id),
    );
  });

  it.each(PREDICT_HOME_CATEGORIES)(
    'pressing the $id tile navigates to its feed and tracks the analytics event',
    (category) => {
      const { getByTestId } = renderSection();

      fireEvent.press(getByTestId(`${TILE_PREFIX}-${category.id}`));

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

describe('resolvePredictHomeCategories', () => {
  it('uses the bundled default when no config is passed', () => {
    expect(resolvePredictHomeCategories()).toEqual(PREDICT_HOME_CATEGORIES);
  });

  it('prefers the remote label over the bundled titleKey', () => {
    const [category] = resolvePredictHomeCategories({
      enabled: true,
      minimumVersion: '',
      categories: [
        {
          id: 'politics',
          tagSlug: 'politics',
          titleKey: 'predict.category.politics',
          label: 'Elections',
        },
      ],
    });

    expect(category.title).toBe('Elections');
    expect(category.titleKey).toBeUndefined();
  });

  it('falls back to the titleKey, then to the id, when no label is set', () => {
    const [politics, mystery] = resolvePredictHomeCategories({
      enabled: true,
      minimumVersion: '',
      categories: [
        {
          id: 'politics',
          tagSlug: 'politics',
          titleKey: 'predict.category.politics',
        },
        { id: 'mystery', tagSlug: 'mystery' },
      ],
    });

    expect(politics.title).toBe(strings('predict.category.politics'));
    expect(politics.titleKey).toBe('predict.category.politics');
    expect(mystery.title).toBe('mystery');
    expect(mystery.titleKey).toBeUndefined();
  });

  it('translates titleKey at display time and falls back to the raw id', () => {
    const [politics, mystery] = resolvePredictHomeCategories({
      enabled: true,
      minimumVersion: '',
      categories: [
        { id: 'politics', tagSlug: 'politics' },
        { id: 'mystery', tagSlug: 'mystery' },
      ],
    });

    expect(resolvePredictHomeCategoryDisplayTitle(politics)).toBe(
      strings('predict.category.politics'),
    );
    expect(resolvePredictHomeCategoryDisplayTitle(mystery)).toBe('mystery');
    expect(
      resolvePredictHomeCategoryDisplayTitle({
        id: 'weather',
        titleKey: 'predict.category.not-a-real-key',
        title: 'Weather',
        iconName: LocalIconName.Explore,
      }),
    ).toBe('weather');
  });

  it('localizes shipped category ids from predict.category.* when LD omits copy', () => {
    const categories = resolvePredictHomeCategories({
      enabled: true,
      minimumVersion: '',
      categories: [
        { id: 'politics', tagSlug: 'politics' },
        { id: 'sports', tagSlug: 'sports' },
        { id: 'crypto', tagSlug: 'crypto' },
        { id: 'esports', tagSlug: 'esports' },
        { id: 'culture', tagSlug: 'pop-culture' },
        { id: 'finance', tagSlug: 'finance' },
        { id: 'tech', tagSlug: 'tech' },
        { id: 'weather', tagSlug: 'weather' },
      ],
    });

    expect(categories.map((category) => [category.id, category.title])).toEqual(
      [
        ['politics', strings('predict.category.politics')],
        ['sports', strings('predict.category.sports')],
        ['crypto', strings('predict.category.crypto')],
        ['esports', strings('predict.category.esports')],
        ['culture', strings('predict.category.culture')],
        ['finance', strings('predict.category.finance')],
        ['tech', strings('predict.category.tech')],
        ['weather', 'weather'],
      ],
    );
  });

  it('keeps the first occurrence of duplicate ids', () => {
    const categories = resolvePredictHomeCategories({
      enabled: true,
      minimumVersion: '',
      categories: [
        { id: 'tech', tagSlug: 'tech', label: 'Tech' },
        { id: 'tech', tagSlug: 'technology', label: 'Technology' },
      ],
    });

    expect(categories).toHaveLength(1);
    expect(categories[0].title).toBe('Tech');
  });
});

describe('resolvePredictHomeCategoryIcon', () => {
  it('returns allowlisted icons as-is', () => {
    expect(resolvePredictHomeCategoryIcon('Trophy')).toBe(LocalIconName.Trophy);
  });

  it('falls back to a default icon for unknown or missing names', () => {
    expect(resolvePredictHomeCategoryIcon('DefinitelyNotAnIcon')).toBe(
      LocalIconName.Explore,
    );
    expect(resolvePredictHomeCategoryIcon(undefined)).toBe(
      LocalIconName.Explore,
    );
  });
});
