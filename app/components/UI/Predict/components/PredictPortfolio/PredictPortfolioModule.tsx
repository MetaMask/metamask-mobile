import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { Box } from '@metamask/design-system-react-native';
import { useSelector } from 'react-redux';
import Routes from '../../../../../constants/navigation/Routes';
import Engine from '../../../../../core/Engine';
import { selectMetaMaskPayFlags } from '../../../../../selectors/featureFlagController/confirmations';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import { PredictEventValues } from '../../constants/eventNames';
import { usePredictActionGuard } from '../../hooks/usePredictActionGuard';
import { usePredictPortfolio } from '../../hooks/usePredictPortfolio';
import type { PredictNavigationParamList } from '../../types/navigation';
import PredictClaimButton from '../PredictActionButtons/PredictClaimButton';
import PredictPortfolioActions from './PredictPortfolioActions';
import PredictPortfolioSummary from './PredictPortfolioSummary';
import { PREDICT_PORTFOLIO_TEST_IDS } from './PredictPortfolio.testIds';

export interface PredictPortfolioModuleProps {
  onDepositWalletWithdrawPress?: () => void;
  onPositionsPress?: () => void;
}

const PredictPortfolioModule: React.FC<PredictPortfolioModuleProps> = ({
  onDepositWalletWithdrawPress,
  onPositionsPress,
}) => {
  const privacyMode = useSelector(selectPrivacyMode);
  const { enableDepositWalletWithdraw } = useSelector(selectMetaMaskPayFlags);
  const navigation =
    useNavigation<NavigationProp<PredictNavigationParamList>>();
  const hasTrackedModuleViewedRef = useRef(false);
  const { executeGuardedAction } = usePredictActionGuard({ navigation });
  const {
    availableBalance,
    claim,
    claimableAmount,
    claimablePositionCount,
    deposit,
    hasClaimableWinnings,
    isClaimPending,
    isLoading,
    openPositionCount,
    portfolioValue,
    positionsBadgeCount,
    showPnlLine,
    totalUnrealizedPnlAmount,
    totalUnrealizedPnlPercent,
    walletType,
    withdraw,
  } = usePredictPortfolio();

  const portfolioAnalyticsProperties = useMemo(
    () => ({
      positionsCount: openPositionCount,
      claimablePositionsCount: claimablePositionCount,
      hasClaimableWinnings,
      source: PredictEventValues.SOURCE.PREDICT_PORTFOLIO_MODULE,
    }),
    [claimablePositionCount, hasClaimableWinnings, openPositionCount],
  );

  useEffect(() => {
    if (isLoading || hasTrackedModuleViewedRef.current) {
      return;
    }

    Engine.context.PredictController.trackPortfolioModuleViewed({
      ...portfolioAnalyticsProperties,
      entryPoint: PredictEventValues.ENTRY_POINT.HOME_SECTION,
    });
    hasTrackedModuleViewedRef.current = true;
  }, [isLoading, portfolioAnalyticsProperties]);

  const trackPortfolioAction = useCallback(
    (ctaName: string, entryPoint: string) => {
      Engine.context.PredictController.trackPortfolioAction({
        ...portfolioAnalyticsProperties,
        ctaName,
        entryPoint,
      });
    },
    [portfolioAnalyticsProperties],
  );

  const handlePositionsPress = useCallback(() => {
    trackPortfolioAction(
      PredictEventValues.CTA_NAME.POSITIONS,
      PredictEventValues.ENTRY_POINT.HOMEPAGE_POSITIONS,
    );

    if (onPositionsPress) {
      onPositionsPress();
      return;
    }

    // Temporary fallback until the dedicated Predict Positions route lands.
    navigation.navigate(Routes.PREDICT.MARKET_LIST, {
      entryPoint: PredictEventValues.ENTRY_POINT.HOMEPAGE_POSITIONS,
    });
  }, [navigation, onPositionsPress, trackPortfolioAction]);

  const handleAddFundsPress = useCallback(() => {
    trackPortfolioAction(
      PredictEventValues.CTA_NAME.ADD_FUNDS,
      PredictEventValues.ENTRY_POINT.HOMEPAGE_BALANCE,
    );

    executeGuardedAction(
      () =>
        deposit({
          analyticsProperties: {
            entryPoint: PredictEventValues.ENTRY_POINT.HOMEPAGE_BALANCE,
          },
        }),
      { attemptedAction: PredictEventValues.ATTEMPTED_ACTION.DEPOSIT },
    );
  }, [deposit, executeGuardedAction, trackPortfolioAction]);

  const handleWithdrawPress = useCallback(() => {
    trackPortfolioAction(
      PredictEventValues.CTA_NAME.WITHDRAW,
      PredictEventValues.ENTRY_POINT.HOMEPAGE_BALANCE,
    );

    executeGuardedAction(
      async () => {
        if (!walletType) {
          return;
        }

        if (walletType === 'deposit-wallet' && !enableDepositWalletWithdraw) {
          onDepositWalletWithdrawPress?.();
          return;
        }

        await withdraw();
      },
      { attemptedAction: PredictEventValues.ATTEMPTED_ACTION.WITHDRAW },
    );
  }, [
    enableDepositWalletWithdraw,
    executeGuardedAction,
    onDepositWalletWithdrawPress,
    trackPortfolioAction,
    walletType,
    withdraw,
  ]);

  const handleClaimPress = useCallback(() => {
    trackPortfolioAction(
      PredictEventValues.CTA_NAME.CLAIM_ALL,
      PredictEventValues.ENTRY_POINT.HOMEPAGE_POSITIONS,
    );

    executeGuardedAction(() => claim(), {
      attemptedAction: PredictEventValues.ATTEMPTED_ACTION.CLAIM,
    });
  }, [claim, executeGuardedAction, trackPortfolioAction]);

  const isWithdrawDisabled = availableBalance > 0 && !walletType;

  return (
    <Box testID={PREDICT_PORTFOLIO_TEST_IDS.MODULE} twClassName="gap-4">
      <PredictPortfolioSummary
        availableBalance={availableBalance}
        isHidden={Boolean(privacyMode)}
        isLoading={isLoading}
        portfolioValue={portfolioValue}
        showPnlLine={showPnlLine}
        totalUnrealizedPnlAmount={totalUnrealizedPnlAmount}
        totalUnrealizedPnlPercent={totalUnrealizedPnlPercent}
      />

      <PredictPortfolioActions
        isWithdrawDisabled={isWithdrawDisabled}
        onAddFundsPress={handleAddFundsPress}
        onPositionsPress={handlePositionsPress}
        onWithdrawPress={handleWithdrawPress}
        positionsBadgeCount={positionsBadgeCount}
      />

      {hasClaimableWinnings && (
        <PredictClaimButton
          amount={claimableAmount}
          isHidden={Boolean(privacyMode)}
          isLoading={isClaimPending}
          onPress={handleClaimPress}
          testID={PREDICT_PORTFOLIO_TEST_IDS.CLAIM_BUTTON}
        />
      )}
    </Box>
  );
};

export default PredictPortfolioModule;
