import React, { useMemo } from 'react';
import {
  Box,
  BoxAlignItems,
  FontFamily,
  FontWeight,
  SensitiveText,
  SensitiveTextLength,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { typography } from '@metamask/design-tokens';
import { strings } from '../../../../../../../../locales/i18n';
import { Skeleton } from '../../../../../../../component-library/components-temp/Skeleton';
import {
  formatPredictUnrealizedPnLStringParts,
  formatPrice,
} from '../../../../utils/format';
import { PREDICT_PORTFOLIO_TEST_IDS } from './PredictPortfolio.testIds';

const PRIMARY_SKELETON_HEIGHT = typography.sAmountDisplayLg.lineHeight;
const SECONDARY_SKELETON_HEIGHT = typography.sBodySM.lineHeight;

export interface PredictPortfolioSummaryProps {
  availableBalance: number;
  hasBalanceError?: boolean;
  isHidden?: boolean;
  isLoading?: boolean;
  hasError?: boolean;
  portfolioValue: number;
  showPnlLine: boolean;
  totalUnrealizedPnlAmount: number;
  totalUnrealizedPnlPercent?: number;
}

const PredictPortfolioSummary: React.FC<PredictPortfolioSummaryProps> = ({
  availableBalance,
  hasBalanceError = false,
  isHidden = false,
  isLoading = false,
  hasError = false,
  portfolioValue,
  showPnlLine,
  totalUnrealizedPnlAmount,
  totalUnrealizedPnlPercent,
}) => {
  const tw = useTailwind();
  const portfolioValueDisplay = hasError
    ? '—'
    : formatPrice(portfolioValue, {
        minimumDecimals: 2,
        maximumDecimals: 2,
      });
  const availableBalanceDisplay = hasBalanceError
    ? '—'
    : formatPrice(availableBalance, {
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
          hasError
            ? strings('predict.portfolio.value_unavailable_accessibility')
            : isHidden
              ? strings('predict.portfolio.value_hidden_accessibility')
              : strings('predict.portfolio.value_accessibility', {
                  value: portfolioValueDisplay,
                })
        }
        accessible
      >
        <SensitiveText
          fontFamily={FontFamily.Hero}
          fontWeight={FontWeight.Regular}
          isHidden={isHidden && !hasError}
          length={SensitiveTextLength.Long}
          testID={PREDICT_PORTFOLIO_TEST_IDS.PRIMARY_VALUE}
          variant={TextVariant.AmountDisplayLg}
        >
          {portfolioValueDisplay}
        </SensitiveText>
      </Box>

      {(showPnlLine || hasError) && (
        <Box
          alignItems={BoxAlignItems.Center}
          testID={PREDICT_PORTFOLIO_TEST_IDS.SECONDARY_LINE}
          twClassName="flex-row"
        >
          <SensitiveText
            color={
              hasError
                ? TextColor.TextAlternative
                : totalUnrealizedPnlAmount >= 0
                  ? TextColor.SuccessDefault
                  : TextColor.ErrorDefault
            }
            isHidden={isHidden && !hasError}
            length={SensitiveTextLength.Long}
            variant={TextVariant.BodySm}
          >
            {hasError ? '—' : pnlDisplay}
          </SensitiveText>
          <Text color={TextColor.TextAlternative} variant={TextVariant.BodySm}>
            {' · '}
          </Text>
          <SensitiveText
            color={TextColor.TextAlternative}
            isHidden={isHidden && !hasBalanceError}
            length={SensitiveTextLength.Medium}
            variant={TextVariant.BodySm}
          >
            {availableDisplay}
          </SensitiveText>
        </Box>
      )}
    </Box>
  );
};

export default PredictPortfolioSummary;
