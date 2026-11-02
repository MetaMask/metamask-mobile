import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  ButtonIcon,
  ButtonIconSize,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, { useMemo } from 'react';
import { Pressable } from 'react-native';
import { strings } from '../../../../../locales/i18n';
import TraderAvatar from './TraderAvatar';
import { MOCK_MARKER } from '../mockMarker';
import { useSocialFeedSurface } from '../SocialFeedSurface';
import type { SocialV1FeedAuthor } from '../types';
import RotatingTraderStat from './RotatingTraderStat';
import { buildTraderStatLabels } from '../utils/traderStats';
import { formatFeedPostAge } from '../utils/formatters';
import {
  SocialTraderIdentityRowSelectorsIDs,
  type SocialTraderIdentityRowTestIds,
} from './SocialTraderIdentityRow.testIds';

/** Matches `AvatarAccountSize.Lg`. */
const AVATAR_SIZE = 40;

export interface SocialTraderIdentityRowProps {
  author: SocialV1FeedAuthor;
  handle: string;
  imageUrl?: string | null;
  timestampMs: number;
  recyclingKey: string;
  onMorePress: () => void;
  onIdentityPress?: () => void;
  /**
   * Wall-clock instant for the relative timestamp. Defaults to `Date.now()`.
   */
  now?: number;
  testIDs?: SocialTraderIdentityRowTestIds;
  twClassName?: string;
  /** Post content, stacked under the header and aligned with the handle. */
  children?: React.ReactNode;
}

/**
 * Shared trader identity chrome for Social V1: the avatar in a left gutter,
 * then a column with the handle, invented verified badge, relative age,
 * rotating stat line and overflow, followed by any content passed as children.
 */
const SocialTraderIdentityRow: React.FC<SocialTraderIdentityRowProps> = ({
  author,
  handle,
  imageUrl,
  timestampMs,
  recyclingKey,
  onMorePress,
  onIdentityPress,
  now,
  testIDs,
  twClassName,
  children,
}) => {
  const tw = useTailwind();
  const { showMockedFields } = useSocialFeedSurface();
  const statLabels = useMemo(() => buildTraderStatLabels(author), [author]);

  const avatar = (
    <TraderAvatar
      imageUrl={imageUrl}
      // Profile id seeds the Maskicon. Ids that do not start with `0x`
      // are hashed in full, so each trader stays distinct once wallet
      // addresses leave the feed payload.
      address={author.id}
      size={AVATAR_SIZE}
      recyclingKey={recyclingKey}
      testID={testIDs?.avatar ?? SocialTraderIdentityRowSelectorsIDs.AVATAR}
    />
  );

  const identity = (
    <Box twClassName="min-w-0">
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        gap={2}
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={1}
          twClassName="shrink min-w-0"
        >
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Bold}
            color={TextColor.TextDefault}
            numberOfLines={1}
            twClassName="shrink"
            testID={
              testIDs?.handle ?? SocialTraderIdentityRowSelectorsIDs.HANDLE
            }
          >
            {handle}
          </Text>
          {/* Nothing reports verification yet, so the badge is invented and
              only shown on surfaces that opt into mocked fields. */}
          {showMockedFields ? (
            <Icon
              name={IconName.VerifiedFilled}
              size={IconSize.Sm}
              twClassName="text-info-default shrink-0"
              testID={
                testIDs?.verifiedBadge ??
                SocialTraderIdentityRowSelectorsIDs.VERIFIED_BADGE
              }
            />
          ) : null}
        </Box>
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={1}
          twClassName="shrink-0"
        >
          <Text
            variant={TextVariant.BodyXs}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextMuted}
            testID={
              testIDs?.timestamp ??
              SocialTraderIdentityRowSelectorsIDs.TIMESTAMP
            }
          >
            {formatFeedPostAge(timestampMs, now)}
          </Text>
          {/* TODO(social): remove this temporary mock marker.
              Nothing reports verification yet, so the badge above is invented.
              The asterisk sits after the timestamp to flag that as mock data.
              Delete this block once a real verification signal exists. */}
          {showMockedFields ? (
            <Text
              variant={TextVariant.BodyXs}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextMuted}
              testID={
                testIDs?.mockMarker ??
                SocialTraderIdentityRowSelectorsIDs.MOCK_MARKER
              }
            >
              {MOCK_MARKER}
            </Text>
          ) : null}
        </Box>
      </Box>
      <RotatingTraderStat
        labels={statLabels}
        testID={
          testIDs?.traderStat ?? SocialTraderIdentityRowSelectorsIDs.TRADER_STAT
        }
      />
    </Box>
  );

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Start}
      gap={2}
      twClassName={twClassName}
      testID={
        testIDs?.container ?? SocialTraderIdentityRowSelectorsIDs.CONTAINER
      }
    >
      {onIdentityPress ? (
        <Pressable
          onPress={onIdentityPress}
          accessibilityRole="button"
          accessibilityLabel={handle}
        >
          {avatar}
        </Pressable>
      ) : (
        avatar
      )}
      <Box twClassName="flex-1 min-w-0" gap={2}>
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Start}
          gap={2}
        >
          {onIdentityPress ? (
            <Pressable
              onPress={onIdentityPress}
              accessibilityRole="button"
              testID={testIDs?.identityPress}
              style={tw.style('flex-1 min-w-0')}
            >
              {identity}
            </Pressable>
          ) : (
            <Box twClassName="flex-1 min-w-0">{identity}</Box>
          )}
          <ButtonIcon
            iconName={IconName.MoreHorizontal}
            iconProps={{ color: IconColor.IconAlternative }}
            size={ButtonIconSize.Sm}
            onPress={onMorePress}
            accessibilityLabel={strings(
              'social_leaderboard.entry_options.title',
            )}
            twClassName="shrink-0"
            testID={testIDs?.more ?? SocialTraderIdentityRowSelectorsIDs.MORE}
          />
        </Box>
        {children}
      </Box>
    </Box>
  );
};

export default SocialTraderIdentityRow;
