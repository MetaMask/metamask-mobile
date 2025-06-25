import React from 'react';
import { View } from 'react-native';

import { strings } from '../../../../../../../../locales/i18n';
import useAccountInfo from '../../../../hooks/useAccountInfo';
import InfoSection from '../../../UI/info-row/info-section';
import InfoRow from '../../../UI/info-row';
import Network from '../../../UI/info-row/info-value/network';
import { useSignatureRequest } from '../../../../hooks/signatures/useSignatureRequest';
import { Hex } from '@metamask/utils';
import { renderShortAddress } from '../../../../../../../util/address';
import { useSelectedAccountMultichainBalances } from '../../../../../../hooks/useMultichainBalances';
import { useTransactionMetadataRequest } from '../../../../hooks/transactions/useTransactionMetadataRequest';
import { useTransactionBatchesMetadata } from '../../../../hooks/transactions/useTransactionBatchesMetadata';

const AccountNetworkInfoExpanded = () => {
  const signatureRequest = useSignatureRequest();
  const transactionMetadata = useTransactionMetadataRequest();
  const transactionBatchesMetadata = useTransactionBatchesMetadata();
  let chainId: Hex | undefined;
  let fromAddress: string | undefined;
  if (signatureRequest) {
    chainId = signatureRequest?.chainId as Hex;
    fromAddress = signatureRequest?.messageParams?.from as string;
  } else if (transactionMetadata) {
    chainId = transactionMetadata?.chainId as Hex;
    fromAddress = transactionMetadata?.txParams?.from as string;
  } else {
    // transactionBatchesMetadata
    chainId = transactionBatchesMetadata?.chainId as Hex;
    fromAddress = transactionBatchesMetadata?.from as string;
  }

  const { accountAddress } = useAccountInfo(fromAddress, chainId as Hex);
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
