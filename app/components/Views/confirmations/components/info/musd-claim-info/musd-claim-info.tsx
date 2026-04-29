import React from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';

import { strings } from '../../../../../../../locales/i18n';
import Text, {
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import InfoSection from '../../UI/info-row/info-section';
import InfoRow from '../../UI/info-row';
import { HeroRow } from '../../rows/transactions/hero-row';
import NetworkRow from '../../rows/transactions/network-row';
import GasFeesDetailsRow from '../../rows/transactions/gas-fee-details-row';
import { ConfirmationInfoComponentIDs } from '../../../constants/info-ids';
import { selectSelectedInternalAccount } from '../../../../../../selectors/accountsController';

const ClaimingToRow = () => {
  const selectedAccount = useSelector(selectSelectedInternalAccount);
  const address = selectedAccount?.address ?? '';
  const truncated = address
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : '';
  const display = selectedAccount?.metadata?.name || truncated;
  return (
    <InfoRow label={strings('stake.claiming_to')}>
      <Text variant={TextVariant.BodyMD}>{display}</Text>
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
      <NetworkRow tooltip={strings('earn.claim_bonus_network_tooltip')} />
    </InfoSection>
    <GasFeesDetailsRow disableUpdate />
  </View>
);
