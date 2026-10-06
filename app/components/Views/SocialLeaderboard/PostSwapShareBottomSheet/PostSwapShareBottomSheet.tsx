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
import { PostSwapShareBottomSheetSelectorsIDs } from './PostSwapShareBottomSheet.testIds';
import {
  clearPostSwapShareSession,
  getPostSwapShareSession,
  requestPostSwapShareReopen,
  subscribePostSwapShareSession,
} from './postSwapShareSession';

const PostSwapShareBottomSheet: React.FC = () => {
  const session = useSyncExternalStore(
    subscribePostSwapShareSession,
    getPostSwapShareSession,
    getPostSwapShareSession,
  );

  const canShare = Boolean(
    session?.status === 'complete' &&
      session.transactionHash &&
      session.tradeInFlightChain,
  );

  const title = useMemo(() => {
    if (!session) {
      return '';
    }
    if (session.status === 'pending') {
      return strings('social_leaderboard.post_swap_share.in_progress');
    }
    if (session.status === 'failed') {
      return strings('social_leaderboard.post_swap_share.failed');
    }
    return strings('social_leaderboard.post_swap_share.complete');
  }, [session]);

  const handleClose = useCallback(() => {
    clearPostSwapShareSession();
  }, []);

  const handlePrimary = useCallback(() => {
    if (!session) {
      return;
    }
    if (session.status === 'failed') {
      requestPostSwapShareReopen();
      return;
    }
    if (!canShare || !session.transactionHash || !session.tradeInFlightChain) {
      return;
    }
    const params = {
      tradeInFlight: {
        transactionHash: session.transactionHash,
        chain: session.tradeInFlightChain,
        tokenAddress: session.preview.tokenAddress,
      },
      preview: session.preview,
    };
    clearPostSwapShareSession();
    NavigationService.navigation.navigate(Routes.SOCIAL.POST_COMPOSER, params);
  }, [canShare, session]);

  if (!session) {
    return null;
  }

  const primaryLabel =
    session.status === 'failed'
      ? strings('social_leaderboard.post_swap_share.try_again')
      : strings('social_leaderboard.post_swap_share.share_this_trade');
  const primaryDisabled =
    session.status === 'pending' ||
    (session.status === 'complete' && !canShare);

  return (
    <BottomSheet
      isFullscreen={false}
      onClose={handleClose}
      testID={PostSwapShareBottomSheetSelectorsIDs.SHEET}
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
            testID={PostSwapShareBottomSheetSelectorsIDs.CLOSE_BUTTON}
            accessibilityLabel={strings(
              'social_leaderboard.post_swap_share.close',
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
            testID={PostSwapShareBottomSheetSelectorsIDs.TITLE}
          >
            {title}
          </Text>
          {session.pairLabel ? (
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
              testID={PostSwapShareBottomSheetSelectorsIDs.PAIR}
            >
              {session.pairLabel}
            </Text>
          ) : null}
        </Box>
        <Box
          twClassName="rounded-xl bg-muted p-4"
          testID={PostSwapShareBottomSheetSelectorsIDs.SHARE_AND_EARN}
        >
          <Text variant={TextVariant.BodyMdMedium}>
            {strings('social_leaderboard.post_swap_share.share_and_earn_title')}
          </Text>
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {strings('social_leaderboard.post_swap_share.share_and_earn_body')}
          </Text>
        </Box>
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          isDisabled={primaryDisabled}
          onPress={handlePrimary}
          testID={PostSwapShareBottomSheetSelectorsIDs.SHARE_BUTTON}
        >
          {primaryLabel}
        </Button>
      </Box>
    </BottomSheet>
  );
};

export default PostSwapShareBottomSheet;
