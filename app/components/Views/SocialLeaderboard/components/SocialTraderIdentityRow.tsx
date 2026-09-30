import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  ButtonIcon,
  ButtonIconSize,
  FontWeight,
  Icon,
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
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import TraderAvatar from '../../Homepage/Sections/TopTraders/components/TraderAvatar';
import { MOCK_MARKER } from '../SocialV1View/feed/mockMarker';
import type { SocialV1FeedAuthor } from '../SocialV1View/feed/types';
import RotatingTraderStat from '../SocialV1View/feed/components/RotatingTraderStat';
import {
  buildTraderStatLabels,
  resolveTraderCohort,
  traderCohortEmoji,
} from '../SocialV1View/feed/utils/traderStats';
import { formatFeedPostAge } from '../utils/formatters';
import {
  SocialTraderIdentityRowSelectorsIDs,
  type SocialTraderIdentityRowTestIds,
} from './SocialTraderIdentityRow.testIds';

/** Matches the previous `h-8 w-8` author image. */
const AVATAR_SIZE = 32;

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
}

/**
 * Shared trader identity chrome for Social V1: avatar, handle, invented
 * verified badge, cohort emoji, relative age, rotating stat line, overflow.
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
}) => {
  const tw = useTailwind();
  const statLabels = useMemo(() => buildTraderStatLabels(author), [author]);
  const cohortEmoji = traderCohortEmoji(resolveTraderCohort(author.pnl30d));

  const identity = (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      gap={2}
      twClassName="flex-1 min-w-0"
    >
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
      {/* The name row and the stat line share a column so the stats sit
          under the name rather than under the avatar. */}
      <Box twClassName="flex-1 min-w-0 overflow-hidden">
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={1}
        >
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextDefault}
            numberOfLines={1}
            twClassName="shrink"
            testID={
              testIDs?.handle ?? SocialTraderIdentityRowSelectorsIDs.HANDLE
            }
          >
            {handle}
          </Text>
          {/* Nothing reports verification yet, so the badge is invented
              and carries the mock marker every fabricated value does. */}
          <Icon
            name={IconName.VerifiedFilled}
            size={IconSize.Sm}
            twClassName="text-info-default shrink-0"
            testID={
              testIDs?.verifiedBadge ??
              SocialTraderIdentityRowSelectorsIDs.VERIFIED_BADGE
            }
          />
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextMuted}
            twClassName="shrink-0"
          >
            {MOCK_MARKER}
          </Text>
          {cohortEmoji ? (
            <Text
              variant={TextVariant.BodySm}
              twClassName="shrink-0"
              testID={
                testIDs?.cohort ?? SocialTraderIdentityRowSelectorsIDs.COHORT
              }
            >
              {cohortEmoji}
            </Text>
          ) : null}
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextMuted}
            twClassName="shrink-0"
            testID={
              testIDs?.timestamp ??
              SocialTraderIdentityRowSelectorsIDs.TIMESTAMP
            }
          >
            {formatFeedPostAge(timestampMs, now)}
          </Text>
        </Box>
        <RotatingTraderStat
          labels={statLabels}
          testID={
            testIDs?.traderStat ??
            SocialTraderIdentityRowSelectorsIDs.TRADER_STAT
          }
        />
      </Box>
    </Box>
  );

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
      twClassName={twClassName}
      testID={
        testIDs?.container ?? SocialTraderIdentityRowSelectorsIDs.CONTAINER
      }
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
        identity
      )}
      <ButtonIcon
        iconName={IconName.MoreHorizontal}
        size={ButtonIconSize.Md}
        onPress={onMorePress}
        accessibilityLabel={strings('social_leaderboard.entry_options.title')}
        twClassName="shrink-0"
        testID={testIDs?.more ?? SocialTraderIdentityRowSelectorsIDs.MORE}
      />
    </Box>
  );
};

export default SocialTraderIdentityRow;
