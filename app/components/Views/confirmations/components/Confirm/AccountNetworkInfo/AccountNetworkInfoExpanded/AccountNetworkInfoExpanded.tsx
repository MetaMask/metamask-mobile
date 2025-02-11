import React from 'react';
import { View } from 'react-native';

import { strings } from '../../../../../../../../locales/i18n';
import useAccountInfo from '../../../../hooks/useAccountInfo';
import InfoSection from '../../../UI/InfoRow/InfoSection';
import InfoRow from '../../../UI/InfoRow';
import Network from '../../../UI/InfoRow/InfoValue/Network';
import { useSignatureRequest } from '../../../../hooks/useSignatureRequest';
import { Hex } from '@metamask/utils';
import { renderShortAddress } from '../../../../../../../util/address';

const AccountNetworkInfoExpanded = () => {
  const signatureRequest = useSignatureRequest();
  const chainId = signatureRequest?.chainId as Hex;

  const fromAddress = signatureRequest?.messageParams?.from as string;
  const { accountAddress, accountFiatBalance } = useAccountInfo(fromAddress);

  return (
    <View>
      <InfoSection>
        <InfoRow label={strings('confirm.account')}>
          {renderShortAddress(accountAddress, 5)}
        </InfoRow>
        <InfoRow label={strings('confirm.balance')}>
          {accountFiatBalance}
        </InfoRow>
      </InfoSection>
      <InfoSection>
        <InfoRow label={strings('confirm.network')}>
          <Network chainId={chainId} />
        </InfoRow>
      </InfoSection>
    </View>
  );
};

export default AccountNetworkInfoExpanded;
