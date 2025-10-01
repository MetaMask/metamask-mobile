import React, { useCallback, useEffect, useRef } from 'react';
import { Modal, Animated, View } from 'react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  ButtonBase,
  BoxFlexDirection,
  BoxAlignItems,
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
import images from '../../../../../images/image-icons';
import { usePerpsDepositProgress } from '../../hooks/usePerpsDepositProgress';

interface PerpsMarketBalanceActionsProps {}

const PerpsMarketBalanceActions: React.FC<
  PerpsMarketBalanceActionsProps
> = () => {
  const tw = useTailwind();
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();
  const isEligible = useSelector(selectPerpsEligibility);
  const { isDepositInProgress } = usePerpsDepositProgress();

  // State for eligibility modal
  const [isEligibilityModalVisible, setIsEligibilityModalVisible] =
    React.useState(false);

  // Use live account data with 1 second throttle for balance display
  const { account: perpsAccount } = usePerpsLiveAccount({ throttleMs: 1000 });

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
        {/* Deposit Progress Section */}
        {isDepositInProgress && (
          <Box twClassName="mb-4 pb-4 border-b border-muted">
            <Text variant={TextVariant.BodySMMedium} color={TextColor.Default}>
              {strings('perps.deposit_in_progress')}
            </Text>
          </Box>
        )}

        {/* Balance Section */}
        <Box twClassName="mb-4">
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="justify-between"
          >
            <Box>
              <Text
                variant={TextVariant.BodySM}
                color={TextColor.Alternative}
                style={tw.style('mb-1')}
              >
                {strings('perps.available_balance')}
              </Text>
              <Animated.View style={[getBalanceAnimatedStyle]}>
                <Text
                  variant={TextVariant.HeadingMD}
                  color={TextColor.Default}
                  testID={PerpsMarketBalanceActionsSelectorsIDs.BALANCE_VALUE}
                >
                  {formatPerpsFiat(availableBalance)}
                </Text>
              </Animated.View>
            </Box>

            {/* USDC Token Avatar with HyperLiquid Badge */}
            <BadgeWrapper
              badgePosition={BadgePosition.BottomRight}
              badgeElement={
                <Badge
                  variant={BadgeVariant.Network}
                  imageSource={images.HL}
                  name="HyperLiquid"
                />
              }
            >
              <AvatarToken
                name={USDC_SYMBOL}
                imageSource={{ uri: USDC_TOKEN_ICON_URL }}
                size={AvatarSize.Lg}
              />
            </BadgeWrapper>
          </Box>
        </Box>

        {/* Buttons Section */}
        <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-3">
          {/* Add Funds Button */}
          <Box twClassName="flex-1">
            <ButtonBase
              twClassName="h-12 rounded-xl"
              style={({ pressed }) =>
                tw.style(
                  'bg-subsection flex-row items-center justify-center w-full',
                  pressed && !isDepositInProgress && 'bg-background-pressed',
                  isDepositInProgress && 'opacity-50',
                )
              }
              onPress={isDepositInProgress ? undefined : handleAddFunds}
              disabled={isDepositInProgress}
              testID={PerpsMarketBalanceActionsSelectorsIDs.ADD_FUNDS_BUTTON}
            >
              <Text
                variant={TextVariant.BodyMDMedium}
                color={
                  isDepositInProgress ? TextColor.Muted : TextColor.Default
                }
              >
                {strings('perps.add_funds')}
              </Text>
            </ButtonBase>
          </Box>

          {/* Withdraw Button */}
          {!isBalanceEmpty && (
            <Box twClassName="flex-1">
              <ButtonBase
                twClassName="h-12 rounded-xl"
                style={({ pressed }) =>
                  tw.style(
                    'bg-subsection flex-row items-center justify-center w-full',
                    pressed && !isDepositInProgress && 'bg-background-pressed',
                    isDepositInProgress && 'opacity-50',
                  )
                }
                onPress={isDepositInProgress ? undefined : handleWithdraw}
                disabled={isDepositInProgress}
                testID={PerpsMarketBalanceActionsSelectorsIDs.WITHDRAW_BUTTON}
              >
                <Text
                  variant={TextVariant.BodyMDMedium}
                  color={
                    isDepositInProgress ? TextColor.Muted : TextColor.Default
                  }
                >
                  {strings('perps.withdraw')}
                </Text>
              </ButtonBase>
            </Box>
          )}
        </Box>
        {isDepositInProgress && (
          <Text
            variant={TextVariant.BodyXS}
            color={TextColor.Alternative}
            style={tw.style('mt-2 text-center')}
          >
            {strings('perps.deposit_pending_try_again')}
          </Text>
        )}
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
