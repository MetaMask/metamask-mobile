import React from 'react';
import {
  Box,
  Text,
  TextVariant,
  FontWeight,
  BoxFlexDirection,
  BoxAlignItems,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import type { PerpDirection } from '../utils/perp';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import PerpsLeverage from '../../../UI/Perps/components/PerpsLeverage/PerpsLeverage';

export interface PerpBadgesProps {
  direction: PerpDirection;
  /** Leverage multiplier (e.g. `10` → "10x"). Hidden when null/undefined. */
  leverage?: number | null;
  testID?: string;
}

/**
 * Renders the perp metadata badges shown next to a token symbol: an optional
 * leverage pill (e.g. "10x") and a direction pill (LONG green / SHORT red).
 * Used across the trader profile position list, the position detail header,
 * and individual trade rows so perp positions read consistently.
 */
const PerpBadges: React.FC<PerpBadgesProps> = ({
  direction,
  leverage,
  testID,
}) => {
  const isLong = direction === 'long';
  const directionLabel = strings(
    isLong
      ? 'social_leaderboard.trader_position.long'
      : 'social_leaderboard.trader_position.short',
  ).toUpperCase();

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      gap={1}
      testID={testID}
    >
      {leverage ? (
        <PerpsLeverage
          maxLeverage={`${leverage}x`}
          testID={testID ? `${testID}-leverage` : undefined}
        />
      ) : null}
      <Box twClassName="bg-muted rounded-md px-1.5 self-center">
        <Text
          variant={TextVariant.BodyXs}
          fontWeight={FontWeight.Medium}
          twClassName={isLong ? 'text-success-default' : 'text-error-default'}
        >
          {directionLabel}
        </Text>
      </Box>
    </Box>
  );
};

export default PerpBadges;
