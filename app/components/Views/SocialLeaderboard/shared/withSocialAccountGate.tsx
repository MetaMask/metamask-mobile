import React from 'react';
import { useSocialModerationStatus } from '../../../UI/SocialFeed/hooks/useSocialModerationStatus';
import SocialAccountDisabledView from './SocialAccountDisabledView';

/**
 * Wraps a social screen so a viewer whose account the moderation team
 * disabled sees {@link SocialAccountDisabledView} instead of it.
 */
export const withSocialAccountGate = <P extends object>(
  Screen: React.ComponentType<P>,
): React.FC<P> => {
  const GatedScreen: React.FC<P> = (props) => {
    const { isBanned } = useSocialModerationStatus();
    return isBanned ? <SocialAccountDisabledView /> : <Screen {...props} />;
  };
  GatedScreen.displayName = `withSocialAccountGate(${
    Screen.displayName || Screen.name || 'Screen'
  })`;
  return GatedScreen;
};
