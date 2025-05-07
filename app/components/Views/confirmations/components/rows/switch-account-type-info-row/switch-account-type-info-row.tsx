import React from 'react';

import { strings } from '../../../../../../../locales/i18n';
import Name from '../../../../../UI/Name';
import { NameType } from '../../../../../UI/Name/Name.types';
import AlertRow from '../../UI/info-row/alert-row';
import InfoSection from '../../UI/info-row/info-section';
import { RowAlertKey } from '../../UI/info-row/alert-row/constants';
import { useSmartAccountSwitchType } from '../../../hooks/7702/useSmartAccountSwitchType';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';

const SwitchAccountTypeInfoRow = () => {
  const { isDowngrade } = useSmartAccountSwitchType();
  const transactionMetadata = useTransactionMetadataRequest();

  return (
    <InfoSection>
      {transactionMetadata && (
        <AlertRow
          alertField={RowAlertKey.RequestFrom}
          label={strings('confirm.label.account')}
        >
          <Name
            value={transactionMetadata.txParams.to ?? ''}
            type={NameType.EthereumAddress}
            variation={transactionMetadata.chainId}
          />
        </AlertRow>
      )}
      <AlertRow
        alertField={RowAlertKey.RequestFrom}
        label={strings('confirm.label.now')}
      >
        {isDowngrade
          ? strings('confirm.smart_account')
          : strings('confirm.standard_account')}
      </AlertRow>
      <AlertRow
        alertField={RowAlertKey.RequestFrom}
        label={strings('confirm.label.switching_to')}
      >
        {isDowngrade
          ? strings('confirm.standard_account')
          : strings('confirm.smart_account')}
      </AlertRow>
    </InfoSection>
  );
};

export default SwitchAccountTypeInfoRow;
