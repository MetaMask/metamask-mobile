import React, { useCallback, useEffect, useRef } from 'react';
import { Modal, Animated, View } from 'react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  Button,
  ButtonSize,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import { AvatarSize } from '../../../../../component-library/components/Avatars/Avatar/Avatar.types';
import AvatarToken from '../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import BadgeWrapper from '../../../../../component-library/components/Badges/BadgeWrapper';
import { BadgePosition } from '../../../../../component-library/components/Badges/BadgeWrapper/BadgeWrapper.types';
import Badge, {
  BadgeVariant,
} from '../../../../../component-library/components/Badges/Badge';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { selectPerpsEligibility } from '../../selectors/perpsController';
import {
  useColorPulseAnimation,
  useBalanceComparison,
  usePerpsTrading,
  usePerpsNetworkManagement,
} from '../../hooks';
import { usePerpsLiveAccount } from '../../hooks/stream';
import { formatPerpsFiat } from '../../utils/formatUtils';
import type { PerpsNavigationParamList } from '../../controllers/types';
import PerpsBottomSheetTooltip from '../PerpsBottomSheetTooltip';
import { PerpsMarketBalanceActionsSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';
import { BigNumber } from 'bignumber.js';
import {
  USDC_SYMBOL,
  USDC_TOKEN_ICON_URL,
} from '../../constants/hyperLiquidConfig';
import { useConfirmNavigation } from '../../../../Views/confirmations/hooks/useConfirmNavigation';
import HyperLiquidLogo from '../../../../../images/hl_icon.png';
import stylesheet from './PerpsMarketBalanceActions.styles';
import { useStyles } from '../../../../hooks/useStyles';
import { Skeleton } from '../../../../../component-library/components/Skeleton';

interface PerpsMarketBalanceActionsProps {}

const PerpsMarketBalanceActionsSkeleton: React.FC = () => {
  const tw = useTailwind();
  const { styles } = useStyles(stylesheet, {});

  return (
    <Box
      twClassName="mx-4 mt-4 mb-4 p-4 rounded-xl"
      style={tw.style('bg-background-section')}
      testID={`${PerpsMarketBalanceActionsSelectorsIDs.CONTAINER}_skeleton`}
    >
      {/* Balance Section Skeleton */}
      <Box twClassName="mb-3">
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="justify-between"
        >
          <Box>
            {/* Balance Value Skeleton */}
            <Skeleton
              width={120}
              height={24}
              style={styles.skeletonBalanceValue}
            />
            {/* Available Balance Label Skeleton */}
            <Skeleton width={100} height={14} />
          </Box>

          {/* Token Avatar Skeleton */}
          <Skeleton width={40} height={40} style={styles.skeletonAvatar} />
        </Box>
      </Box>

      {/* Buttons Section Skeleton */}
      <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-3">
        {/* Add Funds Button Skeleton */}
        <Box twClassName="flex-1">
          <Skeleton width="100%" height={48} style={styles.skeletonButton} />
        </Box>
        {/* Withdraw Button Skeleton */}
        <Box twClassName="flex-1">
          <Skeleton width="100%" height={48} style={styles.skeletonButton} />
        </Box>
      </Box>
    </Box>
  );
};

const PerpsMarketBalanceActions: React.FC<
  PerpsMarketBalanceActionsProps
> = () => {
  const tw = useTailwind();
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();
  const isEligible = useSelector(selectPerpsEligibility);

  const { styles } = useStyles(stylesheet, {});

  // State for eligibility modal
  const [isEligibilityModalVisible, setIsEligibilityModalVisible] =
    React.useState(false);

  // Use live account data with 1 second throttle for balance display
  const { account: perpsAccount, isInitialLoading } = usePerpsLiveAccount({
    throttleMs: 1000,
  });

  // Trading and network management hooks
  const { depositWithConfirmation } = usePerpsTrading();
  const { ensureArbitrumNetworkExists } = usePerpsNetworkManagement();
  const { navigateToConfirmation } = useConfirmNavigation();

  // Use the reusable hooks for balance animation
  const {
    startPulseAnimation: startBalancePulse,
    getAnimatedStyle: getBalanceAnimatedStyle,
    stopAnimation: stopBalanceAnimation,
  } = useColorPulseAnimation();
  const { compareAndUpdateBalance } = useBalanceComparison();

  // Track previous value for animation
  const previousBalanceRef = useRef<string>('');

  // Animate balance changes
  useEffect(() => {
    if (!perpsAccount) return;

    // Use availableBalance since that's what we display in the UI for available balance
    const currentBalance = perpsAccount.availableBalance;

    // Only animate if balance actually changed (and we have a previous value to compare)
    if (
      previousBalanceRef.current &&
      previousBalanceRef.current !== currentBalance
    ) {
      // Compare with previous balance and get animation type
      const balanceChange = compareAndUpdateBalance(currentBalance);

      // Start pulse animation with appropriate color
      try {
        startBalancePulse(balanceChange);
      } catch (animationError) {
        // Silently handle animation errors to avoid disrupting UX
      }
    }

    previousBalanceRef.current = currentBalance;
  }, [perpsAccount, startBalancePulse, compareAndUpdateBalance]);

  // Cleanup animations on unmount
  useEffect(
    () => () => {
      stopBalanceAnimation();
    },
    [stopBalanceAnimation],
  );

  const handleAddFunds = useCallback(async () => {
    if (!isEligible) {
      setIsEligibilityModalVisible(true);
      return;
    }

    try {
      // Ensure the network exists before proceeding
      await ensureArbitrumNetworkExists();

      // Navigate immediately to confirmations screen for instant UI response
      navigateToConfirmation({ stack: Routes.PERPS.ROOT });

      // Initialize deposit in the background without blocking
      depositWithConfirmation().catch((error) => {
        console.error('Failed to initialize deposit:', error);
      });
    } catch (error) {
      console.error('Failed to proceed with deposit:', error);
    }
  }, [
    isEligible,
    ensureArbitrumNetworkExists,
    navigateToConfirmation,
    depositWithConfirmation,
  ]);

  const handleWithdraw = useCallback(async () => {
    if (!isEligible) {
      setIsEligibilityModalVisible(true);
      return;
    }

    try {
      // Ensure the network exists before proceeding
      await ensureArbitrumNetworkExists();

      // Navigate to withdraw view
      navigation.navigate(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.WITHDRAW,
      });
    } catch (error) {
      console.error('Failed to proceed with withdraw:', error);
    }
  }, [navigation, isEligible, ensureArbitrumNetworkExists]);

  const availableBalance = perpsAccount?.availableBalance || '0';
  const isBalanceEmpty = BigNumber(availableBalance).isZero();

  // Show skeleton while loading initial account data
  if (isInitialLoading) {
    return <PerpsMarketBalanceActionsSkeleton />;
  }

  // Don't render if no balance data is available yet
  if (!perpsAccount) {
    return null;
  }

  return (
    <>
      <Box
        twClassName="mx-4 mt-4 mb-4 p-4 rounded-xl"
        style={tw.style('bg-background-section')}
        testID={PerpsMarketBalanceActionsSelectorsIDs.CONTAINER}
      >
        {/* Balance Section */}
        <Box twClassName="mb-3">
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="justify-between"
          >
            <Box>
              <Animated.View style={[getBalanceAnimatedStyle]}>
                <Text
                  variant={TextVariant.HeadingMD}
                  color={TextColor.Default}
                  testID={PerpsMarketBalanceActionsSelectorsIDs.BALANCE_VALUE}
                >
                  {formatPerpsFiat(availableBalance)}
                </Text>
              </Animated.View>
              <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
                {strings('perps.available_balance')}
              </Text>
            </Box>

            {/* USDC Token Avatar with HyperLiquid Badge */}
            <BadgeWrapper
              style={styles.assetIconWrapper}
              badgePosition={BadgePosition.BottomRight}
              badgeElement={
                <Badge
                  variant={BadgeVariant.Network}
                  imageSource={HyperLiquidLogo}
                  name="HyperLiquid"
                  style={styles.hyperliquidIcon}
                />
              }
            >
              <AvatarToken
                name={USDC_SYMBOL}
                imageSource={{ uri: USDC_TOKEN_ICON_URL }}
                size={AvatarSize.Md}
              />
            </BadgeWrapper>
          </Box>
        </Box>

        {/* Buttons Section */}
        <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-3">
          {/* Add Funds Button */}
          <Box twClassName="flex-1">
            <Button
              variant={
                isBalanceEmpty ? ButtonVariant.Primary : ButtonVariant.Secondary
              }
              size={ButtonSize.Lg}
              onPress={handleAddFunds}
              isFullWidth
              testID={PerpsMarketBalanceActionsSelectorsIDs.ADD_FUNDS_BUTTON}
            >
              {strings('perps.add_funds')}
            </Button>
          </Box>

          {/* Withdraw Button */}
          {!isBalanceEmpty && (
            <Box twClassName="flex-1">
              <Button
                variant={ButtonVariant.Secondary}
                size={ButtonSize.Lg}
                onPress={handleWithdraw}
                isFullWidth
                testID={PerpsMarketBalanceActionsSelectorsIDs.WITHDRAW_BUTTON}
              >
                {strings('perps.withdraw')}
              </Button>
            </Box>
          )}
        </Box>
      </Box>

      {/* Eligibility Modal */}
      {isEligibilityModalVisible && (
        // Android Compatibility: Wrap the <Modal> in a plain <View> component to prevent rendering issues and freezing.
        <View>
          <Modal visible transparent animationType="none" statusBarTranslucent>
            <PerpsBottomSheetTooltip
              isVisible
              onClose={() => setIsEligibilityModalVisible(false)}
              contentKey={'geo_block'}
              testID={
                PerpsMarketBalanceActionsSelectorsIDs.GEO_BLOCK_BOTTOM_SHEET_TOOLTIP
              }
            />
          </Modal>
        </View>
      )}
    </>
  );
};

export default PerpsMarketBalanceActions;
