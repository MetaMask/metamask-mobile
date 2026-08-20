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
import { useIsMoneyAccountContext } from '../../../hooks/activity/useIsMoneyAccountContext';
import { useSelector } from 'react-redux';
import { selectBridgeHistoryForAccount } from '../../../../../../selectors/bridgeStatusController';
import { useTokenAmount } from '../../../hooks/useTokenAmount';
import { ARBITRUM_USDC } from '../../../constants/perps';
import { StatusIcon } from '../../status-icon';
import { getErrorMessage, getSeverity } from '../../../utils/transaction';
import { BigNumber } from 'bignumber.js';
import useFiatFormatter from '../../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import { ACTIVITY_FIAT_FRACTION_DIGITS } from '../../../constants/confirmations';

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
  const { fiatUnformatted } = useTokenAmount({ transactionMeta });
  const errorMessage = getErrorMessage(transactionMeta);
  const formatFiat = useFiatFormatter({
    fractionDigits: ACTIVITY_FIAT_FRACTION_DIGITS,
  });

  const statusText = text ?? getStatusText(status);

  const solutionText =
    !text && status === TransactionStatus.failed && hasSuccessfulPerpsBridge
      ? strings('activity_details.failure.bridged_not_deposited', {
          fiat: formatFiat(new BigNumber(fiatUnformatted ?? 0)),
          network: 'Arbitrum',
          symbol: ARBITRUM_USDC.symbol,
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
        {!isMoneyContext && (
          <StatusIcon severity={getSeverity(status)} tooltip={errorMessage} />
        )}
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
