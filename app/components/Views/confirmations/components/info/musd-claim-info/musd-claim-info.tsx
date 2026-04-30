import React from 'react';
import { View } from 'react-native';

import { strings } from '../../../../../../../locales/i18n';
import InfoSection from '../../UI/info-row/info-section';
import InfoRow from '../../UI/info-row';
import { HeroRow } from '../../rows/transactions/hero-row';
import NetworkRow from '../../rows/transactions/network-row';
import GasFeesDetailsRow from '../../rows/transactions/gas-fee-details-row';
import { ConfirmationInfoComponentIDs } from '../../../constants/info-ids';
import Name from '../../../../../UI/Name';
import { NameType } from '../../../../../UI/Name/Name.types';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';

const ClaimingToRow = () => {
  const transactionMetadata = useTransactionMetadataRequest();
  return (
    <InfoRow
      label={strings('stake.claiming_to')}
      labelContainerStyle={{ alignSelf: 'center' }}
    >
      <Name
        value={transactionMetadata?.txParams.from ?? ''}
        type={NameType.EthereumAddress}
        variation={transactionMetadata?.chainId ?? ''}
      />
    </InfoRow>
  );
};

export const MusdClaimInfo = () => (
  <View testID={ConfirmationInfoComponentIDs.MUSD_CLAIM}>
    <HeroRow />
    <InfoSection>
      <ClaimingToRow />
    </InfoSection>
    <InfoSection>
      <NetworkRow
        tooltip={strings('earn.claim_bonus_network_tooltip')}
      />
    </InfoSection>
    <GasFeesDetailsRow disableUpdate />
  </View>
);
