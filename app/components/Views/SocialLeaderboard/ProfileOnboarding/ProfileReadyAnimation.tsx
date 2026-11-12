import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Alignment,
  Fit,
  RiveView,
  useRive,
  useRiveBoolean,
  useRiveFile,
  useRiveString,
  useViewModelInstance,
  type RiveError,
} from '@rive-app/react-native';
import React, { useCallback, useEffect, useState } from 'react';
import ProfileReadyRive from '../../../../animations/social_v1_profile-ready.riv';
import Logger from '../../../../util/Logger';
import { useTheme } from '../../../../util/theme';
import { AppThemeKey } from '../../../../util/theme/models';
import ProfileAvatar from '../MyProfileView/components/ProfileAvatar';
import {
  PROFILE_ONBOARDING_RIVE_ASSETS,
  PROFILE_READY_RIVE_ARTBOARD,
  PROFILE_READY_RIVE_PATHS,
  PROFILE_READY_RIVE_STATE_MACHINE,
} from './profileOnboardingRive';
import { SocialProfileOnboardingSelectorsIDs } from './SocialProfileOnboardingView.testIds';
import { useProfileOnboardingRiveEnabled } from './useProfileOnboardingRiveEnabled';

/** Pulls the avatar off the name and handle, into the card's avatar well. */
const READY_AVATAR_LIFT = 48;
/** The ready card plays its reveal once, then holds the last frame. */
const READY_PLAY_ONCE_MS = 4000;

interface ProfileReadyAnimationProps {
  displayName: string;
  /** Without the leading `@`. */
  handle: string;
  avatarPresetId: string | null | undefined;
  avatarBackgroundId: string | null | undefined;
  imageUrl?: string | null;
  isVerified?: boolean;
  /** Static content shown when the animation is skipped or fails. */
  fallback: React.ReactNode;
  /** Stops the loop while the terms sheet covers it or the screen blurs. */
  paused?: boolean;
}

/**
 * Profile card shown on the onboarding ready step. Binds the draft name and
 * handle into the Social V1 profile-ready Rive. The chosen avatar is drawn on
 * top of the card: the file's avatar image is a baked stand-in, and the
 * onboarding artwork is a transparent PNG that does not survive that slot.
 */
const ProfileReadyAnimation: React.FC<ProfileReadyAnimationProps> = ({
  displayName,
  handle,
  avatarPresetId,
  avatarBackgroundId,
  imageUrl,
  isVerified = false,
  fallback,
  paused = false,
}) => {
  const tw = useTailwind();
  const { themeAppearance } = useTheme();
  const skipAnimation = !useProfileOnboardingRiveEnabled();
  const [hasRiveError, setHasRiveError] = useState(false);

  const { riveFile, error: riveFileError } = useRiveFile(
    skipAnimation ? undefined : ProfileReadyRive,
    {
      referencedAssets: PROFILE_ONBOARDING_RIVE_ASSETS,
    },
  );
  const { instance, error: instanceError } = useViewModelInstance(riveFile, {
    artboardName: PROFILE_READY_RIVE_ARTBOARD,
    async: true,
  });
  const loadError = riveFileError ?? instanceError;
  const { riveViewRef, setHybridRef } = useRive();

  useEffect(() => {
    if (!riveViewRef) return undefined;
    if (paused) {
      riveViewRef.pause().catch(() => undefined);
      return undefined;
    }
    riveViewRef.play().catch(() => undefined);
    const hold = setTimeout((): void => {
      riveViewRef.pause().catch(() => undefined);
    }, READY_PLAY_ONCE_MS);
    return () => clearTimeout(hold);
  }, [paused, riveViewRef]);

  useEffect(() => {
    if (loadError) {
      Logger.error(loadError, 'ProfileReadyAnimation: Rive load failed');
    }
  }, [loadError]);
  const { setValue: setDisplayName } = useRiveString(
    PROFILE_READY_RIVE_PATHS.DISPLAY_NAME,
    instance,
  );
  const { setValue: setHandle } = useRiveString(
    PROFILE_READY_RIVE_PATHS.HANDLE,
    instance,
  );
  const { setValue: setIsVerified } = useRiveBoolean(
    PROFILE_READY_RIVE_PATHS.IS_VERIFIED,
    instance,
  );
  const { setValue: setLightMode } = useRiveBoolean(
    PROFILE_READY_RIVE_PATHS.LIGHT_MODE,
    instance,
  );

  useEffect(() => {
    if (!instance) return;
    setLightMode(themeAppearance === AppThemeKey.light);
  }, [instance, setLightMode, themeAppearance]);

  useEffect(() => {
    if (!instance) return;
    setDisplayName(displayName);
    setHandle(`@${handle}`);
    setIsVerified(isVerified);
  }, [
    instance,
    displayName,
    handle,
    isVerified,
    setDisplayName,
    setHandle,
    setIsVerified,
  ]);

  const handleError = useCallback((riveError: RiveError) => {
    Logger.error(
      new Error(riveError.message),
      `ProfileReadyAnimation: Rive error (${riveError.type})`,
    );
    setHasRiveError(true);
  }, []);

  if (skipAnimation || hasRiveError || loadError) {
    return <>{fallback}</>;
  }

  return (
    <Box twClassName="w-full aspect-square">
      {riveFile && instance ? (
        <RiveView
          hybridRef={setHybridRef}
          file={riveFile}
          artboardName={PROFILE_READY_RIVE_ARTBOARD}
          stateMachineName={PROFILE_READY_RIVE_STATE_MACHINE}
          dataBind={instance}
          autoPlay={!paused}
          fit={Fit.Contain}
          alignment={Alignment.Center}
          style={tw.style('flex-1')}
          onError={handleError}
          testID={SocialProfileOnboardingSelectorsIDs.READY_ANIMATION}
        />
      ) : null}
      <Box
        pointerEvents="none"
        twClassName="absolute inset-0 items-center justify-center"
        style={{ transform: [{ translateY: -READY_AVATAR_LIFT }] }}
      >
        <ProfileAvatar
          imageUrl={imageUrl}
          avatarPresetId={avatarPresetId}
          avatarBackgroundId={avatarBackgroundId}
          size="xl"
          testID={SocialProfileOnboardingSelectorsIDs.READY_AVATAR}
        />
      </Box>
    </Box>
  );
};

export default ProfileReadyAnimation;
