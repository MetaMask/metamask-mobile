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

// InfoRow's default 8px paddingBottom + InfoSection's 8px paddingBottom = 16
// below vs the section's 12px paddingTop. Drop the row's paddingBottom to 4
// so total bottom (4 + 8) matches total top (12) and the row sits centered.
const SINGLE_ROW_OVERRIDE = { paddingBottom: 4 };

const ClaimingToRow = () => {
  const selectedAccount = useSelector(selectSelectedInternalAccount);
  const address = selectedAccount?.address ?? '';
  const truncated = address
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : '';
  const display = selectedAccount?.metadata?.name || truncated;
  return (
    <InfoRow label={strings('stake.claiming_to')} style={SINGLE_ROW_OVERRIDE}>
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
      <NetworkRow
        tooltip={strings('earn.claim_bonus_network_tooltip')}
        style={SINGLE_ROW_OVERRIDE}
      />
    </InfoSection>
    <GasFeesDetailsRow disableUpdate />
  </View>
);
