import {
  TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import React from 'react';
import { StatusTypes } from '@metamask/bridge-controller';
import { AlignItems, FlexDirection } from '../../../../../UI/Box/box.types';
import { Box } from '../../../../../UI/Box/Box';
import { strings } from '../../../../../../../locales/i18n';
import { useTransactionDetails } from '../../../hooks/activity/useTransactionDetails';
import { useIsMoneyAccountContext } from '../../../hooks/activity/useIsMoneyAccountContext';
import { useSelector } from 'react-redux';
import { selectBridgeHistoryForAccount } from '../../../../../../selectors/bridgeStatusController';
import { useTokenAmount } from '../../../hooks/useTokenAmount';
import { ARBITRUM_USDC } from '../../../constants/perps';
import { StatusIcon } from '../../status-icon';
import { getErrorMessage, getSeverity } from '../../../utils/transaction';
import {
  Text,
  TextVariant,
  TextColor,
  FontWeight,
} from '@metamask/design-system-react-native';

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
  const isMoneyContext = useIsMoneyAccountContext();
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
        {/* The Money account status row is a plain colour-coded label per the
            Activity redesign; other contexts keep the status icon (and its
            error tooltip). */}
        {!isMoneyContext && (
          <StatusIcon severity={getSeverity(status)} tooltip={errorMessage} />
        )}
        <Text
          color={textColour}
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          testID={testId}
        >
          {statusText}
        </Text>
      </Box>
      {solutionText && <Text variant={TextVariant.BodyMd}>{solutionText}</Text>}
    </Box>
  );
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
      return TextColor.SuccessDefault;
    case TransactionStatus.failed:
    case TransactionStatus.dropped:
      return TextColor.ErrorDefault;
    default:
      return TextColor.WarningDefault;
  }
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
