import { Box } from '@metamask/design-system-react-native';
import React, { useEffect, useState } from 'react';
import TopTradersView from '../TopTradersView';
import {
  SOCIAL_V1_TRADER_ROW_HEIGHT,
  SocialV1TraderRow,
  SocialV1TraderRowSkeleton,
} from '../TopTradersView/components';
import type { SocialTabPageHandle } from '../shared/tabPageScroll';
import SubnavPills from './SubnavPills';
import { SOCIAL_SHELL_TAB_CONFIG } from './tabConfig';
import type { LeaderboardSubnavId } from './types';

const LEADERBOARD_CONFIG = SOCIAL_SHELL_TAB_CONFIG.leaderboard;

export interface LeaderboardShellTabPageProps {
  /**
   * Whether this page is the visible tab. The pager mounts every page up
   * front, so the list is held back until the tab is first opened — otherwise
   * opening the home would fetch the leaderboard and emit its screen-viewed
   * event while the user is still on Feed. Defaults to `true` for standalone
   * use.
   */
  isActive?: boolean;
  /**
   * Scroll handler forwarded by the tabs container so the page's scroll drives
   * the parent's collapsing title.
   */
  onScroll?: React.ComponentProps<typeof TopTradersView>['onScroll'];
  /**
   * Lets the tabs container drive this page's scroll offset so the collapsing
   * title stays put when the user switches tabs.
   */
  pageRef?: React.Ref<SocialTabPageHandle>;
  containerTestID: string;
}

/**
 * Leaderboard tab page for Social Bundle V1: the leaderboard subnav pinned
 * above the ranked trader list shared with the legacy home. The list covers
 * every position type; the per-subnav rankings (top perps, KOLs) land in later
 * tickets, so until then the pills only carry their own selected state.
 */
const LeaderboardShellTabPage: React.FC<LeaderboardShellTabPageProps> = ({
  isActive = true,
  onScroll,
  pageRef,
  containerTestID,
}) => {
  const [selectedSubnav, setSelectedSubnav] = useState<LeaderboardSubnavId>(
    LEADERBOARD_CONFIG.defaultSubnav,
  );
  // Latches on: once the list has loaded, leaving the tab must not tear it down
  // and refetch on the way back.
  const [hasBeenActive, setHasBeenActive] = useState(isActive);

  useEffect(() => {
    if (isActive) {
      setHasBeenActive(true);
    }
  }, [isActive]);

  return (
    <Box twClassName="flex-1 bg-default" testID={containerTestID}>
      <SubnavPills
        items={LEADERBOARD_CONFIG.subnav}
        value={selectedSubnav}
        onChange={setSelectedSubnav}
      />
      {hasBeenActive && (
        <TopTradersView
          pinnedTypeFilter="all"
          RowComponent={SocialV1TraderRow}
          SkeletonComponent={SocialV1TraderRowSkeleton}
          rowHeight={SOCIAL_V1_TRADER_ROW_HEIGHT}
          onScroll={onScroll}
          pageRef={pageRef}
        />
      )}
    </Box>
  );
};

export default LeaderboardShellTabPage;
