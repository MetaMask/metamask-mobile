import React, { useMemo } from 'react';
import {
  Box,
  BoxAlignItems,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { typography } from '@metamask/design-tokens';
import { strings } from '../../../../../../locales/i18n';
import SensitiveText, {
  SensitiveTextLength,
} from '../../../../../component-library/components/Texts/SensitiveText';
import {
  TextColor as ComponentTextColor,
  TextVariant as ComponentTextVariant,
} from '../../../../../component-library/components/Texts/Text/Text.types';
import { Skeleton } from '../../../../../component-library/components-temp/Skeleton';
import {
  formatPredictUnrealizedPnLStringParts,
  formatPrice,
} from '../../utils/format';
import { PREDICT_PORTFOLIO_TEST_IDS } from './PredictPortfolio.testIds';

const PRIMARY_SKELETON_HEIGHT = typography.sDisplayLG.lineHeight;
const SECONDARY_SKELETON_HEIGHT = typography.sBodySM.lineHeight;

export interface PredictPortfolioSummaryProps {
  availableBalance: number;
  isHidden?: boolean;
  isLoading?: boolean;
  portfolioValue: number;
  showPnlLine: boolean;
  totalUnrealizedPnlAmount: number;
  totalUnrealizedPnlPercent?: number;
}

const PredictPortfolioSummary: React.FC<PredictPortfolioSummaryProps> = ({
  availableBalance,
  isHidden = false,
  isLoading = false,
  portfolioValue,
  showPnlLine,
  totalUnrealizedPnlAmount,
  totalUnrealizedPnlPercent,
}) => {
  const tw = useTailwind();
  const portfolioValueDisplay = formatPrice(portfolioValue, {
    minimumDecimals: 2,
    maximumDecimals: 2,
  });
  const availableBalanceDisplay = formatPrice(availableBalance, {
    minimumDecimals: 2,
    maximumDecimals: 2,
  });
  const pnlDisplayParts = useMemo(
    () =>
      formatPredictUnrealizedPnLStringParts({
        cashUpnl: totalUnrealizedPnlAmount,
        percentUpnl: totalUnrealizedPnlPercent ?? 0,
      }),
    [totalUnrealizedPnlAmount, totalUnrealizedPnlPercent],
  );
  const pnlDisplay =
    totalUnrealizedPnlPercent === undefined
      ? pnlDisplayParts.amount
      : strings('predict.unrealized_pnl_value', pnlDisplayParts);
  const availableDisplay = strings('predict.portfolio.available_amount', {
    amount: availableBalanceDisplay,
  });

  if (isLoading) {
    return (
      <Box testID={PREDICT_PORTFOLIO_TEST_IDS.SUMMARY} twClassName="gap-1">
        <Skeleton
          height={PRIMARY_SKELETON_HEIGHT}
          style={tw.style('rounded-md')}
          testID={PREDICT_PORTFOLIO_TEST_IDS.PRIMARY_SKELETON}
          width={156}
        />
        <Skeleton
          height={SECONDARY_SKELETON_HEIGHT}
          style={tw.style('rounded-md')}
          testID={PREDICT_PORTFOLIO_TEST_IDS.SECONDARY_SKELETON}
          width={212}
        />
      </Box>
    );
  }

  return (
    <Box testID={PREDICT_PORTFOLIO_TEST_IDS.SUMMARY} twClassName="gap-1">
      <Box
        accessibilityLabel={
          isHidden
            ? strings('predict.portfolio.value_hidden_accessibility')
            : strings('predict.portfolio.value_accessibility', {
                value: portfolioValueDisplay,
              })
        }
        accessible
      >
        <SensitiveText
          isHidden={isHidden}
          length={SensitiveTextLength.Long}
          testID={PREDICT_PORTFOLIO_TEST_IDS.PRIMARY_VALUE}
          variant={ComponentTextVariant.DisplayLG}
        >
          {portfolioValueDisplay}
        </SensitiveText>
      </Box>

      {showPnlLine && (
        <Box
          alignItems={BoxAlignItems.Center}
          testID={PREDICT_PORTFOLIO_TEST_IDS.SECONDARY_LINE}
          twClassName="flex-row"
        >
          <SensitiveText
            color={
              totalUnrealizedPnlAmount >= 0
                ? ComponentTextColor.Success
                : ComponentTextColor.Error
            }
            isHidden={isHidden}
            length={SensitiveTextLength.Long}
            variant={ComponentTextVariant.BodySM}
          >
            {pnlDisplay}
          </SensitiveText>
          <Text color={TextColor.TextAlternative} variant={TextVariant.BodySm}>
            {' · '}
          </Text>
          <SensitiveText
            color={ComponentTextColor.Alternative}
            isHidden={isHidden}
            length={SensitiveTextLength.Medium}
            variant={ComponentTextVariant.BodySM}
          >
            {availableDisplay}
          </SensitiveText>
        </Box>
      )}
    </Box>
  );
};

export default PredictPortfolioSummary;
