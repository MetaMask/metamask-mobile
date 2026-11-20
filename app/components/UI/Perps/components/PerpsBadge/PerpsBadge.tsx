import React from 'react';
import { strings } from '../../../../../../locales/i18n';
import type { BadgeType, PerpsBadgeProps } from './PerpsBadge.types';
import {
  Box,
  FontWeight,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTheme } from '../../../../../util/theme';

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
  const { colors } = useTheme();
  const badgeStyles: Partial<
    Record<BadgeType, { background: string; text: string; border?: string }>
  > = {
    experimental: {
      background: colors.primary.muted,
      text: colors.primary.default,
    },
    dex: {
      background: colors.background.default,
      text: colors.text.alternative,
      border: colors.border.default,
    },
    stock: {
      background: colors.info.muted,
      text: colors.info.default,
    },
    commodity: {
      background: colors.success.muted,
      text: colors.success.default,
    },
    crypto: {
      background: colors.primary.muted,
      text: colors.primary.default,
    },
    forex: {
      background: colors.error.muted,
      text: colors.error.default,
    },
  };
  const badgeStyle = badgeStyles[type] ?? {
    background: colors.background.alternative,
    text: colors.text.default,
    border: undefined,
  };
  const badgeContainerStyle = {
    backgroundColor: badgeStyle.background,
    borderColor: badgeStyle.border,
    borderWidth: badgeStyle.border ? 1 : 0,
  };
  const badgeTextStyle = { color: badgeStyle.text };

  // Get i18n label for the badge type
  const label = customLabel || strings(`perps.market.badge.${type}` as const);

  return (
    <Box
      twClassName="mr-1 self-start rounded px-2 py-1"
      style={badgeContainerStyle}
      testID={testID}
    >
      <Text
        variant={TextVariant.BodyXs}
        fontWeight={FontWeight.Medium}
        style={badgeTextStyle}
      >
        {label}
      </Text>
    </Box>
  );
};

export default PerpsBadge;
