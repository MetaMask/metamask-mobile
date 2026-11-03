import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView } from 'react-native';
import {
  Box,
  FontWeight,
  TabEmptyState,
  TextColor,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { Position } from '@metamask/social-controllers';
import { strings } from '../../../../../../locales/i18n';
import TabsBar from '../../../../../component-library/components-temp/Tabs/TabsBar';
import type { TabItem } from '../../../../../component-library/components-temp/Tabs/TabsBar/TabsBar.types';
import type { SocialV1FeedAuthor } from '../../../../UI/SocialFeed/types';
import TradeRow from '../../TraderPositionView/components/TradeRow';
import {
  getPositionPosts,
  getPositionTransactions,
} from '../utils/positionPosts';
import { PositionDetailsSheetSelectorsIDs } from '../PositionDetailsSheet.testIds';
import PositionSheetPostRow from './PositionSheetPostRow';

/** About four rows; longer lists scroll inside the sheet. */
export const TAB_BODY_MAX_HEIGHT = 288;

const POSTS_TAB_INDEX = 0;

interface PositionSheetTabsProps {
  position: Position | undefined;
  author: SocialV1FeedAuthor;
}

/** Posts (author comments) and Transactions (fills) for one position. */
const PositionSheetTabs: React.FC<PositionSheetTabsProps> = ({
  position,
  author,
}) => {
  const tw = useTailwind();
  const [activeIndex, setActiveIndex] = useState(POSTS_TAB_INDEX);
  const posts = useMemo(() => getPositionPosts(position), [position]);
  const transactions = useMemo(
    () => getPositionTransactions(position),
    [position],
  );

  const tabs = useMemo<TabItem[]>(
    () => [
      {
        key: 'posts',
        label: strings('social_leaderboard.position_sheet.posts_tab', {
          count: posts.length,
        }),
        content: null,
        testID: PositionDetailsSheetSelectorsIDs.POSTS_TAB,
      },
      {
        key: 'transactions',
        label: strings('social_leaderboard.position_sheet.transactions_tab', {
          count: transactions.length,
        }),
        content: null,
        testID: PositionDetailsSheetSelectorsIDs.TRANSACTIONS_TAB,
      },
    ],
    [posts.length, transactions.length],
  );

  const handleTabPress = useCallback((index: number) => {
    setActiveIndex(index);
  }, []);

  const isPostsTab = activeIndex === POSTS_TAB_INDEX;

  return (
    <Box testID={PositionDetailsSheetSelectorsIDs.TABS}>
      <TabsBar
        tabs={tabs}
        activeIndex={activeIndex}
        onTabPress={handleTabPress}
        twClassName="px-4"
      />
      <ScrollView
        style={tw.style({ maxHeight: TAB_BODY_MAX_HEIGHT })}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        testID={
          isPostsTab
            ? PositionDetailsSheetSelectorsIDs.POSTS_LIST
            : PositionDetailsSheetSelectorsIDs.TRANSACTIONS_LIST
        }
      >
        {isPostsTab ? (
          posts.length > 0 ? (
            posts.map((post) => (
              <PositionSheetPostRow
                key={post.uid}
                post={post}
                author={author}
              />
            ))
          ) : (
            <Box twClassName="items-center px-4 py-6">
              <TabEmptyState
                description={strings(
                  'social_leaderboard.position_sheet.no_posts',
                )}
                descriptionProps={{
                  color: TextColor.TextAlternative,
                  fontWeight: FontWeight.Medium,
                }}
                twClassName="bg-transparent"
                testID={PositionDetailsSheetSelectorsIDs.POSTS_EMPTY}
              />
            </Box>
          )
        ) : (
          transactions.map((trade, index) => (
            <TradeRow
              key={`${trade.transactionHash}-${trade.timestamp}-${index}`}
              trade={trade}
              action={trade.action}
              traderImageUrl={author.avatarUri ?? undefined}
              traderAddress={author.id}
            />
          ))
        )}
      </ScrollView>
    </Box>
  );
};

export default PositionSheetTabs;
