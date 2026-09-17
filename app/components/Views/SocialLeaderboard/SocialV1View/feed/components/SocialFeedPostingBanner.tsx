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
import { COMPOSER_POSTING_DELAY_MS } from '../store/socialV1ComposedFeedStore';
import { SocialFeedPostingBannerSelectorsIDs } from './SocialFeedPostingBanner.testIds';

export interface SocialFeedPostingBannerProps {
  authorHandle: string;
}

const SocialFeedPostingBanner: React.FC<SocialFeedPostingBannerProps> = ({
  authorHandle,
}) => {
  const tw = useTailwind();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const startedAt = Date.now();
    const intervalId = setInterval(() => {
      const next = Math.min(
        1,
        (Date.now() - startedAt) / COMPOSER_POSTING_DELAY_MS,
      );
      setProgress(next);
      if (next >= 1) {
        clearInterval(intervalId);
      }
    }, 50);

    return () => clearInterval(intervalId);
  }, []);

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
        <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
          {authorHandle}
        </Text>
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
