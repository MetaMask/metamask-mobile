import React from 'react';
import { Box, IconName } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import PredictPortfolioAction from './PredictPortfolioAction';
import { PREDICT_PORTFOLIO_TEST_IDS } from './PredictPortfolio.testIds';

export interface PredictPortfolioActionsProps {
  isWithdrawDisabled?: boolean;
  onAddFundsPress: () => void;
  onPositionsPress: () => void;
  onWithdrawPress: () => void;
  positionsBadgeCount?: number;
}

const PredictPortfolioActions: React.FC<PredictPortfolioActionsProps> = ({
  isWithdrawDisabled = false,
  onAddFundsPress,
  onPositionsPress,
  onWithdrawPress,
  positionsBadgeCount = 0,
}) => (
  <Box testID={PREDICT_PORTFOLIO_TEST_IDS.ACTIONS} twClassName="flex-row gap-3">
    <PredictPortfolioAction
      badgeCount={positionsBadgeCount}
      iconName={IconName.Book}
      label={strings('predict.tabs.positions')}
      onPress={onPositionsPress}
      testID={PREDICT_PORTFOLIO_TEST_IDS.ACTION_POSITIONS}
    />
    <PredictPortfolioAction
      iconName={IconName.Add}
      label={strings('predict.deposit.add_funds')}
      onPress={onAddFundsPress}
      testID={PREDICT_PORTFOLIO_TEST_IDS.ACTION_ADD_FUNDS}
    />
    <PredictPortfolioAction
      disabled={isWithdrawDisabled}
      iconName={IconName.Arrow2Down}
      label={strings('predict.deposit.withdraw')}
      onPress={onWithdrawPress}
      testID={PREDICT_PORTFOLIO_TEST_IDS.ACTION_WITHDRAW}
    />
  </Box>
);

export default PredictPortfolioActions;
