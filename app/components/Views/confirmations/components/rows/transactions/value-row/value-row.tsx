import React from 'react';
import { Hex } from '@metamask/utils';
import { strings } from '../../../../../../../../locales/i18n';
import InfoRow from '../../../UI/info-row';
import CurrencyDisplay from '../../../UI/info-row/info-value/currency-display';
import { useTransactionMetadataRequest } from '../../../../hooks/transactions/useTransactionMetadataRequest';
import InfoSection from '../../../UI/info-row/info-section';
import { ConfirmationRowComponentIDs } from '../../../../ConfirmationView.testIds';

const ValueRow = () => {
  const transactionMetadata = useTransactionMetadataRequest();

  if (!transactionMetadata) {
    return null;
  }

  const { chainId, txParams } = transactionMetadata;
  const value = txParams?.value;

  if (!value) {
    return null;
  }

  return (
    <InfoSection testID={ConfirmationRowComponentIDs.AMOUNT}>
      <InfoRow label={strings('confirm.label.amount')}>
        <CurrencyDisplay chainId={chainId as Hex} value={value} />
      </InfoRow>
    </InfoSection>
  );
};

export default ValueRow;
