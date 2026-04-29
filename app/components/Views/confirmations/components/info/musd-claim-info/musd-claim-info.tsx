import React from 'react';
import { View } from 'react-native';

import { strings } from '../../../../../../../locales/i18n';
import InfoSection from '../../UI/info-row/info-section';
import { HeroRow } from '../../rows/transactions/hero-row';
import AccountRow from '../../rows/transactions/account-row';
import NetworkRow from '../../rows/transactions/network-row';
import GasFeesDetailsRow from '../../rows/transactions/gas-fee-details-row';
import { ConfirmationInfoComponentIDs } from '../../../constants/info-ids';

export const MusdClaimInfo = () => (
  <View testID={ConfirmationInfoComponentIDs.MUSD_CLAIM}>
    <HeroRow />
    <InfoSection>
      <AccountRow label={strings('stake.claiming_to')} />
    </InfoSection>
    <InfoSection>
      <NetworkRow tooltip={strings('earn.claim_bonus_network_tooltip')} />
    </InfoSection>
    <GasFeesDetailsRow disableUpdate />
  </View>
);
