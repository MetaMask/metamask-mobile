import React, { ReactNode } from 'react';
import InfoRow from '../../UI/info-row';
import { useTransactionMetadataOrThrow } from '../../../hooks/transactions/useTransactionMetadataRequest';
import {
  selectIsTransactionBridgeQuotesLoadingById,
  selectTransactionBridgeQuotesById,
} from '../../../../../../core/redux/slices/confirmationMetrics';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../../reducers';
import Text, {
  TextColor,
} from '../../../../../../component-library/components/Texts/Text';
import { useTransactionTotalFiat } from '../../../hooks/pay/useTransactionTotalFiat';
import { strings } from '../../../../../../../locales/i18n';
import { TransactionType } from '@metamask/transaction-controller';
import useFiatFormatter from '../../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import { BigNumber } from 'bignumber.js';
import { Box } from '../../../../../UI/Box/Box';
import { FlexDirection, JustifyContent } from '../../../../../UI/Box/box.types';
import { SkeletonRow } from '../skeleton-row';

export function BridgeFeeRow() {
  const { id: transactionId, type } = useTransactionMetadataOrThrow();
  const { totalTransactionFeeFormatted } = useTransactionTotalFiat();
  const fiatFormatter = useFiatFormatter();

  const isQuotesLoading = useSelector((state: RootState) =>
    selectIsTransactionBridgeQuotesLoadingById(state, transactionId),
  );

  const quotes = useSelector((state: RootState) =>
    selectTransactionBridgeQuotesById(state, transactionId),
  );

  const hasQuotes = Boolean(quotes?.length);

  if (isQuotesLoading) {
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
        tooltip={hasQuotes ? getTooltip(type) : undefined}
        tooltipTitle={strings('confirm.tooltip.title.transaction_fee')}
      >
        <Text>{totalTransactionFeeFormatted}</Text>
      </InfoRow>
      {hasQuotes && (
        <InfoRow
          testID="metamask-fee-row"
          label={strings('confirm.label.metamask_fee')}
        >
          <Text>{fiatFormatter(new BigNumber(0))}</Text>
        </InfoRow>
      )}
    </>
  );
}

function getTooltip(type?: TransactionType): ReactNode {
  switch (type) {
    case TransactionType.perpsDeposit:
      return <FeesTooltip />;
    default:
      return undefined;
  }
}

function FeesTooltip() {
  const { totalBridgeFeeFormatted, totalNativeEstimatedFormatted } =
    useTransactionTotalFiat();

  return (
    <Box gap={14}>
      <Text>{strings('confirm.tooltip.perps_deposit.transaction_fee')}</Text>
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
