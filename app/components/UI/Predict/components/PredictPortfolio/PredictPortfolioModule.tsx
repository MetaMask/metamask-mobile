import React, { useCallback } from 'react';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { Box } from '@metamask/design-system-react-native';
import { useSelector } from 'react-redux';
import Routes from '../../../../../constants/navigation/Routes';
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
  const { executeGuardedAction } = usePredictActionGuard({ navigation });
  const portfolio = usePredictPortfolio();

  const handlePositionsPress = useCallback(() => {
    if (onPositionsPress) {
      onPositionsPress();
      return;
    }

    // Temporary fallback until the dedicated Predict Positions route lands.
    navigation.navigate(Routes.PREDICT.MARKET_LIST, {
      entryPoint: PredictEventValues.ENTRY_POINT.HOMEPAGE_POSITIONS,
    });
  }, [navigation, onPositionsPress]);

  const handleAddFundsPress = useCallback(() => {
    executeGuardedAction(
      () =>
        portfolio.deposit({
          analyticsProperties: {
            entryPoint: PredictEventValues.ENTRY_POINT.HOMEPAGE_BALANCE,
          },
        }),
      { attemptedAction: PredictEventValues.ATTEMPTED_ACTION.DEPOSIT },
    );
  }, [executeGuardedAction, portfolio]);

  const handleWithdrawPress = useCallback(() => {
    executeGuardedAction(
      async () => {
        if (!portfolio.walletType) {
          return;
        }

        if (
          portfolio.walletType === 'deposit-wallet' &&
          !enableDepositWalletWithdraw
        ) {
          onDepositWalletWithdrawPress?.();
          return;
        }

        await portfolio.withdraw();
      },
      { attemptedAction: PredictEventValues.ATTEMPTED_ACTION.WITHDRAW },
    );
  }, [
    enableDepositWalletWithdraw,
    executeGuardedAction,
    onDepositWalletWithdrawPress,
    portfolio,
  ]);

  const handleClaimPress = useCallback(() => {
    executeGuardedAction(() => portfolio.claim(), {
      attemptedAction: PredictEventValues.ATTEMPTED_ACTION.CLAIM,
    });
  }, [executeGuardedAction, portfolio]);

  const isWithdrawDisabled =
    portfolio.availableBalance > 0 && !portfolio.walletType;

  return (
    <Box testID={PREDICT_PORTFOLIO_TEST_IDS.MODULE} twClassName="gap-4">
      <PredictPortfolioSummary
        availableBalance={portfolio.availableBalance}
        isHidden={Boolean(privacyMode)}
        isLoading={portfolio.isLoading}
        portfolioValue={portfolio.portfolioValue}
        showPnlLine={portfolio.showPnlLine}
        totalUnrealizedPnlAmount={portfolio.totalUnrealizedPnlAmount}
        totalUnrealizedPnlPercent={portfolio.totalUnrealizedPnlPercent}
      />

      <PredictPortfolioActions
        isWithdrawDisabled={isWithdrawDisabled}
        onAddFundsPress={handleAddFundsPress}
        onPositionsPress={handlePositionsPress}
        onWithdrawPress={handleWithdrawPress}
        positionsBadgeCount={portfolio.positionsBadgeCount}
      />

      {portfolio.hasClaimableWinnings && (
        <PredictClaimButton
          amount={portfolio.claimableAmount}
          isHidden={Boolean(privacyMode)}
          isLoading={portfolio.isClaimPending}
          onPress={handleClaimPress}
          testID={PREDICT_PORTFOLIO_TEST_IDS.CLAIM_BUTTON}
        />
      )}
    </Box>
  );
};

export default PredictPortfolioModule;
