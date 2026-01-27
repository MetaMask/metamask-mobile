import React, { useCallback, useRef, useState } from 'react';
import { View, Image, Linking, Modal, ActivityIndicator } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useSelector } from 'react-redux';
import {
  Box,
  Text,
  TextVariant,
  Button,
  ButtonVariant,
  ButtonSize,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../../component-library/components/Icons/Icon';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import { strings } from '../../../../../../locales/i18n';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../../selectors/accountsController';
import { LeaderboardTrader } from '../../types';
import {
  formatPnL,
  formatFollowers,
  truncateAddress,
} from '../../utils/formatters';
import { LeaderboardTestIds } from '../../Leaderboard.testIds';
import ButtonLink from '../../../../../component-library/components/Buttons/Button/variants/ButtonLink';
import LeaderboardService from '../../services/LeaderboardService';

interface TraderDetailSheetProps {
  /** The trader to display details for */
  trader: LeaderboardTrader | null;
  /** Whether the sheet is visible */
  isVisible: boolean;
  /** Callback when sheet is closed */
  onClose: () => void;
}

/**
 * Bottom sheet displaying detailed trader information
 */
const TraderDetailSheet: React.FC<TraderDetailSheetProps> = ({
  trader,
  isVisible,
  onClose,
}) => {
  const tw = useTailwind();
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);

  const userAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );

  const handleSheetClose = useCallback(() => {
    bottomSheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleFollowToggle = useCallback(async () => {
    if (!userAddress || !trader?.addresses.length) return;

    setIsFollowLoading(true);
    try {
      if (isFollowing) {
        await LeaderboardService.unfollowAddress(userAddress, [
          trader.addresses[0],
        ]);
        setIsFollowing(false);
      } else {
        await LeaderboardService.followAddress(userAddress, [
          trader.addresses[0],
        ]);
        setIsFollowing(true);
      }
    } catch (error) {
      // Silently handle error - could add toast notification here
      console.warn('Follow/unfollow failed:', error);
    } finally {
      setIsFollowLoading(false);
    }
  }, [userAddress, trader?.addresses, isFollowing]);

  const handleTwitterPress = useCallback(() => {
    if (trader?.metadata.twitterHandle) {
      Linking.openURL(`https://x.com/${trader.metadata.twitterHandle}`);
    }
  }, [trader?.metadata.twitterHandle]);

  const handleFarcasterPress = useCallback(() => {
    if (trader?.metadata.farcasterUsername) {
      Linking.openURL(
        `https://warpcast.com/${trader.metadata.farcasterUsername}`,
      );
    }
  }, [trader?.metadata.farcasterUsername]);

  // Don't render if not visible or no trader selected
  if (!isVisible || !trader) {
    return null;
  }

  const pnl30d = trader.metadata.pnl30d ?? 0;
  const isPnlPositive = pnl30d >= 0;
  const followerCount = trader.metrics?.allPartners?.followerCount ?? 0;
  const winRate = trader.metadata.winRate30d;
  const tradeCount = trader.metadata.tradeCount30d;
  const roiPercent = trader.metadata.roiPercent30d;

  return (
    <View testID={LeaderboardTestIds.DETAIL_SHEET}>
      <Modal visible transparent animationType="none" statusBarTranslucent>
        <BottomSheet
          ref={bottomSheetRef}
          onClose={onClose}
          shouldNavigateBack={false}
        >
          <Box twClassName="px-4 pt-2 pb-6">
            {/* Header with Avatar and Name */}
            <Box
              flexDirection={BoxFlexDirection.Row}
              twClassName="mb-6 items-start"
            >
              <View
                style={tw.style('w-16 h-16 rounded-full overflow-hidden mr-4')}
              >
                {trader.images.sm ? (
                  <Image
                    source={{ uri: trader.images.sm }}
                    style={tw.style('w-full h-full')}
                    testID={LeaderboardTestIds.TRADER_AVATAR}
                  />
                ) : (
                  <View
                    style={tw.style(
                      'w-full h-full bg-muted rounded-full items-center justify-center',
                    )}
                  >
                    <Icon
                      name={IconName.User}
                      size={IconSize.Xl}
                      color={IconColor.Muted}
                    />
                  </View>
                )}
              </View>
              <Box twClassName="flex-1">
                <Box
                  flexDirection={BoxFlexDirection.Row}
                  alignItems={BoxAlignItems.Center}
                  justifyContent={BoxJustifyContent.Between}
                >
                  <Text variant={TextVariant.HeadingMd}>{trader.name}</Text>
                  {/* Follow Button */}
                  <Button
                    variant={
                      isFollowing
                        ? ButtonVariant.Secondary
                        : ButtonVariant.Primary
                    }
                    size={ButtonSize.Sm}
                    onPress={handleFollowToggle}
                    isDisabled={isFollowLoading || !userAddress}
                  >
                    {isFollowLoading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : isFollowing ? (
                      strings('leaderboard.following')
                    ) : (
                      strings('leaderboard.follow')
                    )}
                  </Button>
                </Box>
                {trader.addresses.length > 0 && (
                  <Text
                    variant={TextVariant.BodySm}
                    twClassName="text-muted mt-1"
                  >
                    {truncateAddress(trader.addresses[0], 6)}
                  </Text>
                )}
                {/* Social Links */}
                <Box
                  flexDirection={BoxFlexDirection.Row}
                  alignItems={BoxAlignItems.Center}
                  gap={2}
                  twClassName="mt-2"
                >
                  {trader.metadata.twitterHandle && (
                    <ButtonLink
                      onPress={handleTwitterPress}
                      startIconName={IconName.X}
                      label={`@${trader.metadata.twitterHandle}`}
                    />
                  )}
                  {trader.metadata.farcasterUsername && (
                    <ButtonLink
                      onPress={handleFarcasterPress}
                      startIconName={IconName.Link}
                      label={`${trader.metadata.farcasterUsername}`}
                    />
                  )}
                </Box>
              </Box>
            </Box>

            {/* Stats Grid */}
            <Box twClassName="bg-muted rounded-xl p-4 mb-4">
              <Box
                flexDirection={BoxFlexDirection.Row}
                justifyContent={BoxJustifyContent.Between}
                twClassName="mb-4"
              >
                {/* PnL (30D) */}
                <Box alignItems={BoxAlignItems.Center} twClassName="flex-1">
                  <Text
                    variant={TextVariant.BodySm}
                    twClassName="text-muted mb-1"
                  >
                    {strings('leaderboard.pnl_30d')}
                  </Text>
                  <Text
                    variant={TextVariant.HeadingSm}
                    twClassName={
                      isPnlPositive
                        ? 'text-success-default'
                        : 'text-error-default'
                    }
                  >
                    {formatPnL(pnl30d)}
                  </Text>
                </Box>

                {/* Followers */}
                <Box alignItems={BoxAlignItems.Center} twClassName="flex-1">
                  <Text
                    variant={TextVariant.BodySm}
                    twClassName="text-muted mb-1"
                  >
                    {strings('leaderboard.followers')}
                  </Text>
                  <Text variant={TextVariant.HeadingSm}>
                    {formatFollowers(followerCount)}
                  </Text>
                </Box>

                {/* Win Rate */}
                <Box alignItems={BoxAlignItems.Center} twClassName="flex-1">
                  <Text
                    variant={TextVariant.BodySm}
                    twClassName="text-muted mb-1"
                  >
                    {strings('leaderboard.win_rate')}
                  </Text>
                  <Text variant={TextVariant.HeadingSm}>
                    {winRate !== null ? `${(winRate * 100).toFixed(0)}%` : '-'}
                  </Text>
                </Box>
              </Box>

              <Box
                flexDirection={BoxFlexDirection.Row}
                justifyContent={BoxJustifyContent.Between}
              >
                {/* Trades (30D) */}
                <Box alignItems={BoxAlignItems.Center} twClassName="flex-1">
                  <Text
                    variant={TextVariant.BodySm}
                    twClassName="text-muted mb-1"
                  >
                    {strings('leaderboard.trades_30d')}
                  </Text>
                  <Text variant={TextVariant.HeadingSm}>
                    {tradeCount !== null ? tradeCount.toLocaleString() : '-'}
                  </Text>
                </Box>

                {/* ROI (30D) */}
                <Box alignItems={BoxAlignItems.Center} twClassName="flex-1">
                  <Text
                    variant={TextVariant.BodySm}
                    twClassName="text-muted mb-1"
                  >
                    {strings('leaderboard.roi_30d')}
                  </Text>
                  <Text
                    variant={TextVariant.HeadingSm}
                    twClassName={
                      roiPercent !== null && roiPercent >= 0
                        ? 'text-success-default'
                        : 'text-error-default'
                    }
                  >
                    {roiPercent !== null
                      ? `${roiPercent >= 0 ? '+' : ''}${roiPercent.toFixed(1)}%`
                      : '-'}
                  </Text>
                </Box>

                {/* Empty space for alignment */}
                <Box twClassName="flex-1" />
              </Box>
            </Box>

            {/* Close Button */}
            <Button
              variant={ButtonVariant.Primary}
              size={ButtonSize.Lg}
              onPress={handleSheetClose}
              isFullWidth
            >
              {strings('leaderboard.close')}
            </Button>
          </Box>
        </BottomSheet>
      </Modal>
    </View>
  );
};

export default TraderDetailSheet;
