import React from 'react';
import { View } from 'react-native';

import { strings } from '../../../../../../../locales/i18n';
import { useStyles } from '../../../../../../component-library/hooks';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { useApproveTransactionData } from '../../../hooks/useApproveTransactionData';
import { TokenStandard } from '../../../types/token';
import InfoRow from '../../UI/info-row/info-row';
import Address from '../../UI/info-row/info-value/address';
import { Pill } from '../../UI/pill';
import styleSheet from '../shared-styles';

export const IncreaseDecreaseAllowance = () => {
  const { styles } = useStyles(styleSheet, {});
  const { amount, tokenStandard, spender } = useApproveTransactionData();
  const transactionMetadata = useTransactionMetadataRequest();
  const isERC20 = tokenStandard === TokenStandard.ERC20;

  if (!isERC20) {
    return null;
  }

  return (
    <>
      <InfoRow label={strings('confirm.spending_cap')}>
        <View style={styles.amountAndAddressContainer}>
          <Pill text={amount ?? ''} />
          <Address
            address={transactionMetadata?.txParams?.to ?? ''}
            chainId={transactionMetadata?.chainId ?? ''}
          />
        </View>
      </InfoRow>
      <InfoRow label={strings('confirm.spender')}>
        <Address
          address={spender ?? ''}
          chainId={transactionMetadata?.chainId ?? ''}
        />
      </InfoRow>
    </>
  );
};
