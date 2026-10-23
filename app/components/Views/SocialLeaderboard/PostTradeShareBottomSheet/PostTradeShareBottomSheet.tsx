import {
  BottomSheet,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Button,
  ButtonIcon,
  ButtonIconSize,
  ButtonSize,
  ButtonVariant,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React, { useCallback, useMemo, useSyncExternalStore } from 'react';
import { ActivityIndicator } from 'react-native';
import { strings } from '../../../../../locales/i18n';
import NavigationService from '../../../../core/NavigationService';
import Routes from '../../../../constants/navigation/Routes';
import { PostTradeShareBottomSheetSelectorsIDs } from './PostTradeShareBottomSheet.testIds';
import {
  clearPostTradeClaimUsernamePrompt,
  clearPostTradeShareSession,
  getPostTradeClaimUsernamePrompt,
  getPostTradeShareSession,
  requestPostTradeShareReopen,
  subscribePostTradeShareSession,
  type PostTradeClaimUsernamePrompt,
} from './postTradeShareSession';
import {
  buildPerpsPostTradeComposerParams,
  buildSpotPostTradeComposerParams,
  openPostTradeComposer,
} from './postTradeComposerParams';

const ClaimUsernameSheet: React.FC<{
  prompt: PostTradeClaimUsernamePrompt;
}> = ({ prompt }) => {
  const handleClose = useCallback(() => {
    clearPostTradeClaimUsernamePrompt();
  }, []);

  const handleClaim = useCallback(() => {
    clearPostTradeClaimUsernamePrompt();
    NavigationService.navigation.navigate(Routes.SOCIAL.PROFILE_ONBOARDING);
  }, []);

  return (
    <BottomSheet
      isFullscreen={false}
      onClose={handleClose}
      testID={PostTradeShareBottomSheetSelectorsIDs.CLAIM_SHEET}
    >
      <Box twClassName="px-4 pb-6 gap-4">
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="justify-end"
        >
          <ButtonIcon
            iconName={IconName.Close}
            size={ButtonIconSize.Md}
            onPress={handleClose}
            testID={PostTradeShareBottomSheetSelectorsIDs.CLAIM_CLOSE_BUTTON}
            accessibilityLabel={strings(
              'social_leaderboard.post_trade_share.close',
            )}
          />
        </Box>
        <Box alignItems={BoxAlignItems.Center} twClassName="gap-3">
          <Icon
            name={IconName.Check}
            size={IconSize.Xl}
            color={IconColor.SuccessDefault}
          />
          <Text
            variant={TextVariant.HeadingMd}
            testID={PostTradeShareBottomSheetSelectorsIDs.CLAIM_TITLE}
          >
            {strings(
              prompt.product === 'perps'
                ? 'social_leaderboard.post_trade_share.order_complete'
                : 'social_leaderboard.post_trade_share.complete',
            )}
          </Text>
        </Box>
        <Box twClassName="rounded-xl bg-muted p-4">
          <Text variant={TextVariant.BodyMd}>
            {strings('social_leaderboard.post_trade_share.claim_title')}
          </Text>
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {strings('social_leaderboard.post_trade_share.claim_body')}
          </Text>
        </Box>
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={handleClaim}
          testID={PostTradeShareBottomSheetSelectorsIDs.CLAIM_BUTTON}
        >
          {strings('social_leaderboard.post_trade_share.claim_username')}
        </Button>
      </Box>
    </BottomSheet>
  );
};

const PostTradeShareBottomSheet: React.FC = () => {
  const session = useSyncExternalStore(
    subscribePostTradeShareSession,
    getPostTradeShareSession,
    getPostTradeShareSession,
  );
  const claimPrompt = useSyncExternalStore(
    subscribePostTradeShareSession,
    getPostTradeClaimUsernamePrompt,
    getPostTradeClaimUsernamePrompt,
  );

  const isPerps = session?.product === 'perps';
  const canRetry = session?.product === 'spot' && Boolean(session.owner);
  const canShare = Boolean(
    session?.status === 'complete' &&
      (session.product === 'perps'
        ? session.orderId
        : session.transactionHash && session.tradeInFlightChain),
  );

  const title = useMemo(() => {
    if (!session) {
      return '';
    }
    if (session.status === 'pending') {
      return strings('social_leaderboard.post_trade_share.in_progress');
    }
    if (session.status === 'failed') {
      return strings(
        session.product === 'perps'
          ? 'social_leaderboard.post_trade_share.order_failed'
          : 'social_leaderboard.post_trade_share.failed',
      );
    }
    return strings(
      session.product === 'perps'
        ? 'social_leaderboard.post_trade_share.order_complete'
        : 'social_leaderboard.post_trade_share.complete',
    );
  }, [session]);

  const handleClose = useCallback(() => {
    clearPostTradeShareSession();
  }, []);

  const handlePrimary = useCallback(() => {
    if (!session) {
      return;
    }
    if (session.status === 'failed') {
      if (!canRetry) {
        clearPostTradeShareSession();
        return;
      }
      requestPostTradeShareReopen();
      return;
    }
    if (!canShare) {
      return;
    }
    const params =
      session.product === 'perps' && session.orderId
        ? buildPerpsPostTradeComposerParams({
            orderId: session.orderId,
            preview: session.preview,
          })
        : session.product === 'spot' &&
            session.transactionHash &&
            session.tradeInFlightChain
          ? buildSpotPostTradeComposerParams({
              transactionHash: session.transactionHash,
              chain: session.tradeInFlightChain,
              preview: session.preview,
            })
          : undefined;
    if (!params) {
      return;
    }
    clearPostTradeShareSession();
    openPostTradeComposer(params);
  }, [canRetry, canShare, session]);

  if (!session) {
    return claimPrompt ? <ClaimUsernameSheet prompt={claimPrompt} /> : null;
  }

  const primaryLabel =
    session.status === 'failed'
      ? strings(
          canRetry
            ? 'social_leaderboard.post_trade_share.try_again'
            : 'social_leaderboard.post_trade_share.close',
        )
      : strings('social_leaderboard.post_trade_share.share_this_trade');
  const primaryDisabled =
    session.status === 'pending' ||
    (session.status === 'complete' && !canShare);

  return (
    <BottomSheet
      isFullscreen={false}
      onClose={handleClose}
      testID={PostTradeShareBottomSheetSelectorsIDs.SHEET}
    >
      <Box twClassName="px-4 pb-6 gap-4">
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="justify-end"
        >
          <ButtonIcon
            iconName={IconName.Close}
            size={ButtonIconSize.Md}
            onPress={handleClose}
            testID={PostTradeShareBottomSheetSelectorsIDs.CLOSE_BUTTON}
            accessibilityLabel={strings(
              'social_leaderboard.post_trade_share.close',
            )}
          />
        </Box>
        <Box alignItems={BoxAlignItems.Center} twClassName="gap-3">
          {session.status === 'pending' ? (
            <ActivityIndicator />
          ) : (
            <Icon
              name={
                session.status === 'complete' ? IconName.Check : IconName.Close
              }
              size={IconSize.Xl}
              color={
                session.status === 'complete'
                  ? IconColor.SuccessDefault
                  : IconColor.ErrorDefault
              }
            />
          )}
          <Text
            variant={TextVariant.HeadingMd}
            testID={PostTradeShareBottomSheetSelectorsIDs.TITLE}
          >
            {title}
          </Text>
          {session.pairLabel ? (
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
              testID={PostTradeShareBottomSheetSelectorsIDs.PAIR}
            >
              {session.pairLabel}
            </Text>
          ) : null}
        </Box>
        <Box
          twClassName="rounded-xl bg-muted p-4"
          testID={PostTradeShareBottomSheetSelectorsIDs.SHARE_AND_EARN}
        >
          <Text variant={TextVariant.BodyMd}>
            {strings(
              'social_leaderboard.post_trade_share.share_and_earn_title',
            )}
          </Text>
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {strings('social_leaderboard.post_trade_share.share_and_earn_body')}
          </Text>
        </Box>
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          isDisabled={primaryDisabled}
          onPress={handlePrimary}
          testID={PostTradeShareBottomSheetSelectorsIDs.SHARE_BUTTON}
        >
          {primaryLabel}
        </Button>
      </Box>
    </BottomSheet>
  );
};

export default PostTradeShareBottomSheet;
