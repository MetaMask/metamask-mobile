import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import {
  Icon,
  IconColor,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import { useStyles } from '../../../../../../../component-library/hooks';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../../../component-library/components/Texts/Text';
import type { PerpsMarketListEmptyStateProps } from './PerpsMarketListEmptyState.types';
import styleSheet from './PerpsMarketListEmptyState.styles';

/**
 * PerpsMarketListEmptyState Component
 *
 * Shared "no results" state for the markets list: a search icon, a title,
 * a description, and an optional call-to-action button (e.g. to clear an
 * active search or filter).
 *
 * @example
 * ```tsx
 * <PerpsMarketListEmptyState
 *   containerTestID="no-results"
 *   title={strings('perps.no_markets_found')}
 *   description={strings('perps.no_markets_found_description')}
 *   ctaLabel={strings('perps.clear_filter')}
 *   onCtaPress={() => setMarketTypeFilter('all')}
 * />
 * ```
 */
const PerpsMarketListEmptyState: React.FC<PerpsMarketListEmptyStateProps> = ({
  containerTestID,
  title,
  description,
  ctaLabel,
  onCtaPress,
  ctaTestID,
}) => {
  const { styles } = useStyles(styleSheet, {});

  return (
    <View style={styles.container} testID={containerTestID}>
      <Icon
        name={IconName.Search}
        size={IconSize.Xl}
        color={IconColor.IconMuted}
        style={styles.icon}
      />
      <Text
        variant={TextVariant.HeadingSM}
        color={TextColor.Default}
        style={styles.title}
      >
        {title}
      </Text>
      <Text
        variant={TextVariant.BodyMD}
        color={TextColor.Alternative}
        style={styles.description}
      >
        {description}
      </Text>
      {ctaLabel && onCtaPress && (
        <TouchableOpacity
          style={styles.cta}
          onPress={onCtaPress}
          testID={ctaTestID}
          accessibilityRole="button"
        >
          <Text variant={TextVariant.BodyMD} color={TextColor.Primary}>
            {ctaLabel}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default PerpsMarketListEmptyState;
