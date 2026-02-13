import React from 'react';
import { View } from 'react-native';
import { Hex } from '@metamask/utils';

import { strings } from '../../../../../../../locales/i18n';
import InfoSection from '../../UI/info-row/info-section';
import InfoRowDivider from '../../UI/info-row-divider';
import { HeroRow } from '../../rows/transactions/hero-row';
import AccountRow from '../../rows/transactions/account-row';
import NetworkRow from '../../rows/transactions/network-row';
import GasFeesDetailsRow from '../../rows/transactions/gas-fee-details-row';
import { ConfirmationInfoComponentIDs } from '../../../constants/info-ids';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';

export const MusdClaimInfo = () => {
  const transactionMetadata = useTransactionMetadataRequest();

  if (!transactionMetadata) {
    return null;
  }

  const chainId = transactionMetadata.chainId as Hex;

  return (
    <View testID={ConfirmationInfoComponentIDs.MUSD_CLAIM}>
      <HeroRow />
      <InfoSection>
        <AccountRow label={strings('stake.claiming_to')} chainId={chainId} />
        <InfoRowDivider />
        <NetworkRow chainId={chainId} />
      </InfoSection>
      <GasFeesDetailsRow disableUpdate />
    </View>
  );
};
