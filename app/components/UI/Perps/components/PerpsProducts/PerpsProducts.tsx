import React, { useCallback, useMemo } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
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
import { useTheme } from '../../../../../util/theme';
import { BADGE_CATEGORY_ICON_MAP } from '../../constants/categoryIcons';
import PreIpoRocketSVG from './assets/pre-ipo-rocket.svg';
import EtfsLayersSVG from './assets/etfs-layers.svg';
import IndicesChartSVG from './assets/indices-chart.svg';
import { styleSheet } from './PerpsProducts.styles';
import type { PerpsProductsProps } from './PerpsProducts.types';

type SvgComponent = React.FC<
  import('react-native-svg').SvgProps & { name: string }
>;

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

const CUSTOM_SVG_ICONS: Record<string, SvgComponent> = {
  'pre-ipo': PreIpoRocketSVG,
  etfs: EtfsLayersSVG,
  indices: IndicesChartSVG,
};

const CategoryIcon: React.FC<{ categoryId: string }> = ({ categoryId }) => {
  const { themeAppearance, colors } = useTheme();
  const isDark = themeAppearance === 'dark';
  const CustomIcon = CUSTOM_SVG_ICONS[categoryId];
  if (CustomIcon) {
    return (
      <CustomIcon
        width={24}
        height={24}
        name={categoryId}
        color={isDark ? colors.icon.default : colors.icon.alternative}
      />
    );
  }
  return (
    <Icon
      name={BADGE_CATEGORY_ICON_MAP[categoryId] ?? IconName.Coin}
      size={IconSize.Lg}
      color={isDark ? IconColor.IconDefault : IconColor.IconAlternative}
    />
  );
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
  const { styles, theme } = useStyles(styleSheet, {});
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

  const rows = useMemo(() => {
    const mid = Math.ceil(categoriesWithLabels.length / 2);
    return [
      categoriesWithLabels.slice(0, mid),
      categoriesWithLabels.slice(mid),
    ];
  }, [categoriesWithLabels]);

  if (!isEnabled || categoriesWithLabels.length === 0) {
    return null;
  }

  const renderPill = (
    category: (typeof categoriesWithLabels)[number],
    index: number,
  ) => (
    <Pressable
      key={category.id}
      style={({ pressed }) => [styles.pill, pressed && styles.pillPressed]}
      onPress={() => handlePillPress(category.id, index)}
      accessibilityRole="button"
      accessibilityLabel={category.label}
      testID={`${TEST_ID}-${category.id}`}
    >
      <CategoryIcon categoryId={category.id} />
      <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
        {category.label}
      </Text>
    </Pressable>
  );

  return (
    <View style={styles.container} testID={TEST_ID}>
      <SectionHeader
        title={strings('perps.home.products')}
        twClassName="mb-0"
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollContainer}
      >
        <View style={styles.columnLayout}>
          {rows.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.row}>
              {row.map((category, colIndex) => {
                const originalIndex =
                  rowIndex === 0 ? colIndex : rows[0].length + colIndex;
                return renderPill(category, originalIndex);
              })}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

export default PerpsProducts;
