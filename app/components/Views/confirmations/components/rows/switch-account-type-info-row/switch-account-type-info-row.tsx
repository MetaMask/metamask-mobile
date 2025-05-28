import React from 'react';

import { strings } from '../../../../../../../locales/i18n';
import Name from '../../../../../UI/Name';
import { NameType } from '../../../../../UI/Name/Name.types';
import { use7702TransactionType } from '../../../hooks/7702/use7702TransactionType';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import AlertRow from '../../UI/info-row/alert-row';
import InfoSection from '../../UI/info-row/info-section';
import InfoRow from '../../UI/info-row';
import { RowAlertKey } from '../../UI/info-row/alert-row/constants';

const SwitchAccountTypeInfoRow = () => {
  const { isDowngrade, isBatchedUpgrade } = use7702TransactionType();
  const transactionMetadata = useTransactionMetadataRequest();

  return (
    <InfoSection>
      {transactionMetadata && !isBatchedUpgrade && (
        <InfoRow label={strings('confirm.label.account')}>
          <Name
            value={transactionMetadata.txParams.to ?? ''}
            type={NameType.EthereumAddress}
            variation={transactionMetadata.chainId}
          />
        </InfoRow>
      )}
      <AlertRow
        alertField={RowAlertKey.AccountTypeUpgrade}
        label={strings('confirm.label.now')}
      >
        {isDowngrade
          ? strings('confirm.smart_account')
          : strings('confirm.standard_account')}
      </AlertRow>
      <InfoRow label={strings('confirm.label.switching_to')}>
        {isDowngrade
          ? strings('confirm.standard_account')
          : strings('confirm.smart_account')}
      </InfoRow>
    </InfoSection>
  );
};

export default SwitchAccountTypeInfoRow;
