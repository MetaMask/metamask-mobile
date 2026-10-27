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
import {
  Alignment,
  Fit,
  RiveView,
  useRiveFile,
  type RiveError,
} from '@rive-app/react-native';
import React, { useCallback, useState } from 'react';
import { Image } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import SocialOnboardingAnimation from '../../../../../animations/social_v1_social-onboarding.riv';
import megaphoneFallback from '../../../../../images/socialV1/megaphone.png';
import { strings } from '../../../../../../locales/i18n';
import { PROFILE_ONBOARDING_RIVE_ASSETS } from '../../../../Views/SocialLeaderboard/ProfileOnboarding/profileOnboardingRive';
import { useOpenSocialPostComposer } from '../../../../Views/SocialLeaderboard/hooks/useOpenSocialPostComposer';
import Logger from '../../../../../util/Logger';

/** Artboard inside `social_v1_social-onboarding.riv`. */
const MEGAPHONE_ARTBOARD = 'Megaphone';
const ILLUSTRATION_SIZE = 96;

const FEED_EMPTY_TEST_ID = 'token-details-feed-empty';
const CREATE_POST_TEST_ID = 'token-details-feed-empty-create-post';
const MEGAPHONE_TEST_ID = 'token-details-feed-empty-megaphone';
const MEGAPHONE_FALLBACK_TEST_ID =
  'token-details-feed-empty-megaphone-fallback';

export interface TokenDetailsFeedEmptyStateProps {
  /** True when this wallet holds the token the feed is about. */
  hasBalance: boolean;
}

/**
 * Megaphone from the Social onboarding Rive file. The static PNG is the
 * Reduce Motion and error fallback, and what shows until the file loads.
 */
const FeedEmptyMegaphone: React.FC = () => {
  const prefersReducedMotion = useReducedMotion();
  const [hasRiveError, setHasRiveError] = useState(false);
  const { riveFile, error: riveFileError } = useRiveFile(
    prefersReducedMotion ? undefined : SocialOnboardingAnimation,
    { referencedAssets: PROFILE_ONBOARDING_RIVE_ASSETS },
  );
  const showFallback =
    Boolean(prefersReducedMotion) || hasRiveError || Boolean(riveFileError);

  const handleError = useCallback((riveError: RiveError) => {
    Logger.error(
      new Error(riveError.message),
      `TokenDetailsFeedEmptyState: Rive error (${riveError.type})`,
    );
    setHasRiveError(true);
  }, []);

  return (
    <Box twClassName="mb-4">
      {showFallback || !riveFile ? (
        <Image
          source={megaphoneFallback}
          resizeMode="contain"
          style={{ width: ILLUSTRATION_SIZE, height: ILLUSTRATION_SIZE }}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          testID={MEGAPHONE_FALLBACK_TEST_ID}
        />
      ) : (
        <RiveView
          file={riveFile}
          artboardName={MEGAPHONE_ARTBOARD}
          autoPlay
          fit={Fit.Contain}
          alignment={Alignment.Center}
          style={{ width: ILLUSTRATION_SIZE, height: ILLUSTRATION_SIZE }}
          onError={handleError}
          testID={MEGAPHONE_TEST_ID}
        />
      )}
    </Box>
  );
};

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
