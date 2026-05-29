import React, { useCallback } from 'react';
import { Pressable, ScrollView } from 'react-native';
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
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
  type MarketTypeFilter,
} from '@metamask/perps-controller';
import { useStyles } from '../../../../../component-library/hooks';
import { usePerpsNavigation } from '../../hooks/usePerpsNavigation';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { strings } from '../../../../../../locales/i18n';
import { styleSheet } from './PerpsProductPills.styles';
import type {
  PerpsProductPillsProps,
  ProductPillConfig,
} from './PerpsProductPills.types';

const PRODUCT_PILLS: ProductPillConfig[] = [
  {
    category: 'crypto',
    labelKey: 'perps.home.tabs.crypto',
    icon: IconName.Coin,
  },
  {
    category: 'stocks',
    labelKey: 'perps.home.tabs.stocks',
    icon: IconName.Graph,
  },
  {
    category: 'commodities',
    labelKey: 'perps.home.tabs.commodities',
    icon: IconName.MoneyBag,
  },
  {
    category: 'forex',
    labelKey: 'perps.home.tabs.forex',
    icon: IconName.Global,
  },
];

const PerpsProductPills: React.FC<PerpsProductPillsProps> = ({
  source,
  transactionActiveAbTests,
  testID = 'perps-product-pills',
}) => {
  const { styles } = useStyles(styleSheet, {});
  const perpsNavigation = usePerpsNavigation();
  const { track } = usePerpsEventTracking();

  const handlePillPress = useCallback(
    (category: Exclude<MarketTypeFilter, 'all'>, index: number) => {
      track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
        [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
          PERPS_EVENT_VALUE.INTERACTION_TYPE.BUTTON_CLICKED,
        [PERPS_EVENT_PROPERTY.BUTTON_CLICKED]: `product_pill_tapped`,
        [PERPS_EVENT_PROPERTY.BUTTON_LOCATION]:
          PERPS_EVENT_VALUE.BUTTON_LOCATION.PERPS_HOME,
        [PERPS_EVENT_PROPERTY.SOURCE]: source,
        product: category,
        pill_position: index,
      });

      perpsNavigation.navigateToMarketList({
        defaultMarketTypeFilter: category,
        source: 'perps_home__product_pill',
        fromHome: true,
        button_clicked: `product_pill_tapped`,
        button_location: PERPS_EVENT_VALUE.BUTTON_LOCATION.PERPS_HOME,
        ...(transactionActiveAbTests?.length
          ? { transactionActiveAbTests }
          : {}),
      });
    },
    [track, perpsNavigation, source, transactionActiveAbTests],
  );

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      style={styles.container}
      testID={testID}
    >
      {PRODUCT_PILLS.map((pill, index) => (
        <Pressable
          key={pill.category}
          style={({ pressed }) => [styles.pill, pressed && styles.pillPressed]}
          onPress={() => handlePillPress(pill.category, index)}
          testID={`${testID}-${pill.category}`}
          accessibilityRole="button"
          accessibilityLabel={strings(pill.labelKey)}
        >
          <Icon name={pill.icon} size={IconSize.Sm} color={IconColor.Default} />
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            style={styles.pillLabel}
          >
            {strings(pill.labelKey)}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
};

export default PerpsProductPills;
