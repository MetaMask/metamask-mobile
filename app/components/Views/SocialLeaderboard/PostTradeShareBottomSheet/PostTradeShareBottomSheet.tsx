import {
  AvatarIcon,
  AvatarIconSeverity,
  AvatarIconSize,
  BottomSheet,
  BottomSheetHeader,
  Box,
  BoxAlignItems,
  BoxBackgroundColor,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  IconColor,
  IconName,
  IconSize,
  Spinner,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React, { useCallback, useSyncExternalStore } from 'react';
import { Image } from 'react-native';
import { strings } from '../../../../../locales/i18n';
import NavigationService from '../../../../core/NavigationService';
import Routes from '../../../../constants/navigation/Routes';
import createProfileIllustration from '../../../../images/socialV1/megaphone.png';
import PostTradeEarnIllustration from '../../../../images/socialV1/post-trade-earn.svg';
import { PostTradeShareBottomSheetSelectorsIDs } from './PostTradeShareBottomSheet.testIds';
import {
  clearPostTradeShareSession,
  getPostTradeShareSession,
  hasPostTradeShareReopenOwner,
  requestPostTradeShareReopen,
  subscribePostTradeShareSession,
  type PostTradeShareSession,
  type PostTradeShareStatus,
} from './postTradeShareSession';
import {
  buildPerpsPostTradeComposerParams,
  buildSpotPostTradeComposerParams,
  openPostTradeComposer,
} from './postTradeComposerParams';
import { SocialEvent, useSocialScreenAnalytics } from '../analytics';

const ILLUSTRATION_SIZE = 64;

const StatusIcon = ({ status }: { status: PostTradeShareStatus }) => {
  if (status === 'pending') {
    return (
      <Box
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        backgroundColor={BoxBackgroundColor.PrimaryMuted}
        twClassName="h-12 w-12 rounded-full"
      >
        <Spinner
          color={IconColor.PrimaryDefault}
          spinnerIconProps={{ size: IconSize.Xl }}
        />
      </Box>
    );
  }
  const isComplete = status === 'complete';
  return (
    <AvatarIcon
      iconName={isComplete ? IconName.CheckBold : IconName.Error}
      severity={
        isComplete ? AvatarIconSeverity.Success : AvatarIconSeverity.Danger
      }
      size={AvatarIconSize.Xl}
    />
  );
};

const getTitle = (session: PostTradeShareSession): string => {
  const isPerps = session.product === 'perps';
  switch (session.status) {
    case 'pending':
      return strings(
        isPerps
          ? 'social_leaderboard.post_trade_share.order_in_progress'
          : 'social_leaderboard.post_trade_share.swap_in_progress',
      );
    case 'failed':
      return strings(
        isPerps
          ? 'social_leaderboard.post_trade_share.order_failed'
          : 'social_leaderboard.post_trade_share.failed',
      );
    default:
      return strings(
        isPerps
          ? 'social_leaderboard.post_trade_share.order_complete'
          : 'social_leaderboard.post_trade_share.complete',
      );
  }
};

const navigateToActivity = (product: PostTradeShareSession['product']) => {
  if (product === 'perps') {
    NavigationService.navigation.navigate(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.ACTIVITY,
      params: { redirectToPerpsTransactions: true, showBackButton: true },
    });
    return;
  }
  NavigationService.navigation.navigate(Routes.TRANSACTIONS_VIEW);
};
const { Interaction, Outcome, Screen, Source, Trade } = SocialEvent;
const PostTradeShareBottomSheet: React.FC = () => {
  const session = useSyncExternalStore(
    subscribePostTradeShareSession,
    getPostTradeShareSession,
    getPostTradeShareSession,
  );

  const isPerps = session?.product === 'perps';
  const source = Source.TRADER_FEED;
  const tradeType = isPerps ? Trade.PERPS : Trade.SPOT;
  const trackInteraction = useSocialScreenAnalytics(
    Screen.POST_TRADE_SHARE_SHEET,
    {
      source,
      outcome:
        session?.status === 'complete'
          ? Outcome.CONTENT
          : session?.status === 'failed'
            ? Outcome.ERROR
            : null,
      isActive: session !== null,
    },
  );
  const isCreateProfile = session?.variant === 'create_profile';
  const retryOwner = session?.product === 'spot' ? session.owner : undefined;
  const getCanRetry = useCallback(
    () => (retryOwner ? hasPostTradeShareReopenOwner(retryOwner) : false),
    [retryOwner],
  );
  const canRetry = useSyncExternalStore(
    subscribePostTradeShareSession,
    getCanRetry,
    getCanRetry,
  );
  const canShare = Boolean(
    session?.status === 'complete' &&
      (session.product === 'perps'
        ? session.orderId
        : session.transactionHash && session.tradeInFlightChain),
  );

  const handleClose = useCallback(() => {
    trackInteraction(Interaction.SHEET_DISMISSED, {
      outcome: Outcome.DISMISSED,
      trade_type: tradeType,
    });
    clearPostTradeShareSession();
  }, [trackInteraction, tradeType]);

  const handleViewActivity = useCallback(() => {
    if (!session) {
      return;
    }
    clearPostTradeShareSession();
    navigateToActivity(session.product);
  }, [session]);

  const handlePrimary = useCallback(() => {
    if (!session) {
      return;
    }
    trackInteraction(Interaction.BUTTON_CLICKED, {
      outcome: session.status === 'failed' ? Outcome.FAILED : Outcome.SUCCESS,
      trade_type: tradeType,
    });
    if (session.status === 'failed') {
      if (!canRetry) {
        clearPostTradeShareSession();
        return;
      }
      requestPostTradeShareReopen();
      return;
    }
    if (session.variant === 'create_profile') {
      clearPostTradeShareSession();
      NavigationService.navigation.navigate(Routes.SOCIAL.PROFILE_ONBOARDING);
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
  }, [canRetry, canShare, session, trackInteraction, tradeType]);

  if (!session) {
    return null;
  }

  const primaryLabel =
    session.status === 'failed'
      ? strings(
          canRetry
            ? 'social_leaderboard.post_trade_share.try_again'
            : 'social_leaderboard.post_trade_share.close',
        )
      : strings(
          isCreateProfile
            ? 'social_leaderboard.post_trade_share.create_profile'
            : 'social_leaderboard.post_trade_share.create_post',
        );
  const primaryDisabled =
    !isCreateProfile &&
    (session.status === 'pending' ||
      (session.status === 'complete' && !canShare));

  return (
    <BottomSheet
      isFullscreen={false}
      onClose={handleClose}
      testID={PostTradeShareBottomSheetSelectorsIDs.SHEET}
    >
      <BottomSheetHeader
        onClose={handleClose}
        closeButtonProps={{
          testID: PostTradeShareBottomSheetSelectorsIDs.CLOSE_BUTTON,
          accessibilityLabel: strings(
            'social_leaderboard.post_trade_share.close',
          ),
        }}
        twClassName="pt-4 h-auto"
      >
        <StatusIcon status={session.status} />
      </BottomSheetHeader>
      <Box alignItems={BoxAlignItems.Center} twClassName="gap-1 px-4 py-3">
        <Text
          variant={TextVariant.HeadingLg}
          twClassName="text-center"
          testID={PostTradeShareBottomSheetSelectorsIDs.TITLE}
        >
          {getTitle(session)}
        </Text>
        {session.pairLabel ? (
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            twClassName="text-center"
            testID={PostTradeShareBottomSheetSelectorsIDs.PAIR}
          >
            {session.pairLabel}
          </Text>
        ) : null}
      </Box>
      {session.status !== 'failed' ? (
        <Box twClassName="px-4 pt-4 pb-6">
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="gap-2 rounded-xl border border-muted bg-muted p-3"
            testID={PostTradeShareBottomSheetSelectorsIDs.CARD}
          >
            {isCreateProfile ? (
              <Image
                source={createProfileIllustration}
                resizeMode="contain"
                style={{ width: ILLUSTRATION_SIZE, height: ILLUSTRATION_SIZE }}
              />
            ) : (
              <PostTradeEarnIllustration
                name="post-trade-earn"
                width={ILLUSTRATION_SIZE}
                height={ILLUSTRATION_SIZE}
              />
            )}
            <Box twClassName="flex-1">
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Medium}
                testID={PostTradeShareBottomSheetSelectorsIDs.CARD_TITLE}
              >
                {strings(
                  isCreateProfile
                    ? 'social_leaderboard.post_trade_share.create_profile_title'
                    : 'social_leaderboard.post_trade_share.post_and_earn_title',
                )}
              </Text>
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
              >
                {strings(
                  isCreateProfile
                    ? 'social_leaderboard.post_trade_share.create_profile_body'
                    : 'social_leaderboard.post_trade_share.post_and_earn_body',
                )}
              </Text>
            </Box>
          </Box>
        </Box>
      ) : null}
      <Box twClassName="px-4 pb-6">
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
        <Button
          variant={ButtonVariant.Tertiary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={handleViewActivity}
          testID={PostTradeShareBottomSheetSelectorsIDs.VIEW_ACTIVITY_BUTTON}
        >
          {strings('social_leaderboard.post_trade_share.view_activity')}
        </Button>
      </Box>
    </BottomSheet>
  );
};

export default PostTradeShareBottomSheet;
