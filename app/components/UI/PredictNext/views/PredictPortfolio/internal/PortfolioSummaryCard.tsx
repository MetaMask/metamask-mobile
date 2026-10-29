import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonVariant,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  SensitiveText,
  SensitiveTextLength,
  Skeleton,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import type { PredictPortfolioSummary } from '../../../types';
import { PredictPortfolioScreenTestIds } from '../PredictPortfolioScreen.testIds';
import {
  formatSignedPercent,
  formatSignedUsdAmount,
  formatUsdAmount,
  isNonZeroAmount,
  pnlToneClassName,
} from './portfolioFormatting';

interface PortfolioSummaryCardProps {
  summary?: PredictPortfolioSummary;
  isLoading: boolean;
  isPrivacyMode: boolean;
  onRetry: () => void;
}

interface SummaryRowProps {
  label: string;
  value: string;
  isPrivacyMode: boolean;
  testID: string;
  valueClassName?: string;
}

const SummaryRow = ({
  label,
  value,
  isPrivacyMode,
  testID,
  valueClassName,
}: SummaryRowProps) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    justifyContent={BoxJustifyContent.Between}
  >
    <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
      {label}
    </Text>
    <SensitiveText
      variant={TextVariant.BodySm}
      fontWeight={FontWeight.Medium}
      isHidden={isPrivacyMode}
      length={SensitiveTextLength.Short}
      twClassName={valueClassName}
      testID={testID}
    >
      {value}
    </SensitiveText>
  </Box>
);

/** The unrealized PnL amount, with its percent only when the backend sent
 * one: a zero cost basis has no percent, and none is invented. */
const formatPnl = ({
  unrealizedPnl,
  unrealizedPnlPercent,
}: PredictPortfolioSummary): string => {
  const amount = formatSignedUsdAmount(unrealizedPnl);
  return unrealizedPnlPercent === undefined
    ? amount
    : strings('predict_next.portfolio.pnl_with_percent', {
        amount,
        percent: formatSignedPercent(unrealizedPnlPercent),
      });
};

/**
 * Renders the backend-computed Portfolio Summary. Every figure is formatted
 * from the Summary as served; nothing is summed from loaded rows. An
 * incomplete Summary keeps its total and says that it is partial.
 */
export const PortfolioSummaryCard = ({
  summary,
  isLoading,
  isPrivacyMode,
  onRetry,
}: PortfolioSummaryCardProps) => {
  let content: React.ReactNode;
  if (isLoading) {
    content = (
      <Skeleton
        height={32}
        width={120}
        testID={PredictPortfolioScreenTestIds.SUMMARY_LOADING}
      />
    );
  } else if (!summary) {
    content = (
      <Box alignItems={BoxAlignItems.Start} gap={1}>
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          testID={PredictPortfolioScreenTestIds.SUMMARY_ERROR}
        >
          {strings('predict_next.portfolio.summary_unavailable')}
        </Text>
        <Button
          variant={ButtonVariant.Tertiary}
          onPress={onRetry}
          testID={PredictPortfolioScreenTestIds.SUMMARY_RETRY}
        >
          {strings('predict_next.balance_unavailable.retry')}
        </Button>
      </Box>
    );
  } else {
    content = (
      <Box gap={2}>
        <SensitiveText
          variant={TextVariant.DisplayMd}
          fontWeight={FontWeight.Bold}
          isHidden={isPrivacyMode}
          length={SensitiveTextLength.Medium}
          testID={PredictPortfolioScreenTestIds.TOTAL_VALUE}
        >
          {formatUsdAmount(summary.totalValue)}
        </SensitiveText>
        {summary.complete ? null : (
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            gap={1}
            testID={PredictPortfolioScreenTestIds.SUMMARY_INCOMPLETE}
          >
            <Icon
              name={IconName.Info}
              size={IconSize.Sm}
              color={IconColor.WarningDefault}
            />
            <Text variant={TextVariant.BodyXs} color={TextColor.WarningDefault}>
              {strings('predict_next.portfolio.summary_incomplete')}
            </Text>
          </Box>
        )}
        <SummaryRow
          label={strings('predict_next.available_balance')}
          value={formatUsdAmount(summary.availableBalance)}
          isPrivacyMode={isPrivacyMode}
          testID={PredictPortfolioScreenTestIds.BALANCE_VALUE}
        />
        <SummaryRow
          label={strings('predict_next.portfolio.positions_value')}
          value={formatUsdAmount(summary.positionsValue)}
          isPrivacyMode={isPrivacyMode}
          testID={PredictPortfolioScreenTestIds.POSITIONS_VALUE}
        />
        {isNonZeroAmount(summary.claimableValue) ? (
          <SummaryRow
            label={strings('predict_next.portfolio.claimable_value')}
            value={formatUsdAmount(summary.claimableValue)}
            isPrivacyMode={isPrivacyMode}
            testID={PredictPortfolioScreenTestIds.CLAIMABLE_VALUE}
          />
        ) : null}
        <SummaryRow
          label={strings('predict_next.portfolio.unrealized_pnl')}
          value={formatPnl(summary)}
          isPrivacyMode={isPrivacyMode}
          testID={PredictPortfolioScreenTestIds.UNREALIZED_PNL}
          valueClassName={pnlToneClassName(summary.unrealizedPnl)}
        />
      </Box>
    );
  }

  return (
    <Box
      twClassName="my-4 rounded-xl bg-muted px-4 py-3"
      gap={1}
      testID={PredictPortfolioScreenTestIds.SUMMARY_CARD}
    >
      <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
        {strings('predict_next.portfolio.total_value')}
      </Text>
      {content}
    </Box>
  );
};
