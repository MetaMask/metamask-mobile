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
  clearPostTradeShareSession,
  getPostTradeShareSession,
  requestPostTradeShareReopen,
  subscribePostTradeShareSession,
} from './postTradeShareSession';

const PostTradeShareBottomSheet: React.FC = () => {
  const session = useSyncExternalStore(
    subscribePostTradeShareSession,
    getPostTradeShareSession,
    getPostTradeShareSession,
  );

  const isPerps = session?.product === 'perps';
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
      if (session.product === 'perps') {
        clearPostTradeShareSession();
        return;
      }
      requestPostTradeShareReopen();
      return;
    }
    if (!canShare) {
      return;
    }
    const tradeInFlight =
      session.product === 'perps' && session.orderId
        ? {
            orderId: session.orderId,
            chain: 'hyperliquid' as const,
            tokenAddress: session.preview.tokenAddress,
          }
        : session.product === 'spot' &&
            session.transactionHash &&
            session.tradeInFlightChain
          ? {
              transactionHash: session.transactionHash,
              chain: session.tradeInFlightChain,
              tokenAddress: session.preview.tokenAddress,
            }
          : undefined;
    if (!tradeInFlight) {
      return;
    }
    const params = {
      tradeInFlight,
      preview: session.preview,
    };
    clearPostTradeShareSession();
    NavigationService.navigation.navigate(Routes.SOCIAL.POST_COMPOSER, params);
  }, [canShare, session]);

  if (!session) {
    return null;
  }

  const primaryLabel =
    session.status === 'failed'
      ? strings(
          isPerps
            ? 'social_leaderboard.post_trade_share.close'
            : 'social_leaderboard.post_trade_share.try_again',
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
