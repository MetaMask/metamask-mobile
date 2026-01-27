import {
  TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import React from 'react';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../../component-library/components/Icons/Icon';
import Tooltip from '../../UI/Tooltip';
import { useBridgeTxHistoryData } from '../../../../../../util/bridge/hooks/useBridgeTxHistoryData';
import { BridgeHistoryItem } from '@metamask/bridge-status-controller';
import { StatusTypes } from '@metamask/bridge-controller';
import { AlignItems, FlexDirection } from '../../../../../UI/Box/box.types';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { Box } from '../../../../../UI/Box/Box';
import { strings } from '../../../../../../../locales/i18n';
import { ButtonIconSizes } from '../../../../../../component-library/components/Buttons/ButtonIcon';
import { useStyles } from '../../../../../../component-library/hooks';
import styleSheet from './transaction-details-status.styles';
import { useTransactionDetails } from '../../../hooks/activity/useTransactionDetails';
import { useSelector } from 'react-redux';
import { selectBridgeHistoryForAccount } from '../../../../../../selectors/bridgeStatusController';
import { useTokenAmount } from '../../../hooks/useTokenAmount';
import { ARBITRUM_USDC } from '../../../constants/perps';

export function TransactionDetailsStatus({
  gap,
  isBridgeReceive,
  testId,
  text,
  transactionMeta,
}: {
  gap?: number;
  isBridgeReceive?: boolean;
  testId?: string;
  text?: string;
  transactionMeta: TransactionMeta;
}) {
  const { status: statusRaw } = transactionMeta;
  const hasSuccessfulPerpsBridge = useHasSuccessfulPerpsBridge();
  const { fiat } = useTokenAmount({ transactionMeta });

  const { bridgeTxHistoryItem } = useBridgeTxHistoryData({
    evmTxMeta: transactionMeta,
  });

  const status =
    bridgeTxHistoryItem && isBridgeReceive
      ? getBridgeStatus(bridgeTxHistoryItem)
      : statusRaw;

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
        <StatusIcon status={status} transactionMeta={transactionMeta} />
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

function StatusIcon({
  status,
  transactionMeta,
}: {
  status: TransactionStatus;
  transactionMeta: TransactionMeta;
}) {
  const { styles } = useStyles(styleSheet, {});
  const iconName = getStatusIcon(status);
  const iconColour = getIconColour(status);
  const errorMessage = getErrorMessage(transactionMeta);

  if (status === TransactionStatus.failed && errorMessage) {
    return (
      <Tooltip
        iconColor={iconColour}
        iconName={iconName}
        iconSize={ButtonIconSizes.Md}
        iconStyle={styles.tooltipIcon}
        tooltipTestId="status-tooltip"
        content={errorMessage}
      />
    );
  }

  return (
    <Icon
      testID={`status-icon-${status}`}
      name={iconName}
      color={iconColour}
      size={IconSize.Md}
    />
  );
}

function getStatusIcon(status: TransactionStatus): IconName {
  switch (status) {
    case TransactionStatus.confirmed:
      return IconName.Confirmation;
    case TransactionStatus.failed:
    case TransactionStatus.dropped:
      return IconName.CircleX;
    default:
      return IconName.FullCircle;
  }
}

function getIconColour(status: TransactionStatus): IconColor {
  switch (status) {
    case TransactionStatus.confirmed:
      return IconColor.Success;
    case TransactionStatus.failed:
    case TransactionStatus.dropped:
      return IconColor.Error;
    default:
      return IconColor.Warning;
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

function getBridgeStatus(
  bridgeTxHistoryItem: BridgeHistoryItem,
): TransactionStatus {
  if (bridgeTxHistoryItem.status.status === StatusTypes.COMPLETE) {
    return TransactionStatus.confirmed;
  }

  if (
    [StatusTypes.PENDING, StatusTypes.UNKNOWN].includes(
      bridgeTxHistoryItem.status.status,
    )
  ) {
    return TransactionStatus.submitted;
  }

  return TransactionStatus.failed;
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
