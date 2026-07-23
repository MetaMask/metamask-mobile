import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import React, { useCallback, useMemo } from 'react';
import {
  Box,
  FontWeight,
  SensitiveText,
  SensitiveTextLength,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import { Skeleton } from '../../../../../component-library/components-temp/Skeleton';
import { PredictEventValues } from '../../constants/eventNames';
import { usePredictActionGuard } from '../../hooks/usePredictActionGuard';
import type { PredictPortfolioModel } from '../../hooks/usePredictPortfolio';
import { PredictPositionsViewSelectorsIDs } from '../../Predict.testIds';
import type { PredictEntryPoint } from '../../types/navigation';
import {
  formatPredictUnrealizedPnLStringParts,
  formatPrice,
} from '../../utils/format';
import PredictClaimButton from '../PredictActionButtons/PredictClaimButton';

interface PredictPositionsViewHeaderProps {
  entryPoint?: PredictEntryPoint;
  isPrivacyMode: boolean;
  portfolio: PredictPortfolioModel;
}

const formatUnrealizedPnl = (amount: number, percent: number | undefined) => {
  const parts = formatPredictUnrealizedPnLStringParts({
    cashUpnl: amount,
    percentUpnl: percent ?? 0,
  });

  if (percent === undefined) {
    return parts.amount;
  }

  return strings('predict.unrealized_pnl_value', {
    amount: parts.amount,
    percent: parts.percent,
  });
};

const PredictPositionsViewHeader = ({
  entryPoint = PredictEventValues.ENTRY_POINT.HOMEPAGE_POSITIONS,
  isPrivacyMode,
  portfolio,
}: PredictPositionsViewHeaderProps) => {
  const navigation = useNavigation<AppNavigationProp>();
  const tw = useTailwind();
  const { claim } = portfolio;
  const { executeGuardedAction } = usePredictActionGuard({ navigation });
  const showUnrealizedPnlRow =
    portfolio.showPnlLine ||
    portfolio.isOpenPositionsLoading ||
    Boolean(portfolio.openPositionsError);
  const unrealizedPnlColor =
    portfolio.totalUnrealizedPnlAmount >= 0
      ? TextColor.SuccessDefault
      : TextColor.ErrorDefault;
  const unrealizedPnlValue = useMemo(
    () =>
      formatUnrealizedPnl(
        portfolio.totalUnrealizedPnlAmount,
        portfolio.totalUnrealizedPnlPercent,
      ),
    [portfolio.totalUnrealizedPnlAmount, portfolio.totalUnrealizedPnlPercent],
  );

  const handleClaimPress = useCallback(async () => {
    await executeGuardedAction(
      async () => {
        await claim({
          entryPoint,
          openPositionsCount: portfolio.openPositionCount,
          claimablePositionsCount: portfolio.claimablePositionCount,
          hasClaimableWinnings: portfolio.hasClaimableWinnings,
          predictScreen:
            PredictEventValues.PREDICT_SCREEN.PREDICT_POSITIONS_SCREEN,
        });
      },
      { attemptedAction: PredictEventValues.ATTEMPTED_ACTION.CLAIM },
    );
  }, [
    claim,
    entryPoint,
    executeGuardedAction,
    portfolio.claimablePositionCount,
    portfolio.hasClaimableWinnings,
    portfolio.openPositionCount,
  ]);

  return (
    <Box
      twClassName="gap-3 py-4"
      testID={PredictPositionsViewSelectorsIDs.SUMMARY}
    >
      <Box
        style={tw.style('bg-muted rounded-xl', !showUnrealizedPnlRow && 'pb-0')}
        testID={PredictPositionsViewSelectorsIDs.SUMMARY_CARD}
      >
        <Box twClassName="flex-row items-center justify-between px-4 py-3">
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            testID={PredictPositionsViewSelectorsIDs.AVAILABLE_BALANCE_LABEL}
          >
            {strings('predict.available_balance')}
          </Text>
          {portfolio.isBalanceLoading ? (
            <Skeleton
              width={80}
              height={20}
              style={tw.style('rounded-md')}
              testID={
                PredictPositionsViewSelectorsIDs.AVAILABLE_BALANCE_SKELETON
              }
            />
          ) : portfolio.balanceError ? (
            <Text variant={TextVariant.BodyMd} color={TextColor.ErrorDefault}>
              {strings('predict.unrealized_pnl_error')}
            </Text>
          ) : (
            <SensitiveText
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextDefault}
              isHidden={isPrivacyMode}
              length={SensitiveTextLength.Medium}
              testID={PredictPositionsViewSelectorsIDs.AVAILABLE_BALANCE_VALUE}
            >
              {formatPrice(portfolio.availableBalance, {
                minimumDecimals: 2,
                maximumDecimals: 2,
              })}
            </SensitiveText>
          )}
        </Box>

        {showUnrealizedPnlRow && (
          <>
            <Box twClassName="h-px bg-default" />
            <Box
              twClassName="flex-row items-center justify-between px-4 py-3"
              testID={PredictPositionsViewSelectorsIDs.UNREALIZED_PNL_ROW}
            >
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextAlternative}
                testID={PredictPositionsViewSelectorsIDs.UNREALIZED_PNL_LABEL}
              >
                {strings('predict.unrealized_pnl_label')}
              </Text>
              {portfolio.isOpenPositionsLoading ? (
                <Skeleton
                  width={120}
                  height={20}
                  style={tw.style('rounded-md')}
                  testID={
                    PredictPositionsViewSelectorsIDs.UNREALIZED_PNL_SKELETON
                  }
                />
              ) : portfolio.openPositionsError ? (
                <Text
                  variant={TextVariant.BodyMd}
                  color={TextColor.ErrorDefault}
                >
                  {strings('predict.unrealized_pnl_error')}
                </Text>
              ) : (
                <SensitiveText
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Medium}
                  color={unrealizedPnlColor}
                  isHidden={isPrivacyMode}
                  length={SensitiveTextLength.Long}
                  testID={PredictPositionsViewSelectorsIDs.UNREALIZED_PNL_VALUE}
                >
                  {unrealizedPnlValue}
                </SensitiveText>
              )}
            </Box>
          </>
        )}
      </Box>

      {portfolio.hasClaimableWinnings && (
        <PredictClaimButton
          amount={portfolio.claimableAmount}
          onPress={handleClaimPress}
          isLoading={portfolio.isClaimPending}
          isHidden={isPrivacyMode}
          testID={PredictPositionsViewSelectorsIDs.CLAIM_CTA}
        />
      )}
    </Box>
  );
};

export default PredictPositionsViewHeader;
