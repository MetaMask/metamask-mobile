import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Button,
  ButtonSize,
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
} from '../../../utils/portfolioFormatting';

interface PortfolioSummaryCardProps {
  summary?: PredictPortfolioSummary;
  isLoading: boolean;
  isPrivacyMode: boolean;
  onRetry: () => void;
  /** Omitted when the Active Venue offers no Withdraw flow, which hides the
   * action rather than disabling it. */
  onWithdrawPress?: () => void;
  depositStatus?: React.ReactNode;
}

const RowDivider = () => <Box className="h-px bg-default" />;

const SummaryRow = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <Box className="flex-row items-center justify-between px-4 py-3">
    <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
      {label}
    </Text>
    {children}
  </Box>
);

interface SummaryValueProps {
  value: string;
  isPrivacyMode: boolean;
  testID: string;
  length?: SensitiveTextLength;
  className?: string;
}

const SummaryValue = ({
  value,
  isPrivacyMode,
  testID,
  length = SensitiveTextLength.Short,
  className,
}: SummaryValueProps) => (
  <SensitiveText
    variant={TextVariant.BodyMd}
    fontWeight={FontWeight.Medium}
    color={TextColor.TextDefault}
    isHidden={isPrivacyMode}
    length={length}
    className={className}
    testID={testID}
  >
    {value}
  </SensitiveText>
);

const SummarySkeleton = ({ width }: { width: number }) => (
  <Skeleton height={20} width={width} twClassName="rounded-md" />
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

const SummaryLoadingRows = () => (
  <Box testID={PredictPortfolioScreenTestIds.SUMMARY_LOADING}>
    <SummaryRow label={strings('predict_next.portfolio.total_value')}>
      <SummarySkeleton width={80} />
    </SummaryRow>
    <RowDivider />
    <SummaryRow label={strings('predict_next.available_balance')}>
      <SummarySkeleton width={80} />
    </SummaryRow>
    <RowDivider />
    <SummaryRow label={strings('predict_next.portfolio.positions_value')}>
      <SummarySkeleton width={80} />
    </SummaryRow>
    <RowDivider />
    <SummaryRow label={strings('predict_next.portfolio.unrealized_pnl')}>
      <SummarySkeleton width={120} />
    </SummaryRow>
  </Box>
);

const SummaryUnavailable = ({ onRetry }: { onRetry: () => void }) => (
  <Box alignItems={BoxAlignItems.Start} className="gap-1 px-4 py-3">
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

const SummaryRows = ({
  summary,
  isPrivacyMode,
}: {
  summary: PredictPortfolioSummary;
  isPrivacyMode: boolean;
}) => (
  <>
    <SummaryRow label={strings('predict_next.portfolio.total_value')}>
      <SummaryValue
        value={formatUsdAmount(summary.totalValue)}
        isPrivacyMode={isPrivacyMode}
        length={SensitiveTextLength.Medium}
        testID={PredictPortfolioScreenTestIds.TOTAL_VALUE}
      />
    </SummaryRow>
    {summary.complete ? null : (
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        className="gap-1 px-4 pb-3"
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
    <RowDivider />
    <SummaryRow label={strings('predict_next.available_balance')}>
      <SummaryValue
        value={formatUsdAmount(summary.availableBalance)}
        isPrivacyMode={isPrivacyMode}
        testID={PredictPortfolioScreenTestIds.BALANCE_VALUE}
      />
    </SummaryRow>
    <RowDivider />
    <SummaryRow label={strings('predict_next.portfolio.positions_value')}>
      <SummaryValue
        value={formatUsdAmount(summary.positionsValue)}
        isPrivacyMode={isPrivacyMode}
        testID={PredictPortfolioScreenTestIds.POSITIONS_VALUE}
      />
    </SummaryRow>
    {isNonZeroAmount(summary.claimableValue) ? (
      <>
        <RowDivider />
        <SummaryRow label={strings('predict_next.portfolio.claimable_value')}>
          <SummaryValue
            value={formatUsdAmount(summary.claimableValue)}
            isPrivacyMode={isPrivacyMode}
            testID={PredictPortfolioScreenTestIds.CLAIMABLE_VALUE}
          />
        </SummaryRow>
      </>
    ) : null}
    <RowDivider />
    <SummaryRow label={strings('predict_next.portfolio.unrealized_pnl')}>
      <SummaryValue
        value={formatPnl(summary)}
        isPrivacyMode={isPrivacyMode}
        className={pnlToneClassName(summary.unrealizedPnl)}
        testID={PredictPortfolioScreenTestIds.UNREALIZED_PNL}
      />
    </SummaryRow>
  </>
);

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
  onWithdrawPress,
  depositStatus,
}: PortfolioSummaryCardProps) => {
  let content: React.ReactNode;
  if (isLoading) {
    content = <SummaryLoadingRows />;
  } else if (!summary) {
    content = <SummaryUnavailable onRetry={onRetry} />;
  } else {
    content = <SummaryRows summary={summary} isPrivacyMode={isPrivacyMode} />;
  }

  return (
    <Box className="gap-3 py-4">
      <Box
        className="rounded-xl bg-muted"
        testID={PredictPortfolioScreenTestIds.SUMMARY_CARD}
      >
        {content}
      </Box>
      {depositStatus}
      {onWithdrawPress ? (
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Md}
          isFullWidth
          onPress={onWithdrawPress}
          testID={PredictPortfolioScreenTestIds.WITHDRAW}
        >
          {strings('predict_next.withdraw.title')}
        </Button>
      ) : null}
    </Box>
  );
};
