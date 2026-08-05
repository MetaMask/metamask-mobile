import React from 'react';
import { View } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import { useStyles } from '../../../../../component-library/hooks';
import { styleSheet } from './PerpsBadge.styles';
import type { PerpsBadgeProps } from './PerpsBadge.types';
import { Text, TextVariant } from '@metamask/design-system-react-native';

/**
 * PerpsBadge - Reusable badge component for Perps markets
 *
 * Displays different badge types:
 * - experimental: HIP-3 markets (blue)
 * - stock: Stock markets (info blue)
 * - commodity: Commodity markets (green)
 * - crypto: Cryptocurrency markets (primary blue)
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
      <Text variant={TextVariant.BodyXs} style={styles.badgeText}>
        {label}
      </Text>
    </View>
  );
};

export default PerpsBadge;
