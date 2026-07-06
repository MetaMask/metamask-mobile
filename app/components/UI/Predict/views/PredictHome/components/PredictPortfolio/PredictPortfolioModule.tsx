import React, { useCallback, useMemo } from 'react';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { Box } from '@metamask/design-system-react-native';
import { useSelector } from 'react-redux';
import Routes from '../../../../../../../constants/navigation/Routes';
import Engine from '../../../../../../../core/Engine';
import { selectMetaMaskPayFlags } from '../../../../../../../selectors/featureFlagController/confirmations';
import { selectPrivacyMode } from '../../../../../../../selectors/preferencesController';
import { PredictEventValues } from '../../../../constants/eventNames';
import { usePredictActionGuard } from '../../../../hooks/usePredictActionGuard';
import { usePredictPortfolio } from '../../../../hooks/usePredictPortfolio';
import type { PredictNavigationParamList } from '../../../../types/navigation';
import PredictClaimButton from '../../../../components/PredictActionButtons/PredictClaimButton';
import PredictPortfolioActions from './PredictPortfolioActions';
import PredictPortfolioSummary from './PredictPortfolioSummary';
import { PREDICT_PORTFOLIO_TEST_IDS } from './PredictPortfolio.testIds';
import { PredictHomeSelectorsIDs } from '../../../../Predict.testIds';

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
      openPositionsCount: openPositionCount,
      claimablePositionsCount: claimablePositionCount,
      hasClaimableWinnings,
      predictComponent:
        PredictEventValues.PREDICT_COMPONENT.PREDICT_PORTFOLIO_MODULE,
    }),
    [claimablePositionCount, hasClaimableWinnings, openPositionCount],
  );

  const trackPortfolioTransactionInitiated = useCallback(
    (transactionType: string, entryPoint: string) => {
      Engine.context.PredictController.trackPortfolioTransactionInitiated({
        ...portfolioAnalyticsProperties,
        entryPoint,
        transactionType,
      });
    },
    [portfolioAnalyticsProperties],
  );

  const handlePositionsPress = useCallback(() => {
    Engine.context.PredictController.trackPortfolioPositionsButtonTapped({
      ...portfolioAnalyticsProperties,
      entryPoint: PredictEventValues.ENTRY_POINT.HOMEPAGE_POSITIONS,
    });

    if (onPositionsPress) {
      onPositionsPress();
      return;
    }

    navigation.navigate(Routes.PREDICT.POSITIONS);
  }, [navigation, onPositionsPress, portfolioAnalyticsProperties]);

  const handleAddFundsPress = useCallback(() => {
    executeGuardedAction(
      () => {
        trackPortfolioTransactionInitiated(
          PredictEventValues.TRANSACTION_TYPE.MM_PREDICT_DEPOSIT,
          PredictEventValues.ENTRY_POINT.HOMEPAGE_BALANCE,
        );

        return deposit({
          analyticsProperties: {
            entryPoint: PredictEventValues.ENTRY_POINT.HOMEPAGE_BALANCE,
            predictComponent:
              PredictEventValues.PREDICT_COMPONENT.PREDICT_PORTFOLIO_MODULE,
          },
        });
      },
      { attemptedAction: PredictEventValues.ATTEMPTED_ACTION.DEPOSIT },
    );
  }, [deposit, executeGuardedAction, trackPortfolioTransactionInitiated]);

  const handleWithdrawPress = useCallback(() => {
    executeGuardedAction(
      async () => {
        if (!walletType) {
          return;
        }

        trackPortfolioTransactionInitiated(
          PredictEventValues.TRANSACTION_TYPE.MM_PREDICT_WITHDRAW,
          PredictEventValues.ENTRY_POINT.HOMEPAGE_BALANCE,
        );

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
    trackPortfolioTransactionInitiated,
    walletType,
    withdraw,
  ]);

  const handleClaimPress = useCallback(() => {
    executeGuardedAction(
      () =>
        claim({
          ...portfolioAnalyticsProperties,
          entryPoint: PredictEventValues.ENTRY_POINT.HOMEPAGE_POSITIONS,
        }),
      {
        attemptedAction: PredictEventValues.ATTEMPTED_ACTION.CLAIM,
      },
    );
  }, [claim, executeGuardedAction, portfolioAnalyticsProperties]);

  const isWithdrawDisabled = availableBalance > 0 && !walletType;

  return (
    <Box testID={PredictHomeSelectorsIDs.PORTFOLIO_MODULE} twClassName="gap-4">
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
