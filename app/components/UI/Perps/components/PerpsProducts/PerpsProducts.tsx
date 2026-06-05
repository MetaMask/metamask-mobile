import React, { useCallback } from 'react';
import { View, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  Text,
  TextVariant,
  FontWeight,
  Icon,
  IconName,
  IconSize,
  IconColor,
} from '@metamask/design-system-react-native';
import {
  type MarketTypeFilter,
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
} from '@metamask/perps-controller';
import { strings } from '../../../../../../locales/i18n';
import { useStyles } from '../../../../../component-library/hooks';
import SectionHeader from '../../../../../component-library/components-temp/SectionHeader';
import Routes from '../../../../../constants/navigation/Routes';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { selectPerpsProductsEnabledFlag } from '../../selectors/featureFlags';
import { PerpsHomeViewSelectorsIDs } from '../../Perps.testIds';
import { usePerpsCategories } from '../../hooks/usePerpsCategories';
import { styleSheet } from './PerpsProducts.styles';
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

const CATEGORY_ICON_MAP: Record<string, IconName> = {
  crypto: IconName.Coin,
  stocks: IconName.Briefcase,
  'pre-ipo': IconName.Rocket,
  forex: IconName.Exchange,
  commodities: IconName.MoneyBag,
  indices: IconName.Chart,
  etfs: IconName.PieChart,
};

/**
 * PerpsProducts – grid of category pills for the Perps home screen.
 *
 * Categories are driven by `MARKET_CATEGORIES` from `@metamask/perps-controller`.
 * Pills whose category has zero available markets are hidden.
 * Tapping a pill navigates to the Markets list screen with that category
 * pre-selected via `defaultMarketTypeFilter`.
 */
const TEST_ID = PerpsHomeViewSelectorsIDs.PRODUCTS_SECTION;

const PerpsProducts: React.FC<PerpsProductsProps> = ({
  transactionActiveAbTests,
}) => {
  const isEnabled = useSelector(selectPerpsProductsEnabledFlag);
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation();
  const { trackEvent, createEventBuilder } = useAnalytics();

  const categoriesWithLabels = usePerpsCategories();

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

  if (!isEnabled || categoriesWithLabels.length === 0) {
    return null;
  }

  return (
    <View style={styles.container} testID={TEST_ID}>
      <SectionHeader
        title={strings('perps.home.products')}
        twClassName="px-0 mb-0"
      />

      <View style={styles.grid}>
        {categoriesWithLabels.map((category, index) => (
          <Pressable
            key={category.id}
            style={({ pressed }) => [
              styles.pill,
              pressed && styles.pillPressed,
            ]}
            onPress={() => handlePillPress(category.id, index)}
            accessibilityRole="button"
            accessibilityLabel={category.label}
            testID={`${TEST_ID}-${category.id}`}
          >
            <Icon
              name={CATEGORY_ICON_MAP[category.id] ?? IconName.Coin}
              size={IconSize.Sm}
              color={IconColor.IconAlternative}
            />
            <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
              {category.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
};

export default PerpsProducts;
