import React, { useMemo } from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../../locales/i18n';
import { STAT_EMPTY_VALUE } from '../../../../constants/tokenStats';
import { formatPercent } from '../../../../utils/statBarFormat';
import { SecurityTabSelectors } from '../SecurityTab.testIds';

/**
 * Fill and track share the primary ramp rather than pairing a colour against
 * gray, so the bar reads as one split quantity instead of a value sitting on an
 * empty background.
 */
const TOP_TEN_SWATCH = 'bg-primary-default';
const REMAINING_SWATCH = 'bg-primary-muted';

/** Matches the Top 10 stat row, which repeats this figure three rows down. */
const LEGEND_DECIMALS = 1;

const LegendEntry = ({
  swatchTwClassName,
  label,
  value,
  testID,
}: {
  swatchTwClassName: string;
  label: string;
  value: string | null;
  testID: string;
}) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    twClassName="shrink gap-1.5"
    testID={testID}
  >
    <Box twClassName={`h-2 w-2 rounded-full ${swatchTwClassName}`} />
    <Text
      variant={TextVariant.BodySm}
      color={TextColor.TextDefault}
      numberOfLines={1}
    >
      {`${label} ${value ?? STAT_EMPTY_VALUE}`}
    </Text>
  </Box>
);

export interface HoldersDistributionBarProps {
  /**
   * Share held by the top ten wallets, as a raw number in the range 0-100.
   *
   * `null` renders nothing at all. A zero-width bar would read as "0%
   * concentration", which is a reassuring claim rather than an absence.
   */
  topTenPercentage: number | null;
}

/**
 * Two-tone bar splitting supply between the top ten wallets and everyone else.
 *
 * The legend repeats both figures as text because the bar alone encodes the
 * split only by length, which is unreadable to a screen reader and hard to
 * judge at a glance for the mid-range values that matter most. Label and value
 * sit in one `Text` so they wrap as a unit rather than leaving a percentage
 * stranded on its own line.
 *
 * The one component on this tab that formats its own values, where every other
 * receives strings. It takes the raw share because it needs that number to
 * size the fill, and deriving the two labels from the same number is what
 * makes a bar whose length contradicts its legend unrepresentable. The guard
 * below also runs before the subtraction, so `100 - x` needs no null test.
 */
export const HoldersDistributionBar: React.FC<HoldersDistributionBarProps> = ({
  topTenPercentage,
}) => {
  const fillStyle = useMemo(
    () => ({ width: `${topTenPercentage ?? 0}%` as `${number}%` }),
    [topTenPercentage],
  );

  if (topTenPercentage === null) {
    return null;
  }

  return (
    <Box twClassName="gap-3" testID={SecurityTabSelectors.DISTRIBUTION_BAR}>
      <Box
        flexDirection={BoxFlexDirection.Row}
        twClassName={`h-2.5 overflow-hidden rounded-full ${REMAINING_SWATCH}`}
      >
        <Box
          twClassName={`h-full rounded-full ${TOP_TEN_SWATCH}`}
          style={fillStyle}
          testID={SecurityTabSelectors.DISTRIBUTION_BAR_FILL}
        />
      </Box>
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="gap-5"
      >
        <LegendEntry
          swatchTwClassName={TOP_TEN_SWATCH}
          label={strings('token_details_v1.security_tab.holders.top_ten')}
          value={formatPercent(topTenPercentage, LEGEND_DECIMALS)}
          testID={SecurityTabSelectors.LEGEND_TOP_TEN}
        />
        <LegendEntry
          swatchTwClassName={REMAINING_SWATCH}
          label={strings('token_details_v1.security_tab.holders.remaining')}
          value={formatPercent(100 - topTenPercentage, LEGEND_DECIMALS)}
          testID={SecurityTabSelectors.LEGEND_REMAINING}
        />
      </Box>
    </Box>
  );
};

export default HoldersDistributionBar;
