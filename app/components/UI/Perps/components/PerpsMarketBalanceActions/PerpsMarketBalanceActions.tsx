import React, { useCallback, useEffect, useRef } from 'react';
import { Modal, Animated } from 'react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  ButtonBase,
  BoxFlexDirection,
  BoxAlignItems,
  FontWeight,
} from '@metamask/design-system-react-native';
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
import { USDC_SYMBOL } from '../../constants/hyperLiquidConfig';
import { useConfirmNavigation } from '../../../../Views/confirmations/hooks/useConfirmNavigation';
import images from '../../../../../images/image-icons';

// Constants
const USDC_TOKEN_URL =
  'https://static.cx.metamask.io/api/v1/tokenIcons/1/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png';

interface PerpsMarketBalanceActionsProps {}

const PerpsMarketBalanceActions: React.FC<
  PerpsMarketBalanceActionsProps
> = () => {
  const tw = useTailwind();
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();
  const isEligible = useSelector(selectPerpsEligibility);

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

    // Use totalBalance since that's what we display in the UI for available balance
    const currentBalance = perpsAccount.totalBalance;

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

  const totalBalance = perpsAccount?.totalBalance || '0';
  const isBalanceEmpty = BigNumber(totalBalance).isZero();

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
        <Box twClassName="mb-4">
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="justify-between"
          >
            <Box>
              <Text
                fontWeight={FontWeight.Medium}
                style={tw.style('text-text-alternative text-sm mb-1')}
              >
                {strings('perps.available_balance')}
              </Text>
              <Animated.View style={[getBalanceAnimatedStyle]}>
                <Text
                  fontWeight={FontWeight.Bold}
                  style={tw.style('text-text-default text-2xl')}
                  testID={PerpsMarketBalanceActionsSelectorsIDs.BALANCE_VALUE}
                >
                  {formatPerpsFiat(totalBalance)}
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
                imageSource={{ uri: USDC_TOKEN_URL }}
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
                  pressed && 'bg-background-pressed',
                )
              }
              onPress={handleAddFunds}
              testID={PerpsMarketBalanceActionsSelectorsIDs.ADD_FUNDS_BUTTON}
            >
              <Text
                fontWeight={FontWeight.Medium}
                style={tw.style('text-text-default text-base')}
              >
                {strings('perps.add_funds')}
              </Text>
            </ButtonBase>
          </Box>

          {/* Withdraw Button */}
          <Box twClassName="flex-1">
            <ButtonBase
              twClassName="h-12 rounded-xl"
              style={({ pressed }) =>
                tw.style(
                  'bg-subsection flex-row items-center justify-center w-full',
                  pressed && 'bg-background-pressed',
                  isBalanceEmpty && 'opacity-50',
                )
              }
              onPress={handleWithdraw}
              testID={PerpsMarketBalanceActionsSelectorsIDs.WITHDRAW_BUTTON}
              disabled={isBalanceEmpty}
            >
              <Text
                fontWeight={FontWeight.Medium}
                style={tw.style(
                  'text-text-default text-base',
                  isBalanceEmpty && 'text-text-muted',
                )}
              >
                {strings('perps.withdraw')}
              </Text>
            </ButtonBase>
          </Box>
        </Box>
      </Box>

      {/* Eligibility Modal */}
      {isEligibilityModalVisible && (
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
      )}
    </>
  );
};

export default PerpsMarketBalanceActions;
