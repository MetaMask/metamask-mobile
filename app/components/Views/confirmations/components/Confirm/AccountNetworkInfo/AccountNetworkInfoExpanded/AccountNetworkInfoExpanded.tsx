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
import { useSelectedAccountMultichainBalances } from '../../../../../../hooks/useMultichainBalances';

const AccountNetworkInfoExpanded = () => {
  const signatureRequest = useSignatureRequest();
  const chainId = signatureRequest?.chainId as Hex;

  const fromAddress = signatureRequest?.messageParams?.from as string;
  const { accountAddress } = useAccountInfo(fromAddress);
  const { selectedAccountMultichainBalance } =
    useSelectedAccountMultichainBalances();
  const balanceToDisplay = selectedAccountMultichainBalance?.displayBalance;

  return (
    <View>
      <InfoSection>
        <InfoRow label={strings('confirm.label.account')}>
          {renderShortAddress(accountAddress, 5)}
        </InfoRow>
        <InfoRow label={strings('confirm.label.balance')}>
          {balanceToDisplay}
        </InfoRow>
      </InfoSection>
      <InfoSection>
        <InfoRow label={strings('confirm.label.network')}>
          <Network chainId={chainId} />
        </InfoRow>
      </InfoSection>
    </View>
  );
};

export default AccountNetworkInfoExpanded;
