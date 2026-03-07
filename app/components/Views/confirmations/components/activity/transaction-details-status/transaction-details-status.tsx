import {
  TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import React from 'react';
import { StatusTypes } from '@metamask/bridge-controller';
import { AlignItems, FlexDirection } from '../../../../../UI/Box/box.types';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { Box } from '../../../../../UI/Box/Box';
import { strings } from '../../../../../../../locales/i18n';
import { useTransactionDetails } from '../../../hooks/activity/useTransactionDetails';
import { useSelector } from 'react-redux';
import { selectBridgeHistoryForAccount } from '../../../../../../selectors/bridgeStatusController';
import { useTokenAmount } from '../../../hooks/useTokenAmount';
import { ARBITRUM_USDC } from '../../../constants/perps';
import { Severity, StatusIcon } from '../../status-icon';

export function TransactionDetailsStatus({
  gap,
  testId,
  text,
  transactionMeta,
}: {
  gap?: number;
  testId?: string;
  text?: string;
  transactionMeta: TransactionMeta;
}) {
  const { status } = transactionMeta;
  const hasSuccessfulPerpsBridge = useHasSuccessfulPerpsBridge();
  const { fiat } = useTokenAmount({ transactionMeta });
  const errorMessage = getErrorMessage(transactionMeta);

  const statusText = text ?? getStatusText(status);

  const solutionText =
    !text && status === TransactionStatus.failed && hasSuccessfulPerpsBridge
      ? strings('transaction_details.perps_deposit_solution', {
          fiat: fiat ?? '0.00',
        })
      : undefined;

  const textColour =
    text && status !== TransactionStatus.failed
      ? undefined
      : getTextColour(status);

  return (
    <Box flexDirection={FlexDirection.Column} gap={6}>
      <Box
        flexDirection={FlexDirection.Row}
        gap={gap ?? 6}
        alignItems={AlignItems.center}
      >
        <StatusIcon severity={getSeverity(status)} tooltip={errorMessage} />
        <Text
          color={textColour}
          variant={TextVariant.BodyMDMedium}
          testID={testId}
        >
          {statusText}
        </Text>
      </Box>
      {solutionText && <Text variant={TextVariant.BodyMD}>{solutionText}</Text>}
    </Box>
  );
}

function getSeverity(status: TransactionStatus): Severity {
  switch (status) {
    case TransactionStatus.confirmed:
      return 'success';
    case TransactionStatus.failed:
    case TransactionStatus.dropped:
      return 'error';
    default:
      return 'warning';
  }
}

function getStatusText(status: TransactionStatus): string {
  switch (status) {
    case TransactionStatus.confirmed:
      return strings('transaction.confirmed');
    case TransactionStatus.failed:
    case TransactionStatus.dropped:
      return strings('transaction.failed');
    default:
      return strings('transaction.pending');
  }
}

function getTextColour(status: TransactionStatus): TextColor {
  switch (status) {
    case TransactionStatus.confirmed:
      return TextColor.Success;
    case TransactionStatus.failed:
    case TransactionStatus.dropped:
      return TextColor.Error;
    default:
      return TextColor.Warning;
  }
}

function getErrorMessage(transactionMeta: TransactionMeta): string | undefined {
  const { error } = transactionMeta;

  if (!error) return undefined;

  if (error.stack) {
    try {
      const start = error.stack.indexOf('{');
      const end = error.stack.lastIndexOf('}');
      const stackObject = JSON.parse(error.stack.substring(start, end + 1));
      const stackMessage = stackObject?.data?.message;

      if (stackMessage) {
        return stackMessage;
      }
    } catch {
      // Intentionally empty
    }
  }

  return error.message;
}

function useHasSuccessfulPerpsBridge() {
  const { transactionMeta } = useTransactionDetails();
  const { requiredTransactionIds } = transactionMeta ?? {};
  const bridgeHistory = useSelector(selectBridgeHistoryForAccount);

  return (
    (transactionMeta?.type === TransactionType.perpsDeposit &&
      requiredTransactionIds?.some((id) => {
        const bridgeItem = bridgeHistory[id];

        return (
          bridgeItem?.status.status === StatusTypes.COMPLETE &&
          bridgeItem?.quote?.destAsset?.address?.toLowerCase() ===
            ARBITRUM_USDC.address.toLowerCase()
        );
      })) ??
    false
  );
}
