import React, { useCallback, useRef, useState, useEffect } from 'react';
import {
  View,
  Image,
  Linking,
  Modal,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
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
import { LeaderboardTrader, FeedItem } from '../../types';
import {
  formatPnL,
  formatFollowers,
  truncateAddress,
  formatTimeAgo,
  formatUsdValue,
} from '../../utils/formatters';
import { LeaderboardTestIds } from '../../Leaderboard.testIds';
import ButtonLink from '../../../../../component-library/components/Buttons/Button/variants/ButtonLink';
import LeaderboardService from '../../services/LeaderboardService';
import {
  useSwapBridgeNavigation,
  SwapBridgeNavigationLocation,
} from '../../../Bridge/hooks/useSwapBridgeNavigation';
import { BridgeToken } from '../../../Bridge/types';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { SolScope } from '@metamask/keyring-api';
import { Hex, CaipChainId } from '@metamask/utils';
import { getNativeSourceToken } from '../../../Bridge/utils/tokenUtils';

/**
 * Maps chain names from Clicker API to MetaMask chain IDs
 */
const CHAIN_NAME_TO_ID: Record<string, Hex | CaipChainId> = {
  base: CHAIN_IDS.BASE,
  ethereum: CHAIN_IDS.MAINNET,
  solana: SolScope.Mainnet,
  polygon: CHAIN_IDS.POLYGON,
  arbitrum: CHAIN_IDS.ARBITRUM,
  optimism: CHAIN_IDS.OPTIMISM,
  avalanche: CHAIN_IDS.AVALANCHE,
  bsc: CHAIN_IDS.BSC,
};

/**
 * Parses the swap URL from callToActions to extract the input currency
 */
const parseInputCurrencyFromUrl = (url: string): string | null => {
  try {
    const urlObj = new URL(url);
    return urlObj.searchParams.get('inputCurrency');
  } catch {
    return null;
  }
};

/**
 * Builds token objects for swap navigation from a trade item
 */
const buildSwapTokens = (
  trade: FeedItem,
): { sourceToken: BridgeToken | undefined; destToken: BridgeToken | undefined } => {
  const chainName = trade.metadata?.tokenChain?.toLowerCase();
  const chainId = chainName ? CHAIN_NAME_TO_ID[chainName] : undefined;

  if (!chainId) {
    return { sourceToken: undefined, destToken: undefined };
  }

  // Get the input currency from the swap URL (typically ETH or native token)
  const swapUrl = trade.callToActions?.[0]?.url;
  const inputCurrency = swapUrl ? parseInputCurrencyFromUrl(swapUrl) : null;

  // Source token: Use native token for the chain (e.g., ETH on Base)
  // If inputCurrency is "ETH" or similar native symbol, use getNativeSourceToken
  let sourceToken: BridgeToken | undefined;
  if (inputCurrency === 'ETH' || !inputCurrency) {
    sourceToken = getNativeSourceToken(chainId);
  } else {
    // For non-native input currencies, we'd need more info
    // For now, default to native token
    sourceToken = getNativeSourceToken(chainId);
  }

  // Destination token: The token being bought
  const destToken: BridgeToken | undefined = trade.metadata?.tokenAddress
    ? {
        address: trade.metadata.tokenAddress,
        symbol: trade.metadata.tokenSymbol || 'TOKEN',
        name: trade.metadata.tokenName || trade.metadata.tokenSymbol || 'Token',
        decimals: 18, // Default to 18, most common for ERC-20
        chainId,
        image: trade.imageUrl,
      }
    : undefined;

  return { sourceToken, destToken };
};

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
  const [recentTrades, setRecentTrades] = useState<FeedItem[]>([]);
  const [isTradesLoading, setIsTradesLoading] = useState(false);

  const userAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );

  // Setup swap navigation for copy trade functionality
  const { goToSwaps } = useSwapBridgeNavigation({
    location: SwapBridgeNavigationLocation.TokenView,
    sourcePage: 'TraderDetailSheet',
  });

  /**
   * Handles the "Copy Trade" button press
   * Navigates to the swap page with pre-filled tokens
   */
  const handleCopyTrade = useCallback(
    (trade: FeedItem) => {
      const { sourceToken, destToken } = buildSwapTokens(trade);

      if (sourceToken && destToken) {
        // Close the sheet first, then navigate
        onClose();
        // Small delay to allow sheet to close before navigation
        setTimeout(() => {
          goToSwaps(sourceToken, destToken);
        }, 300);
      }
    },
    [goToSwaps, onClose],
  );

  // Fetch follow status when trader changes or sheet becomes visible
  useEffect(() => {
    const fetchFollowStatus = async () => {
      if (!userAddress || !trader?.id) {
        setIsFollowing(false);
        return;
      }

      setIsFollowLoading(true);
      try {
        const following = await LeaderboardService.isFollowing(
          userAddress,
          trader.id,
          trader.addresses,
        );
        setIsFollowing(following);
      } catch (error) {
        console.warn('Failed to fetch follow status:', error);
        setIsFollowing(false);
      } finally {
        setIsFollowLoading(false);
      }
    };

    if (isVisible && trader) {
      fetchFollowStatus();
    } else {
      setIsFollowing(false);
      setIsFollowLoading(false);
    }
  }, [trader?.id, trader?.addresses, userAddress, isVisible]);

  // Fetch recent trades when trader changes or sheet becomes visible
  useEffect(() => {
    const fetchRecentTrades = async () => {
      if (!trader?.addresses.length) {
        setRecentTrades([]);
        return;
      }

      setIsTradesLoading(true);
      try {
        // Fetch last 10 trades (no time filter to ensure we get some results)
        const trades = await LeaderboardService.getRecentTrades(
          trader.addresses,
          10,
        );
        setRecentTrades(trades);
      } catch (error) {
        console.warn('Failed to fetch recent trades:', error);
        setRecentTrades([]);
      } finally {
        setIsTradesLoading(false);
      }
    };

    if (isVisible && trader) {
      fetchRecentTrades();
    } else {
      setRecentTrades([]);
      setIsTradesLoading(false);
    }
  }, [trader?.id, trader?.addresses, isVisible]);

  const handleSheetClose = useCallback(() => {
    bottomSheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleFollowToggle = useCallback(async () => {
    if (!userAddress || !trader?.addresses.length) {
      return;
    }

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
    } catch {
      // Silently handle error - could add toast notification here
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

            {/* Recent Trades Section */}
            <Box twClassName="mb-4">
              <Text variant={TextVariant.BodyMd} twClassName="mb-2 font-medium">
                {strings('leaderboard.recent_trades')}
              </Text>

              {isTradesLoading ? (
                <Box
                  alignItems={BoxAlignItems.Center}
                  justifyContent={BoxJustifyContent.Center}
                  twClassName="py-4"
                >
                  <ActivityIndicator size="small" />
                </Box>
              ) : recentTrades.length === 0 ? (
                <Box twClassName="bg-muted rounded-xl p-3">
                  <Text
                    variant={TextVariant.BodySm}
                    twClassName="text-muted text-center"
                  >
                    {strings('leaderboard.no_recent_trades')}
                  </Text>
                </Box>
              ) : (
                <View style={tw.style('bg-muted rounded-xl overflow-hidden')}>
                  {/* ScrollView with max height for ~5 items (44px each) */}
                  <ScrollView
                    style={tw.style('max-h-56')}
                    showsVerticalScrollIndicator
                    nestedScrollEnabled
                  >
                    {recentTrades.map((trade, index) => {
                      // Get trade info from metadata
                      const latestTrade = trade.metadata?.trades?.[0];
                      const isBuy = latestTrade?.direction === 'buy';
                      const isSell = latestTrade?.direction === 'sell';
                      const tokenSymbol =
                        trade.metadata?.tokenSymbol || 'Token';
                      const chain = trade.metadata?.tokenChain;
                      const usdValue = latestTrade?.usdCost;

                      return (
                        <Box
                          key={trade.itemId}
                          flexDirection={BoxFlexDirection.Row}
                          alignItems={BoxAlignItems.Center}
                          justifyContent={BoxJustifyContent.Between}
                          twClassName={`px-3 py-2 ${index < recentTrades.length - 1 ? 'border-b border-muted' : ''}`}
                        >
                          <Box
                            flexDirection={BoxFlexDirection.Row}
                            alignItems={BoxAlignItems.Center}
                            twClassName="flex-1"
                          >
                            {/* Trade type indicator */}
                            <View
                              style={tw.style(
                                'w-7 h-7 rounded-full items-center justify-center mr-2',
                                isBuy
                                  ? 'bg-success-muted'
                                  : isSell
                                    ? 'bg-error-muted'
                                    : 'bg-alternative',
                              )}
                            >
                              <Icon
                                name={
                                  isBuy
                                    ? IconName.Add
                                    : isSell
                                      ? IconName.Minus
                                      : IconName.SwapHorizontal
                                }
                                size={IconSize.Xs}
                                color={
                                  isBuy
                                    ? IconColor.Success
                                    : isSell
                                      ? IconColor.Error
                                      : IconColor.Muted
                                }
                              />
                            </View>

                            {/* Trade details */}
                            <Box twClassName="flex-1">
                              <Box
                                flexDirection={BoxFlexDirection.Row}
                                alignItems={BoxAlignItems.Center}
                                gap={1}
                              >
                                <Text variant={TextVariant.BodySm}>
                                  {isBuy
                                    ? 'Bought'
                                    : isSell
                                      ? 'Sold'
                                      : 'Swapped'}
                                </Text>
                                <Text
                                  variant={TextVariant.BodySm}
                                  twClassName="font-medium"
                                >
                                  {tokenSymbol}
                                </Text>
                              </Box>
                              <Text
                                variant={TextVariant.BodyXs}
                                twClassName="text-muted"
                              >
                                {formatTimeAgo(trade.timestamp)}
                                {chain ? ` · ${chain}` : ''}
                              </Text>
                            </Box>
                          </Box>

                          {/* Copy Trade button - only show for buys */}
                          {isBuy && trade.metadata?.tokenAddress && (
                            <TouchableOpacity
                              onPress={() => handleCopyTrade(trade)}
                              style={tw.style(
                                'bg-success-default rounded-lg px-2 py-0.5 mr-3',
                              )}
                            >
                              <Text
                                variant={TextVariant.BodyXs}
                                twClassName="text-primary-inverse font-medium"
                              >
                                {strings('leaderboard.copy_trade')}
                              </Text>
                            </TouchableOpacity>
                          )}

                          {/* Trade value and copy button */}
                          <Box
                            flexDirection={BoxFlexDirection.Row}
                            alignItems={BoxAlignItems.Center}
                            gap={2}
                          >
                            {usdValue !== undefined && (
                              <Text
                                variant={TextVariant.BodySm}
                                twClassName={
                                  isBuy
                                    ? 'text-success-default'
                                    : isSell
                                      ? 'text-error-default'
                                      : ''
                                }
                              >
                                {isBuy ? '+' : isSell ? '-' : ''}
                                {formatUsdValue(usdValue)}
                              </Text>
                            )}
                          </Box>
                        </Box>
                      );
                    })}
                  </ScrollView>
                </View>
              )}
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
