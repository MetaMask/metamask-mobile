import {
  Box,
  BoxAlignItems,
  Button,
  ButtonVariant,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React from 'react';
import { Image } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import feedEmptyMegaphone from '../../../../../images/socialV1/post-trade-create-profile.png';
import { useOpenSocialPostComposer } from '../../../../Views/SocialLeaderboard/hooks/useOpenSocialPostComposer';

const ILLUSTRATION_SIZE = 64;

const FEED_EMPTY_TEST_ID = 'token-details-feed-empty';
const CREATE_POST_TEST_ID = 'token-details-feed-empty-create-post';

export interface TokenDetailsFeedEmptyStateProps {
  /** True when this wallet holds the token the feed is about. */
  hasBalance: boolean;
}

/**
 * Same megaphone PNG as `PostTradeShareBottomSheet`'s create-profile card
 * (`app/images/socialV1/post-trade-create-profile.png`), with `@2x`/`@3x`.
 */
const FeedEmptyMegaphone: React.FC = () => (
  <Box twClassName="mb-4">
    <Image
      source={feedEmptyMegaphone}
      resizeMode="contain"
      style={{ width: ILLUSTRATION_SIZE, height: ILLUSTRATION_SIZE }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  </Box>
);

/**
 * Empty token feed.
 *
 * Holding the token: invite a first post, with the create-post button. No
 * balance: invite them to post a trade. Buy stays on the page footer.
 *
 * `TabEmptyState` has no title and one 12px gap, so this composes the same
 * design-system Text and secondary Button with the feed spacing.
 */
const TokenDetailsFeedEmptyState: React.FC<TokenDetailsFeedEmptyStateProps> = ({
  hasBalance,
}) => {
  const { openComposer } = useOpenSocialPostComposer();

  return (
    <Box
      alignItems={BoxAlignItems.Center}
      twClassName="w-full px-8 py-12"
      testID={FEED_EMPTY_TEST_ID}
    >
      <FeedEmptyMegaphone />
      <Text
        variant={TextVariant.HeadingLg}
        color={TextColor.TextDefault}
        twClassName="text-center"
      >
        {strings(
          hasBalance
            ? 'token_details_v1.feed_tab.empty.has_balance_title'
            : 'token_details_v1.feed_tab.empty.no_balance_title',
        )}
      </Text>
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        color={TextColor.TextAlternative}
        twClassName="mt-1 text-center"
      >
        {strings('token_details_v1.feed_tab.empty.description')}
      </Text>
      {hasBalance ? (
        <Button
          variant={ButtonVariant.Secondary}
          onPress={() => openComposer()}
          twClassName="mt-4 self-center"
          testID={CREATE_POST_TEST_ID}
        >
          {strings('token_details_v1.feed_tab.empty.create_post')}
        </Button>
      ) : null}
    </Box>
  );
};

export default TokenDetailsFeedEmptyState;
