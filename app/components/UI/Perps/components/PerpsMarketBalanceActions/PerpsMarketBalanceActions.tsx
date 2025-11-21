import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
} from 'react';
import { Animated, Image, Modal } from 'react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxFlexDirection,
  Button,
  ButtonSize,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { LEARN_MORE_CONFIG } from '../../constants/perpsConfig';
import {
  useColorPulseAnimation,
  useBalanceComparison,
  usePerpsTrading,
  usePerpsNetworkManagement,
} from '../../hooks';
import { selectPerpsEligibility } from '../../selectors/perpsController';
import { useConfirmNavigation } from '../../../../Views/confirmations/hooks/useConfirmNavigation';
import PerpsBottomSheetTooltip from '../PerpsBottomSheetTooltip';
import { usePerpsLiveAccount } from '../../hooks/stream';
import {
  formatPerpsFiat,
  formatPnl,
  formatPercentage,
} from '../../utils/formatUtils';
import type {
  PerpsNavigationParamList,
  Position,
} from '../../controllers/types';
import { PerpsMarketBalanceActionsSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';
import { BigNumber } from 'bignumber.js';
import { INITIAL_AMOUNT_UI_PROGRESS } from '../../constants/hyperLiquidConfig';
import { usePerpsDepositProgress } from '../../hooks/usePerpsDepositProgress';
import { usePerpsTransactionState } from '../../hooks/usePerpsTransactionState';
import { convertPerpsAmountToUSD } from '../../utils/amountConversion';
import PerpsEmptyStateIcon from '../../../../../images/perps-home-empty-state.png';
import { Skeleton } from '../../../../../component-library/components/Skeleton';
import DevLogger from '../../../../../core/SDKConnect/utils/DevLogger';
import { PerpsProgressBar } from '../PerpsProgressBar';
import { RootState } from '../../../../../reducers';

interface PerpsMarketBalanceActionsProps {
  positions?: Position[];
  showActionButtons?: boolean;
}

const PerpsMarketBalanceActionsSkeleton: React.FC = () => {
  const tw = useTailwind();

  return (
    <Box
      twClassName="mx-4 mt-4 mb-4 px-4 py-6 rounded-xl"
      style={tw.style('bg-background-section')}
      testID={`${PerpsMarketBalanceActionsSelectorsIDs.CONTAINER}_skeleton`}
    >
      {/* Balance Section Skeleton */}
      <Box>
        {/* Large Balance Value Skeleton */}
        <Skeleton width={200} height={48} style={tw.style('mb-2')} />
        {/* Secondary Balance Info Skeleton */}
        <Skeleton width={250} height={16} />
      </Box>
    </Box>
  );
};

const PerpsMarketBalanceActions: React.FC<PerpsMarketBalanceActionsProps> = ({
  positions = [],
  showActionButtons = true,
}) => {
  const tw = useTailwind();
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();
  const { isDepositInProgress } = usePerpsDepositProgress();

  // Get withdrawal requests from controller state
  const withdrawalRequests = useSelector(
    (state: RootState) =>
      state.engine.backgroundState.PerpsController?.withdrawalRequests || [],
  );

  // State for transaction amount
  const [transactionAmountWei, setTransactionAmountWei] = useState<
    string | null
  >(null);

  // State for eligibility modal
  const [isEligibilityModalVisible, setIsEligibilityModalVisible] =
    useState(false);

  // Eligibility and trading hooks
  const isEligible = useSelector(selectPerpsEligibility);
  const { depositWithConfirmation } = usePerpsTrading();
  const { ensureArbitrumNetworkExists } = usePerpsNetworkManagement();
  const { navigateToConfirmation } = useConfirmNavigation();

  // Extract all transaction state logic
  const {
    withdrawalAmount,
    hasActiveWithdrawals,
    statusText,
    isAnyTransactionInProgress,
  } = usePerpsTransactionState({
    withdrawalRequests,
    isDepositInProgress,
  });

  // Memoized conditions for cleaner logic
  const isOnlyDepositInProgress = useMemo(
    () => isDepositInProgress && !hasActiveWithdrawals,
    [isDepositInProgress, hasActiveWithdrawals],
  );

  const isOnlyWithdrawalInProgress = useMemo(
    () => !isDepositInProgress && hasActiveWithdrawals,
    [isDepositInProgress, hasActiveWithdrawals],
  );

  const shouldShowDollarAmount = useMemo(
    () =>
      (isOnlyDepositInProgress && transactionAmountWei) ||
      (isOnlyWithdrawalInProgress && withdrawalAmount),
    [
      isOnlyDepositInProgress,
      isOnlyWithdrawalInProgress,
      transactionAmountWei,
      withdrawalAmount,
    ],
  );

  // Use live account data with 1 second throttle for balance display
  const { account: perpsAccount, isInitialLoading } = usePerpsLiveAccount({
    throttleMs: 1000,
  });

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

    const currentBalance = perpsAccount.totalBalance;

    if (
      previousBalanceRef.current &&
      previousBalanceRef.current !== currentBalance
    ) {
      const balanceChange = compareAndUpdateBalance(currentBalance);

      try {
        startBalancePulse(balanceChange);
      } catch (animationError) {
        DevLogger.log(
          'PerpsMarketBalanceActions: Balance animation error:',
          animationError,
        );
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

  const totalBalance = perpsAccount?.totalBalance || '0';
  const availableBalance = perpsAccount?.availableBalance || '0';
  const unrealizedPnl = perpsAccount?.unrealizedPnl || '0';
  const roe = parseFloat(perpsAccount?.returnOnEquity || '0');
  const isBalanceEmpty = BigNumber(totalBalance).isZero();
  const hasPositions = positions.length > 0;

  const pnlNum = useMemo(() => parseFloat(unrealizedPnl), [unrealizedPnl]);
  const pnlColor = useMemo(() => {
    if (pnlNum > 0) return TextColor.Success;
    if (pnlNum < 0) return TextColor.Error;
    return TextColor.Alternative;
  }, [pnlNum]);

  const handleLearnMore = useCallback(() => {
    navigation.navigate(Routes.PERPS.TUTORIAL, {
      source: 'homescreen',
    });
  }, [navigation]);

  // Add funds handler
  const handleAddFunds = useCallback(async () => {
    if (!isEligible) {
      setIsEligibilityModalVisible(true);
      return;
    }

    try {
      await ensureArbitrumNetworkExists();
      navigateToConfirmation({ stack: Routes.PERPS.ROOT });
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

  // Withdraw handler
  const handleWithdraw = useCallback(async () => {
    if (!isEligible) {
      setIsEligibilityModalVisible(true);
      return;
    }

    try {
      await ensureArbitrumNetworkExists();
      navigation.navigate(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.WITHDRAW,
      });
    } catch (error) {
      console.error('Failed to proceed with withdraw:', error);
    }
  }, [navigation, isEligible, ensureArbitrumNetworkExists]);

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
        testID={PerpsMarketBalanceActionsSelectorsIDs.CONTAINER}
        twClassName={isBalanceEmpty ? 'mx-4 mt-4 mb-4 rounded-xl' : ''}
        style={isBalanceEmpty ? tw.style('bg-background-section') : undefined}
      >
        <PerpsProgressBar
          progressAmount={INITIAL_AMOUNT_UI_PROGRESS}
          height={4}
          onTransactionAmountChange={setTransactionAmountWei}
        />
        {/* Single Progress Section */}
        {isAnyTransactionInProgress && (
          <Box twClassName="p-4">
            <Box twClassName="w-full flex-row justify-between">
              <Text
                variant={TextVariant.BodySMMedium}
                color={TextColor.Default}
              >
                {statusText}
              </Text>
              {/* Only show dollar value when there's a single transaction in progress */}
              {shouldShowDollarAmount && (
                <Text
                  variant={TextVariant.BodySMMedium}
                  color={TextColor.Default}
                >
                  {isOnlyDepositInProgress && transactionAmountWei
                    ? convertPerpsAmountToUSD(transactionAmountWei)
                    : isOnlyWithdrawalInProgress && withdrawalAmount
                      ? convertPerpsAmountToUSD(withdrawalAmount)
                      : null}
                </Text>
              )}
            </Box>
          </Box>
        )}
        {isAnyTransactionInProgress && (
          <Box twClassName="w-full border-b border-muted"></Box>
        )}
        {/* Balance Section */}
        {isBalanceEmpty ? (
          <Box twClassName="p-6">
            <Box twClassName="items-center mb-6">
              <Image
                source={PerpsEmptyStateIcon}
                style={tw.style('w-24 h-24 mb-4')}
                resizeMode="contain"
              />
              <Text
                variant={TextVariant.HeadingMD}
                color={TextColor.Default}
                style={tw.style('mb-2 text-center')}
              >
                {strings('perps.trade_perps')}
              </Text>
              <Text
                variant={TextVariant.BodyMD}
                color={TextColor.Alternative}
                style={tw.style('text-center')}
              >
                {strings('perps.trade_perps_description')}
              </Text>
            </Box>
            <Button
              variant={ButtonVariant.Primary}
              size={ButtonSize.Lg}
              onPress={handleAddFunds}
              isFullWidth
              testID={PerpsMarketBalanceActionsSelectorsIDs.ADD_FUNDS_BUTTON}
              style={tw.style('mb-3')}
            >
              {strings('perps.add_funds')}
            </Button>
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Lg}
              onPress={handleLearnMore}
              isFullWidth
              testID={PerpsMarketBalanceActionsSelectorsIDs.LEARN_MORE_BUTTON}
            >
              {strings(LEARN_MORE_CONFIG.TITLE_KEY)}
            </Button>
          </Box>
        ) : (
          <Box twClassName="px-4 pt-4 pb-2">
            <Animated.View style={[getBalanceAnimatedStyle]}>
              <Text
                variant={TextVariant.DisplayMD}
                color={TextColor.Default}
                testID={PerpsMarketBalanceActionsSelectorsIDs.BALANCE_VALUE}
              >
                {formatPerpsFiat(totalBalance)}
              </Text>
            </Animated.View>
            <Box twClassName="flex-row items-center mt-2">
              <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
                {formatPerpsFiat(availableBalance)} {strings('perps.available')}
              </Text>
              {hasPositions && !BigNumber(unrealizedPnl).isZero() && (
                <>
                  <Text
                    variant={TextVariant.BodyMD}
                    color={TextColor.Alternative}
                  >
                    {' · P&L '}
                  </Text>
                  <Text variant={TextVariant.BodyMD} color={pnlColor}>
                    {formatPnl(pnlNum)} ({formatPercentage(roe, 1)})
                  </Text>
                </>
              )}
            </Box>
            {/* Action Buttons */}
            {showActionButtons && (
              <Box twClassName="gap-3" flexDirection={BoxFlexDirection.Row}>
                <Box twClassName="flex-1">
                  <Button
                    variant={ButtonVariant.Secondary}
                    size={ButtonSize.Lg}
                    onPress={handleWithdraw}
                    isFullWidth
                    testID={
                      PerpsMarketBalanceActionsSelectorsIDs.WITHDRAW_BUTTON
                    }
                  >
                    {strings('perps.withdraw')}
                  </Button>
                </Box>
                <Box twClassName="flex-1">
                  <Button
                    variant={ButtonVariant.Primary}
                    size={ButtonSize.Lg}
                    onPress={handleAddFunds}
                    isFullWidth
                    testID={
                      PerpsMarketBalanceActionsSelectorsIDs.ADD_FUNDS_BUTTON
                    }
                  >
                    {strings('perps.add_funds')}
                  </Button>
                </Box>
              </Box>
            )}
          </Box>
        )}
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
