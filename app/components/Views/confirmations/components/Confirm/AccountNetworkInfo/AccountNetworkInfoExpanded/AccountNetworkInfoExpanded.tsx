import React from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';

import { strings } from '../../../../../../../../locales/i18n';
import {
  selectChainId,
  selectProviderConfig,
} from '../../../../../../../selectors/networkController';
import useAccountInfo from '../../../../hooks/useAccountInfo';
import useApprovalRequest from '../../../../hooks/useApprovalRequest';
import InfoSection from '../../../UI/InfoRow/InfoSection';
import InfoRow from '../../../UI/InfoRow';
import Url from '../../../UI/InfoRow/InfoValue/Url';
import Network from '../../../UI/InfoRow/InfoValue/Network';

// todo: use value component for address, currency value
const AccountNetworkInfoExpanded = () => {
  const { approvalRequest } = useApprovalRequest();
  const chainId = useSelector(selectChainId);
  const { rpcUrl: networkRpcUrl, type: networkType } =
    useSelector(selectProviderConfig);
  const fromAddress = approvalRequest?.requestData?.from;
  const { accountAddress, accountBalance } = useAccountInfo(fromAddress);

  return (
    <View>
      <InfoSection>
        <InfoRow label={strings('confirm.account')}>{accountAddress}</InfoRow>
        <InfoRow label={strings('confirm.balance')}>{accountBalance}</InfoRow>
      </InfoSection>
      <InfoSection>
        <InfoRow
          label={strings('confirm.network')}
          // todo: add tooltip content when available
          tooltip={strings('confirm.network')}
        >
          <Network chainId={chainId} />
        </InfoRow>
        <InfoRow label={strings('confirm.rpc_url')}>
          <Url url={networkRpcUrl ?? `https://${networkType}.infura.io/v3/`} />
        </InfoRow>
      </InfoSection>
    </View>
  );
};

export default AccountNetworkInfoExpanded;
