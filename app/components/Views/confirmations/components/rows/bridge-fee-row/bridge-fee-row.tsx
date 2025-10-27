import React, { ReactNode, useMemo } from 'react';
import InfoRow from '../../UI/info-row';
import { useTransactionMetadataOrThrow } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { selectTransactionBridgeQuotesById } from '../../../../../../core/redux/slices/confirmationMetrics';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../../reducers';
import Text, {
  TextColor,
} from '../../../../../../component-library/components/Texts/Text';
import { useTransactionTotalFiat } from '../../../hooks/pay/useTransactionTotalFiat';
import { strings } from '../../../../../../../locales/i18n';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { Box } from '../../../../../UI/Box/Box';
import { FlexDirection, JustifyContent } from '../../../../../UI/Box/box.types';
import { SkeletonRow } from '../skeleton-row';
import { hasTransactionType } from '../../../utils/transaction';
import { useIsTransactionPayLoading } from '../../../hooks/pay/useIsTransactionPayLoading';
import { useTransactionPayFiat } from '../../../hooks/pay/useTransactionPayFiat';

export function BridgeFeeRow() {
  const { formatFiat } = useTransactionPayFiat();
  const { totalTransactionFeeFormatted } = useTransactionTotalFiat();
  const { isLoading } = useIsTransactionPayLoading();

  const transactionMetadata = useTransactionMetadataOrThrow();
  const { id: transactionId } = transactionMetadata;

  const quotes = useSelector((state: RootState) =>
    selectTransactionBridgeQuotesById(state, transactionId),
  );

  const hasQuotes = Boolean(quotes?.length);
  const metamaskFee = useMemo(() => formatFiat(0), [formatFiat]);

  if (isLoading) {
    return (
      <>
        <SkeletonRow testId="bridge-fee-row-skeleton" />
        <SkeletonRow testId="metamask-fee-row-skeleton" />
      </>
    );
  }

  return (
    <>
      <InfoRow
        testID="bridge-fee-row"
        label={strings('confirm.label.transaction_fee')}
        tooltip={hasQuotes ? getTooltip(transactionMetadata) : undefined}
        tooltipTitle={strings('confirm.tooltip.title.transaction_fee')}
      >
        <Text>{totalTransactionFeeFormatted}</Text>
      </InfoRow>
      {hasQuotes && (
        <InfoRow
          testID="metamask-fee-row"
          label={strings('confirm.label.metamask_fee')}
        >
          <Text>{metamaskFee}</Text>
        </InfoRow>
      )}
    </>
  );
}

function getTooltip(transactionMeta: TransactionMeta): ReactNode {
  if (hasTransactionType(transactionMeta, [TransactionType.predictDeposit])) {
    return (
      <FeesTooltip
        message={strings('confirm.tooltip.predict_deposit.transaction_fee')}
      />
    );
  }

  switch (transactionMeta.type) {
    case TransactionType.perpsDeposit:
      return (
        <FeesTooltip
          message={strings('confirm.tooltip.perps_deposit.transaction_fee')}
        />
      );

    default:
      return undefined;
  }
}

function FeesTooltip({ message }: { message: string }) {
  const { totalBridgeFeeFormatted, totalNativeEstimatedFormatted } =
    useTransactionTotalFiat();

  return (
    <Box gap={14}>
      <Text>{message}</Text>
      <Box
        flexDirection={FlexDirection.Row}
        justifyContent={JustifyContent.spaceBetween}
      >
        <Text color={TextColor.Alternative}>
          {strings('confirm.label.network_fee')}
        </Text>
        <Text color={TextColor.Alternative}>
          {totalNativeEstimatedFormatted}
        </Text>
      </Box>
      <Box
        flexDirection={FlexDirection.Row}
        justifyContent={JustifyContent.spaceBetween}
      >
        <Text color={TextColor.Alternative}>
          {strings('confirm.label.bridge_fee')}
        </Text>
        <Text color={TextColor.Alternative}>{totalBridgeFeeFormatted}</Text>
      </Box>
    </Box>
  );
}
