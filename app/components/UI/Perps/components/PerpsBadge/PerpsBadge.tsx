import React from 'react';
import { View } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks';
import { styleSheet } from './PerpsBadge.styles';
import type { PerpsBadgeProps } from './PerpsBadge.types';

/**
 * PerpsBadge - Reusable badge component for Perps markets
 *
 * Displays different badge types:
 * - experimental: HIP-3 markets (blue)
 * - equity: Stock markets (orange)
 * - commodity: Commodity markets (green)
 * - crypto: Cryptocurrency markets (info blue)
 * - forex: Foreign exchange markets (red)
 */
const PerpsBadge: React.FC<PerpsBadgeProps> = ({
  type,
  customLabel,
  testID,
}) => {
  const { styles } = useStyles(styleSheet, { type });

  // Get i18n label for the badge type
  const label = customLabel || strings(`perps.market.badge.${type}` as const);

  return (
    <View style={styles.badge} testID={testID}>
      <Text variant={TextVariant.BodyXS} style={styles.badgeText}>
        {label}
      </Text>
    </View>
  );
};

export default PerpsBadge;
