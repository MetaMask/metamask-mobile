import type { Position } from '@metamask/social-controllers';
import { isPerpPosition } from '../../../../UI/SocialFeed/utils/perp';
import { getPositionFlagLabelKey } from '../../TraderProfileView/utils/positionFlags';
import type { ProfileAssetFilter } from './splitPositionsByType';

/**
 * True when the server flagged this position out of P&L.
 *
 * Uses the same flag preference as the row label (insider, then developer,
 * then any other non-empty `flags` list). An empty or missing list stays
 * in the counted group.
 */
export const isUncountedPosition = (position: Position): boolean =>
  getPositionFlagLabelKey(position) != null;

/**
 * Splits positions into rows that count toward P&L and rows that do not.
 *
 * Both arrays keep the input order. Callers render `uncounted` after every
 * other section, so a sort applied before this split cannot lift flagged
 * rows back into the main list, and the flagged group is not re-sorted.
 *
 * @param positions - Already ordered positions for one Open or Closed list.
 * @returns Counted rows, then flagged rows, each in input order.
 */
export const partitionUncountedPositions = (
  positions: Position[],
): { counted: Position[]; uncounted: Position[] } => {
  const counted: Position[] = [];
  const uncounted: Position[] = [];

  positions.forEach((position) => {
    if (isUncountedPosition(position)) {
      uncounted.push(position);
    } else {
      counted.push(position);
    }
  });

  return { counted, uncounted };
};

/**
 * Applies the profile All / Tokens / Perps filter without regrouping.
 *
 * Unlike `getFilteredPositionSections`, this keeps the incoming order so the
 * uncounted section does not sort tokens ahead of perps.
 *
 * @param positions - Rows already limited to one counted or uncounted group.
 * @param filter - Active asset filter.
 * @returns The subset that matches the filter, in input order.
 */
export const filterPositionsByAsset = (
  positions: Position[],
  filter: ProfileAssetFilter,
): Position[] => {
  if (filter === 'all') {
    return positions;
  }

  return positions.filter((position) => {
    const isPerp = isPerpPosition(position);
    return filter === 'perps' ? isPerp : !isPerp;
  });
};

/**
 * Flagged positions that the profile list would show for one tab and filter.
 *
 * @param positions - Open or closed positions in list order.
 * @param filter - Active asset filter.
 * @returns Flagged rows that survive the filter, in input order.
 */
export const listUncountedPositions = (
  positions: Position[],
  filter: ProfileAssetFilter,
): Position[] =>
  filterPositionsByAsset(
    partitionUncountedPositions(positions).uncounted,
    filter,
  );

export type UncountedNoteTab = 'open' | 'closed';

/**
 * Chooses which tab the P&L note counts and scrolls to.
 *
 * The note uses flagged rows that the positions list would show: the active
 * Open or Closed tab, after the asset filter. On Posts, where that list is
 * hidden, Open wins when it has flagged rows and Closed is the fallback.
 * The owner's profile does not show the flagged state, so the count stays 0.
 *
 * @param params.showFlaggedState - True on another trader's profile.
 * @param params.activeTab - Profile content tab, including Posts.
 * @param params.filter - All / Tokens / Perps filter shared by both lists.
 * @param params.openPositions - Open positions in list order.
 * @param params.closedPositions - Closed positions in list order.
 * @returns The tab to reveal and how many flagged rows it would show.
 */
export const resolveUncountedNoteTarget = (params: {
  showFlaggedState: boolean;
  activeTab: UncountedNoteTab | 'posts';
  filter: ProfileAssetFilter;
  openPositions: Position[];
  closedPositions: Position[];
}): { tab: UncountedNoteTab; count: number } => {
  if (!params.showFlaggedState) {
    return { tab: 'open', count: 0 };
  }

  const openCount = listUncountedPositions(
    params.openPositions,
    params.filter,
  ).length;
  const closedCount = listUncountedPositions(
    params.closedPositions,
    params.filter,
  ).length;

  if (params.activeTab === 'closed') {
    return { tab: 'closed', count: closedCount };
  }
  if (params.activeTab === 'open') {
    return { tab: 'open', count: openCount };
  }
  if (openCount > 0) {
    return { tab: 'open', count: openCount };
  }
  return { tab: 'closed', count: closedCount };
};
