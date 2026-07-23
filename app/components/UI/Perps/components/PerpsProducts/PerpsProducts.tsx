import React, { useCallback, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  Box,
  Icon,
  IconColor,
  IconSize,
  SectionHeader,
} from '@metamask/design-system-react-native';
import {
  type MarketTypeFilter,
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
} from '@metamask/perps-controller';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { selectPerpsProductsEnabledFlag } from '../../selectors/featureFlags';
import { PerpsHomeViewSelectorsIDs } from '../../Perps.testIds';
import {
  usePerpsCategories,
  NEW_CATEGORY,
  type PerpsCategory,
} from '../../hooks/usePerpsCategories';
import { useHasNewMarkets } from '../../hooks/useHasNewMarkets';
import { getCategoryIconName } from '../../constants/categoryIcons';
import { ExplorePill } from '../../../Trending/components/ExplorePill';
import { PillScrollList } from '../../../Trending/components/PillScrollList';
import { SectionPillsSkeleton } from '../../../Trending/components/SectionPillsSkeleton';
import type { PerpsProductsProps } from './PerpsProducts.types';

/**
 * Analytics constants for product pills — not yet in @metamask/perps-controller.
 * Move to PERPS_EVENT_PROPERTY / PERPS_EVENT_VALUE once added upstream.
 */
const PRODUCTS_ANALYTICS = {
  BUTTON_CLICKED: 'product_pill_tapped',
  PROPERTY_PRODUCT: 'product',
  PROPERTY_PILL_POSITION: 'pill_position',
  SOURCE: 'perps_home__product_pill',
} as const;

const PRODUCTS_ROW_COUNT = 2;

/**
 * PerpsProducts – grid of category pills for the Perps home screen.
 *
 * Categories are driven by `MARKET_CATEGORIES` from `@metamask/perps-controller`.
 * Pills whose category has zero available markets are hidden. A trailing
 * "New" pill is shown when any market was listed within the last 30 days
 * (see `useHasNewMarkets`).
 * Tapping a pill navigates to the Markets list screen with that category
 * pre-selected via `defaultMarketTypeFilter`.
 */
const TEST_ID = PerpsHomeViewSelectorsIDs.PRODUCTS_SECTION;

const PerpsProducts: React.FC<PerpsProductsProps> = ({
  transactionActiveAbTests,
}) => {
  const isEnabled = useSelector(selectPerpsProductsEnabledFlag);
  const navigation = useNavigation();
  const { trackEvent, createEventBuilder } = useAnalytics();

  const categories = usePerpsCategories();
  const hasNewMarkets = useHasNewMarkets();

  const categoriesWithLabels = useMemo(
    () => (hasNewMarkets ? [...categories, NEW_CATEGORY] : categories),
    [categories, hasNewMarkets],
  );

  const handlePillPress = useCallback(
    (category: Exclude<MarketTypeFilter, 'all'>, pillPosition: number) => {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.PERPS_UI_INTERACTION)
          .addProperties({
            [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
              PERPS_EVENT_VALUE.INTERACTION_TYPE.BUTTON_CLICKED,
            [PERPS_EVENT_PROPERTY.BUTTON_CLICKED]:
              PRODUCTS_ANALYTICS.BUTTON_CLICKED,
            [PERPS_EVENT_PROPERTY.BUTTON_LOCATION]:
              PERPS_EVENT_VALUE.BUTTON_LOCATION.PERPS_HOME,
            [PRODUCTS_ANALYTICS.PROPERTY_PRODUCT]: category,
            [PRODUCTS_ANALYTICS.PROPERTY_PILL_POSITION]: pillPosition,
          })
          .build(),
      );

      navigation.navigate(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.MARKET_LIST,
        params: {
          defaultMarketTypeFilter: category,
          source: PRODUCTS_ANALYTICS.SOURCE,
          ...(transactionActiveAbTests?.length
            ? { transactionActiveAbTests }
            : {}),
        },
      });
    },
    [navigation, trackEvent, createEventBuilder, transactionActiveAbTests],
  );

  const renderCategoryPill = useCallback(
    (category: PerpsCategory, index: number) => (
      <ExplorePill
        onPress={() => handlePillPress(category.id, index)}
        testID={`${TEST_ID}-${category.id}`}
        leading={
          <Icon
            name={getCategoryIconName(category.id)}
            size={IconSize.Md}
            color={IconColor.IconDefault}
          />
        }
        title={category.label}
      />
    ),
    [handlePillPress],
  );

  if (!isEnabled || categoriesWithLabels.length === 0) {
    return null;
  }

  return (
    <Box paddingBottom={3} testID={TEST_ID}>
      <SectionHeader title={strings('perps.home.products')} />

      <PillScrollList<PerpsCategory>
        data={categoriesWithLabels}
        isLoading={false}
        renderItem={renderCategoryPill}
        keyExtractor={(category) => category.id}
        Skeleton={SectionPillsSkeleton}
        rowCount={PRODUCTS_ROW_COUNT}
        maxPills={categoriesWithLabels.length}
        wrapperTwClassName="bg-transparent"
        listTestId={`${TEST_ID}-list`}
      />
    </Box>
  );
};

export default PerpsProducts;
