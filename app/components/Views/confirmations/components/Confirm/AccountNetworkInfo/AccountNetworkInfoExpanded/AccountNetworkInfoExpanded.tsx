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
import { useMultichainBalances } from '../../../../../../hooks/useMultichainBalances';
import { useTransactionMetadataRequest } from '../../../../hooks/useTransactionMetadataRequest';

const AccountNetworkInfoExpanded = () => {
  const signatureRequest = useSignatureRequest();
  const transactionMetadata = useTransactionMetadataRequest();

  let chainId: Hex | undefined;
  let fromAddress: string | undefined;
  if (signatureRequest) {
    chainId = signatureRequest?.chainId as Hex;
    fromAddress = signatureRequest?.messageParams?.from as string;
  } else {
    chainId = transactionMetadata?.chainId as Hex;
    fromAddress = transactionMetadata?.txParams?.from as string;
  }
  const { accountAddress } = useAccountInfo(fromAddress);
  const { multichainBalances } = useMultichainBalances();
  const balanceToDisplay = multichainBalances.displayBalance;

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
