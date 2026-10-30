import React, { useCallback } from 'react';
import {
  Button,
  ButtonSize,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import type { Position } from '@metamask/perps-controller';
import type { Position as SocialPosition } from '@metamask/social-controllers';
import { strings } from '../../../../../../locales/i18n';
import { useOpenSocialPostComposer } from '../../../../Views/SocialLeaderboard/hooks/useOpenSocialPostComposer';
import {
  getPerpsShareDirection,
  postPerpsPositionToFeed,
} from '../../hooks/usePerpsCanPostPosition';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import { PerpsPositionCardSelectorsIDs } from '../../Perps.testIds';

interface PerpsPostToFeedButtonProps {
  position: Position;
  socialPosition: SocialPosition;
}

// Owns the composer hook so its profile fetch only runs while the button is shown.
const PerpsPostToFeedButton: React.FC<PerpsPostToFeedButtonProps> = ({
  position,
  socialPosition,
}) => {
  const { openComposer } = useOpenSocialPostComposer();
  const { track } = usePerpsEventTracking();

  const handlePress = useCallback(() => {
    postPerpsPositionToFeed({
      socialPosition,
      symbol: position.symbol,
      direction: getPerpsShareDirection(position),
      track,
      openComposer,
    });
  }, [openComposer, position, socialPosition, track]);

  return (
    <Button
      variant={ButtonVariant.Secondary}
      size={ButtonSize.Sm}
      onPress={handlePress}
      testID={PerpsPositionCardSelectorsIDs.POST_TO_FEED_BUTTON}
    >
      {strings('perps.position.card.post_to_feed')}
    </Button>
  );
};

export default PerpsPostToFeedButton;
