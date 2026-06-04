import React, { useCallback, useMemo } from 'react';
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
  MARKET_CATEGORIES,
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
import { styleSheet } from './PerpsProducts.styles';
import type {
  PerpsProductsProps,
  CategoryPillConfig,
} from './PerpsProducts.types';

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
 * Build pill configs from the controller-provided MARKET_CATEGORIES constant.
 * Labels use the existing i18n keys under `perps.home.tabs.*`.
 */
const PILL_CONFIGS: CategoryPillConfig[] = MARKET_CATEGORIES.map(
  (category) => ({
    category,
    labelKey: `perps.home.tabs.${category.replace('-', '_')}`,
  }),
);

/**
 * PerpsProducts – grid of category pills for the Perps home screen.
 *
 * Categories are driven by `MARKET_CATEGORIES` from `@metamask/perps-controller`.
 * Pills whose category has zero available markets are hidden.
 * Tapping a pill navigates to the Markets list screen with that category
 * pre-selected via `defaultMarketTypeFilter`.
 */
const PerpsProducts: React.FC<PerpsProductsProps> = ({
  marketCounts,
  testID,
}) => {
  const isEnabled = useSelector(selectPerpsProductsEnabledFlag);
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation();
  const { trackEvent, createEventBuilder } = useAnalytics();

  const visiblePills = useMemo(
    () => PILL_CONFIGS.filter((cfg) => (marketCounts[cfg.category] ?? 0) > 0),
    [marketCounts],
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
        },
      });
    },
    [navigation, trackEvent, createEventBuilder],
  );

  if (!isEnabled || visiblePills.length === 0) {
    return null;
  }

  return (
    <View style={styles.container} testID={testID}>
      <SectionHeader
        title={strings('perps.home.products')}
        twClassName="px-0 mb-0"
      />

      <View style={styles.grid}>
        {visiblePills.map((cfg, index) => (
          <Pressable
            key={cfg.category}
            style={({ pressed }) => [
              styles.pill,
              pressed && styles.pillPressed,
            ]}
            onPress={() => handlePillPress(cfg.category, index)}
            accessibilityRole="button"
            accessibilityLabel={strings(cfg.labelKey)}
            testID={testID ? `${testID}-${cfg.category}` : undefined}
          >
            <Icon
              name={CATEGORY_ICON_MAP[cfg.category] ?? IconName.Coin}
              size={IconSize.Sm}
              color={IconColor.IconAlternative}
            />
            <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
              {strings(cfg.labelKey)}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
};

export default PerpsProducts;
