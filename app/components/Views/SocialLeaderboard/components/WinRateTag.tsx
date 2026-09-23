import {
  IconName,
  Tag,
  TagSeverity,
} from '@metamask/design-system-react-native';
import React from 'react';
import { strings } from '../../../../../locales/i18n';
import { markMocked } from '../SocialV1View/feed/mockMarker';
import { formatPercent } from '../utils/formatters';

/** At or above this win rate the tag switches to the highlighted treatment. */
const ELITE_WIN_RATE_PERCENT = 90;

/** Stable handle on the trophy, which only the elite treatment renders. */
export const WIN_RATE_TAG_TROPHY_TEST_ID = 'win-rate-tag-trophy';

export interface WinRateTagProps {
  /**
   * Whole percent (e.g. `92` for 92%). Nullish renders nothing rather than a
   * placeholder -- a trader with no win-rate data has no badge to show.
   */
  winRatePercent?: number | null;
  /**
   * Appends the mock marker. The V1 feed invents win rates (a feed row carries
   * no trader stats), while the leaderboard reads real ones -- so the marker is
   * a caller's concern rather than something this tag can infer.
   */
  isMocked?: boolean;
  testID?: string;
}

/**
 * WinRateTag -- the `92% WR` badge shown next to a trader's name.
 *
 * Elite win rates get the trophy + warning treatment; everything else stays
 * neutral so the highlight keeps its meaning. Shared by the Social V1
 * leaderboard rows and the V1 feed post header so both surfaces agree on the
 * threshold, the copy and the precision.
 */
const WinRateTag: React.FC<WinRateTagProps> = ({
  winRatePercent,
  isMocked = false,
  testID,
}) => {
  if (winRatePercent == null) {
    return null;
  }

  const isElite = winRatePercent >= ELITE_WIN_RATE_PERCENT;
  const label = strings('social_leaderboard.win_rate_tag', {
    winRate: formatPercent(winRatePercent, { showSign: false, decimals: 0 }),
  });

  return (
    <Tag
      severity={isElite ? TagSeverity.Warning : TagSeverity.Neutral}
      startIconName={isElite ? IconName.Trophy : undefined}
      startIconProps={
        isElite ? { testID: WIN_RATE_TAG_TROPHY_TEST_ID } : undefined
      }
      twClassName="shrink-0"
      testID={testID}
    >
      {isMocked ? markMocked(label) : label}
    </Tag>
  );
};

export default WinRateTag;
