import React from 'react';
import { View } from 'react-native';
import { TransactionMeta } from '@metamask/transaction-controller';

import { strings } from '../../../../../../../locales/i18n';
import { useStyles } from '../../../../../../component-library/hooks';
import { ApproveComponentIDs } from '../../../../../../../e2e/selectors/Confirmation/ConfirmationView.selectors';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { useApproveTransactionData } from '../../../hooks/useApproveTransactionData';
import { useApproveTransactionActions } from '../../../hooks/useApproveTransactionActions';
import { TokenStandard } from '../../../types/token';
import { ApproveMethod } from '../../../types/approve';
import InfoRow from '../../UI/info-row/info-row';
import Address from '../../UI/info-row/info-value/address';
import { Pill } from '../../UI/pill';
import { EditSpendingCapButton } from '../../edit-spending-cap-button/edit-spending-cap-button';
import styleSheet from '../shared-styles';

export const IncreaseDecreaseAllowance = () => {
  const { styles } = useStyles(styleSheet, {});
  const {
    approveMethod,
    amount,
    decimals,
    tokenBalance,
    tokenStandard,
    tokenSymbol,
    rawAmount,
    spender,
  } = useApproveTransactionData();
  const transactionMetadata =
    useTransactionMetadataRequest() as TransactionMeta;
  const { onSpendingCapUpdate } = useApproveTransactionActions();
  const isERC20 = tokenStandard === TokenStandard.ERC20;

  if (!isERC20) {
    return null;
  }

  return (
    <>
      <InfoRow label={strings('confirm.spending_cap')}>
        <View style={styles.amountAndAddressContainer}>
          <EditSpendingCapButton
            spendingCapProps={{
              approveMethod: approveMethod as ApproveMethod,
              balance: tokenBalance ?? '0',
              decimals: decimals ?? 1,
              onSpendingCapUpdate,
              spendingCap: rawAmount ?? '0',
              tokenSymbol,
            }}
          />
          <Pill
            testID={ApproveComponentIDs.SPENDING_CAP_VALUE}
            text={amount ?? ''}
          />
          <Address
            address={transactionMetadata?.txParams?.to as string}
            chainId={transactionMetadata.chainId}
          />
        </View>
      </InfoRow>
      <InfoRow label={strings('confirm.spender')}>
        <Address
          address={spender ?? ''}
          chainId={transactionMetadata.chainId}
        />
      </InfoRow>
    </>
  );
};
