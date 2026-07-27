import React, { useMemo } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { type Hex } from '@metamask/utils';
import { TransactionType } from '@metamask/transaction-controller';
import Text from '../../../../../../component-library/components/Texts/Text';
import { AvatarSize } from '../../../../../../component-library/components/Avatars/Avatar';
import AvatarAccount from '../../../../../../component-library/components/Avatars/Avatar/variants/AvatarAccount';
import { Box } from '../../../../../UI/Box/Box';
import { AlignItems, FlexDirection } from '../../../../../UI/Box/box.types';
import Name from '../../../../../UI/Name/Name';
import { NameType } from '../../../../../UI/Name/Name.types';
import { strings } from '../../../../../../../locales/i18n';
import { useTransactionDetails } from '../../../hooks/activity/useTransactionDetails';
import { useIsMoneyAccountContext } from '../../../hooks/activity/useIsMoneyAccountContext';
import {
  hasTransactionType,
  parseStandardTokenTransactionData,
} from '../../../utils/transaction';
import { TransactionDetailsRow } from '../transaction-details-row/transaction-details-row';
import { getTokenTransferData } from '../../../utils/transaction-pay';
import MoneyIcon from '../../../../../../images/money.png';

const iconStyles = StyleSheet.create({
  moneyIconWrapper: {
    width: 24,
    height: 24,
    borderRadius: 6,
    overflow: 'hidden' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  moneyIcon: { width: 32, height: 32 },
});

const SEND_TYPES: TransactionType[] = [
  TransactionType.moneyAccountWithdraw,
  TransactionType.perpsDeposit,
  TransactionType.perpsWithdraw,
  TransactionType.predictDeposit,
  TransactionType.predictWithdraw,
];

export function TransactionDetailsToRow() {
  const { transactionMeta } = useTransactionDetails();
  const isMoneyContext = useIsMoneyAccountContext();
  const recipient = useRecipient();
  const chainId = transactionMeta?.chainId as Hex;

  if (!hasTransactionType(transactionMeta, SEND_TYPES)) {
    return null;
  }

  const staticLabel = getToLabel(transactionMeta, isMoneyContext);

  if (staticLabel) {
    const isMoneyAccount =
      staticLabel === strings('transaction_details.label.money_account');

    const icon = isMoneyAccount ? (
      <View style={iconStyles.moneyIconWrapper}>
        <Image
          source={MoneyIcon}
          style={iconStyles.moneyIcon}
          testID="money-account-icon"
        />
      </View>
    ) : (
      <AvatarAccount accountAddress={recipient ?? '0x0'} size={AvatarSize.Sm} />
    );

    return (
      <TransactionDetailsRow label={strings('transaction_details.label.to')}>
        <Box
          flexDirection={FlexDirection.Row}
          alignItems={AlignItems.center}
          gap={6}
        >
          {icon}
          <Text>{staticLabel}</Text>
        </Box>
      </TransactionDetailsRow>
    );
  }

  if (!recipient) {
    return null;
  }

  return (
    <TransactionDetailsRow label={strings('transaction_details.label.to')}>
      <Name
        type={NameType.EthereumAddress}
        value={recipient}
        variation={chainId}
      />
    </TransactionDetailsRow>
  );
}

function useRecipient(): Hex | undefined {
  const { transactionMeta } = useTransactionDetails();
  return useMemo(() => {
    const { data } = getTokenTransferData(transactionMeta) ?? {};
    if (!data) {
      return undefined;
    }
    const parsed = parseStandardTokenTransactionData(data);
    return parsed?.args?._to?.toString() as Hex | undefined;
  }, [transactionMeta]);
}

function getToLabel(
  transactionMeta: {
    type?: string;
    nestedTransactions?: { type?: string }[];
  },
  isMoneyContext: boolean,
): string | undefined {
  const asTxMeta = transactionMeta as Parameters<typeof hasTransactionType>[0];

  // Money context: perpsWithdraw/predictWithdraw (inflow) → To: Money account
  if (
    isMoneyContext &&
    hasTransactionType(asTxMeta, [
      TransactionType.perpsWithdraw,
      TransactionType.predictWithdraw,
    ])
  ) {
    return strings('transaction_details.label.money_account');
  }

  if (hasTransactionType(asTxMeta, [TransactionType.perpsDeposit])) {
    return strings('transaction_details.label.perps_account');
  }
  if (hasTransactionType(asTxMeta, [TransactionType.predictDeposit])) {
    return strings('transaction_details.label.predictions_account');
  }
  return undefined;
}
