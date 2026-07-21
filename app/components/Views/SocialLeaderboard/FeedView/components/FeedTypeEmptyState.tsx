import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React from 'react';
import { ActivityIndicator } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import { useTheme } from '../../../../../util/theme';
import type { FeedTypeFilter } from '../types';
import { FeedViewSelectorsIDs } from '../FeedView.testIds';

export interface FeedTypeEmptyStateProps {
  /** Active type filter (tokens or perps). */
  typeFilter: Exclude<FeedTypeFilter, 'all'>;
  /** True when another page can be requested. */
  hasNextPage: boolean;
  /** True while a follow-up page is being fetched. */
  isFetchingNextPage: boolean;
  /** Request the next page from the feed. */
  onLoadMore: () => void;
}

/**
 * Empty state when the feed has loaded items but none match the selected type
 * filter. Offers a Load-more affordance while pages remain, then settles on a
 * terminal no-results message once the feed is exhausted.
 */
const FeedTypeEmptyState: React.FC<FeedTypeEmptyStateProps> = ({
  typeFilter,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
}) => {
  const { colors } = useTheme();
  const titleKey =
    typeFilter === 'tokens'
      ? 'social_leaderboard.feed.empty_type.tokens.title'
      : 'social_leaderboard.feed.empty_type.perps.title';

  const renderLoadMoreAction = () => {
    if (!hasNextPage) {
      return null;
    }
    if (isFetchingNextPage) {
      return <ActivityIndicator size="small" color={colors.icon.default} />;
    }
    return (
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Sm}
        onPress={onLoadMore}
        twClassName="self-center"
        testID={FeedViewSelectorsIDs.LOAD_MORE_BUTTON}
      >
        {strings('social_leaderboard.feed.load_more')}
      </Button>
    );
  };

  return (
    <Box
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Center}
      twClassName="flex-1 px-8 py-16 gap-3"
      testID={FeedViewSelectorsIDs.TYPE_EMPTY_STATE}
    >
      <Icon
        name={IconName.Activity}
        size={IconSize.Xl}
        color={IconColor.IconMuted}
      />
      <Text
        variant={TextVariant.HeadingSm}
        fontWeight={FontWeight.Medium}
        color={TextColor.TextDefault}
        twClassName="text-center"
      >
        {strings(titleKey)}
      </Text>
      <Text
        variant={TextVariant.BodyMd}
        color={TextColor.TextAlternative}
        twClassName="text-center"
      >
        {strings('social_leaderboard.feed.empty_type.description')}
      </Text>
      {renderLoadMoreAction()}
    </Box>
  );
};

export default FeedTypeEmptyState;
