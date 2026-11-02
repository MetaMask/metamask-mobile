import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, { useEffect, useState } from 'react';
import { strings } from '../../../../../../../locales/i18n';
import ProfileAvatar from '../../../MyProfileView/components/ProfileAvatar';
import {
  COMPOSER_POSTING_DELAY_MS,
  startSocialV1PendingPostCountdown,
} from '../store/socialV1ComposedFeedStore';
import { SocialFeedPostingBannerSelectorsIDs } from './SocialFeedPostingBanner.testIds';

export interface SocialFeedPostingBannerProps {
  authorHandle: string;
  authorImageUrl?: string | null;
  avatarPresetId?: string | null;
  avatarBackgroundId?: string | null;
  /**
   * When the countdown started, or `null` before it has. Mounting with `null`
   * starts it, which is what keeps the progress bar anchored to the moment it
   * became visible rather than to the (possibly much earlier) submit.
   */
  startedAtMs: number | null;
}

const SocialFeedPostingBanner: React.FC<SocialFeedPostingBannerProps> = ({
  authorHandle,
  authorImageUrl,
  avatarPresetId,
  avatarBackgroundId,
  startedAtMs,
}) => {
  const tw = useTailwind();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (startedAtMs == null) {
      startSocialV1PendingPostCountdown();
      return undefined;
    }

    const tick = () => {
      const next = Math.min(
        1,
        Math.max(0, Date.now() - startedAtMs) / COMPOSER_POSTING_DELAY_MS,
      );
      setProgress(next);
      return next;
    };

    if (tick() >= 1) {
      return undefined;
    }

    const intervalId = setInterval(() => {
      if (tick() >= 1) {
        clearInterval(intervalId);
      }
    }, 50);

    return () => clearInterval(intervalId);
  }, [startedAtMs]);

  return (
    <Box
      twClassName="gap-2"
      testID={SocialFeedPostingBannerSelectorsIDs.CONTAINER}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={2}
          twClassName="flex-1 min-w-0"
        >
          <ProfileAvatar
            imageUrl={authorImageUrl}
            avatarPresetId={avatarPresetId}
            avatarBackgroundId={avatarBackgroundId}
            size="sm"
            testID={SocialFeedPostingBannerSelectorsIDs.AVATAR}
          />
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextDefault}
            numberOfLines={1}
          >
            {authorHandle}
          </Text>
        </Box>
        <Text variant={TextVariant.BodySm} color={TextColor.TextMuted}>
          {strings('social_leaderboard.composer.posting')}
        </Text>
      </Box>
      <Box twClassName="h-0.5 rounded-full bg-muted overflow-hidden">
        <Box
          twClassName="h-0.5 bg-primary-default"
          style={tw.style({ width: `${Math.round(progress * 100)}%` })}
          testID={SocialFeedPostingBannerSelectorsIDs.PROGRESS}
        />
      </Box>
    </Box>
  );
};

export default SocialFeedPostingBanner;
