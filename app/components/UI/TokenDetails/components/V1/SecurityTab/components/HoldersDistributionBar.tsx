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
import { SECURITY_EMPTY_VALUE } from '../SecurityTab.constants';
import { SecurityTabSelectors } from '../SecurityTab.testIds';

/**
 * Fill and track share the primary ramp rather than pairing a colour against
 * gray, so the bar reads as one split quantity instead of a value sitting on an
 * empty background.
 */
const TOP_TEN_SWATCH = 'bg-primary-default';
const REMAINING_SWATCH = 'bg-primary-muted';

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
      {`${label} ${value ?? SECURITY_EMPTY_VALUE}`}
    </Text>
  </Box>
);

export interface HoldersDistributionBarProps {
  /**
   * Share held by the top ten wallets, 0-100, used only to size the fill.
   *
   * `null` renders nothing at all. A zero-width bar would read as "0%
   * concentration", which is a reassuring claim rather than an absence.
   */
  fillPercentage: number | null;
  /** Already-formatted top-ten share, e.g. `18.4%`. */
  topTenPercentage: string | null;
  /** Already-formatted share held by everyone else, e.g. `81.6%`. */
  remainingPercentage: string | null;
}

/**
 * Two-tone bar splitting supply between the top ten wallets and everyone else.
 *
 * The legend repeats both figures as text because the bar alone encodes the
 * split only by length, which is unreadable to a screen reader and hard to
 * judge at a glance for the mid-range values that matter most. Label and value
 * sit in one `Text` so they wrap as a unit rather than leaving a percentage
 * stranded on its own line.
 */
export const HoldersDistributionBar: React.FC<HoldersDistributionBarProps> = ({
  fillPercentage,
  topTenPercentage,
  remainingPercentage,
}) => {
  const fillStyle = useMemo(
    () => ({ width: `${fillPercentage ?? 0}%` as `${number}%` }),
    [fillPercentage],
  );

  if (fillPercentage === null) {
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
          value={topTenPercentage}
          testID={SecurityTabSelectors.LEGEND_TOP_TEN}
        />
        <LegendEntry
          swatchTwClassName={REMAINING_SWATCH}
          label={strings('token_details_v1.security_tab.holders.remaining')}
          value={remainingPercentage}
          testID={SecurityTabSelectors.LEGEND_REMAINING}
        />
      </Box>
    </Box>
  );
};

export default HoldersDistributionBar;
