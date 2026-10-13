import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Alignment,
  Fit,
  RiveImages,
  RiveView,
  useRiveBoolean,
  useRiveFile,
  useRiveString,
  useViewModelInstance,
  type RiveError,
} from '@rive-app/react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { Image } from 'react-native';
import ProfileReadyRive from '../../../../animations/social_v1_profile-ready.riv';
import Logger from '../../../../util/Logger';
import { getProfileAvatarPreset } from '../MyProfileView/avatarPresets';
import {
  PROFILE_ONBOARDING_RIVE_ASSETS,
  PROFILE_READY_RIVE_ARTBOARD,
  PROFILE_READY_RIVE_PATHS,
  PROFILE_READY_RIVE_STATE_MACHINE,
} from './profileOnboardingRive';
import { SocialProfileOnboardingSelectorsIDs } from './SocialProfileOnboardingView.testIds';
import { useProfileOnboardingRiveEnabled } from './useProfileOnboardingRiveEnabled';

/** Dev builds resolve bundled images to URLs; Android release to resource names. */
const loadBundledRiveImage = (uri: string) =>
  /^(https?|file):/.test(uri)
    ? RiveImages.loadFromURLAsync(uri)
    : RiveImages.loadFromResourceAsync(uri);

interface ProfileReadyAnimationProps {
  displayName: string;
  /** Without the leading `@`. */
  handle: string;
  avatarPresetId: string | null | undefined;
  /** Static content shown when the animation is skipped or fails. */
  fallback: React.ReactNode;
}

/**
 * Profile card shown on the onboarding ready step. Binds the draft identity
 * into the Social V1 profile-ready Rive. Emoji avatar presets cannot be drawn
 * by Rive, so those keep the file's stand-in avatar.
 */
const ProfileReadyAnimation: React.FC<ProfileReadyAnimationProps> = ({
  displayName,
  handle,
  avatarPresetId,
  fallback,
}) => {
  const tw = useTailwind();
  const skipAnimation = !useProfileOnboardingRiveEnabled();
  const [hasRiveError, setHasRiveError] = useState(false);

  const { riveFile } = useRiveFile(
    skipAnimation ? undefined : ProfileReadyRive,
    {
      referencedAssets: PROFILE_ONBOARDING_RIVE_ASSETS,
    },
  );
  const { instance } = useViewModelInstance(riveFile, {
    artboardName: PROFILE_READY_RIVE_ARTBOARD,
    async: true,
  });
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

  useEffect(() => {
    if (!instance) return;
    setDisplayName(displayName);
    setHandle(`@${handle}`);
    setIsVerified(false);
  }, [instance, displayName, handle, setDisplayName, setHandle, setIsVerified]);

  useEffect(() => {
    const preset = getProfileAvatarPreset(avatarPresetId);
    if (!instance || preset?.kind !== 'image') return undefined;
    const uri = Image.resolveAssetSource(preset.source)?.uri;
    if (!uri) return undefined;

    let isCancelled = false;
    loadBundledRiveImage(uri)
      .then((image) => {
        if (!isCancelled) {
          instance.imageProperty(PROFILE_READY_RIVE_PATHS.AVATAR)?.set(image);
        }
      })
      .catch((error: Error) => {
        Logger.error(error, 'ProfileReadyAnimation: avatar load failed');
      });
    return () => {
      isCancelled = true;
    };
  }, [avatarPresetId, instance]);

  const handleError = useCallback((riveError: RiveError) => {
    Logger.error(
      new Error(riveError.message),
      `ProfileReadyAnimation: Rive error (${riveError.type})`,
    );
    setHasRiveError(true);
  }, []);

  if (skipAnimation || hasRiveError) {
    return <>{fallback}</>;
  }

  return (
    <Box twClassName="w-full aspect-square">
      {riveFile && instance ? (
        <RiveView
          file={riveFile}
          artboardName={PROFILE_READY_RIVE_ARTBOARD}
          stateMachineName={PROFILE_READY_RIVE_STATE_MACHINE}
          dataBind={instance}
          autoPlay
          fit={Fit.Contain}
          alignment={Alignment.Center}
          style={tw.style('flex-1')}
          onError={handleError}
          testID={SocialProfileOnboardingSelectorsIDs.READY_ANIMATION}
        />
      ) : null}
    </Box>
  );
};

export default ProfileReadyAnimation;
