import React, { useCallback, useMemo, useState } from 'react';
import {
  Box,
  BoxAlignItems,
  Button,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import {
  getGroupedActivityListItemKey,
  type ActivityListItem,
  type GroupedActivityListItem,
} from '../../../../../util/activity-adapters';
import ActivityListDateHeader from '../../../ActivityListItemRow/ActivityListDateHeader';
import ActivityHeader from '../../../../Views/Asset/ActivityHeader';
import type { TokenDetailsRouteParams } from '../../constants/constants';

export const TOKEN_DETAILS_ACTIVITY_SECTION_TEST_ID =
  'token-details-overview-tab-activity';
export const TOKEN_DETAILS_ACTIVITY_SHOW_MORE_TEST_ID =
  'token-details-activity-show-more';

export const DEFAULT_INITIAL_VISIBLE_ROWS = 3;

export const ACTIVITY_EXPAND_STEP_ROWS = 5;

function useVisibleActivityRows(groupedItems: GroupedActivityListItem[]): {
  visibleItems: GroupedActivityListItem[];
  hasMore: boolean;
  handleShowMore: () => void;
} {
  const [visibleRowCount, setVisibleRowCount] = useState(
    DEFAULT_INITIAL_VISIBLE_ROWS,
  );

  const handleShowMore = useCallback(() => {
    setVisibleRowCount((prev) => prev + ACTIVITY_EXPAND_STEP_ROWS);
  }, []);

  const { visibleItems, hasMore } = useMemo(() => {
    const rowIndexes = groupedItems
      .map((item, index) => (item.type === 'item' ? index : -1))
      .filter((index) => index >= 0);
    const totalRowCount = rowIndexes.length;
    const hasHiddenRows = visibleRowCount < totalRowCount;
    const lastVisibleRowIndex = hasHiddenRows
      ? rowIndexes[visibleRowCount - 1]
      : -1;
    const visibleGroupedItems = hasHiddenRows
      ? groupedItems.slice(0, lastVisibleRowIndex + 1)
      : groupedItems;
    return { visibleItems: visibleGroupedItems, hasMore: hasHiddenRows };
  }, [groupedItems, visibleRowCount]);

  return { visibleItems, hasMore, handleShowMore };
}

export interface ActivityRowsProps {
  token: TokenDetailsRouteParams;
  groupedItems: GroupedActivityListItem[];
  renderItem: (info: {
    item: ActivityListItem;
    index: number;
  }) => React.ReactNode;
  showSectionRule?: boolean;
  footer?: React.ReactNode;
}

const ActivityRows = ({
  token,
  groupedItems,
  renderItem,
  showSectionRule,
  footer,
}: ActivityRowsProps): React.ReactElement => {
  const { visibleItems, hasMore, handleShowMore } =
    useVisibleActivityRows(groupedItems);

  return (
    <Box
      testID={TOKEN_DETAILS_ACTIVITY_SECTION_TEST_ID}
      twClassName={
        showSectionRule ? 'mt-6 border-t border-muted pt-6' : undefined
      }
    >
      <ActivityHeader
        asset={{ ...token, hasBalanceError: token.hasBalanceError ?? false }}
      />
      {visibleItems.map((item, index) => (
        <React.Fragment key={getGroupedActivityListItemKey(item, index)}>
          {item.type === 'pending-header' ? (
            <ActivityListDateHeader label={strings('transaction.pending')} />
          ) : item.type === 'date-header' ? (
            <ActivityListDateHeader timestamp={item.date} />
          ) : (
            renderItem({ item: item.item, index })
          )}
        </React.Fragment>
      ))}
      {hasMore && (
        <Box alignItems={BoxAlignItems.Center} twClassName="pt-2 px-4">
          <Button
            variant={ButtonVariant.Tertiary}
            onPress={handleShowMore}
            testID={TOKEN_DETAILS_ACTIVITY_SHOW_MORE_TEST_ID}
          >
            {strings('homepage.sections.view_more')}
          </Button>
        </Box>
      )}
      {footer}
    </Box>
  );
};

export default ActivityRows;
