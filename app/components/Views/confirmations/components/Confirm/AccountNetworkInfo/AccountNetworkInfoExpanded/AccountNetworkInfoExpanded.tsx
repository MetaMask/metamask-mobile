import React from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';

import { strings } from '../../../../../../../../locales/i18n';
import { selectProviderConfig } from '../../../../../../../selectors/networkController';
import { selectNetworkName } from '../../../../../../../selectors/networkInfos';
import useAccountInfo from '../../../../hooks/useAccountInfo';
import useApprovalRequest from '../../../../hooks/useApprovalRequest';
import InfoSection from '../../../UI/InfoRow/InfoSection';
import InfoRow from '../../../UI/InfoRow';
import Address from '../../../UI/InfoRow/InfoValue/Address';
import InfoURL from '../../../UI/InfoRow/InfoValue/InfoURL';

// todo: use value component for address, network, currency value
const AccountNetworkInfoExpanded = () => {
  const { approvalRequest } = useApprovalRequest();
  const networkName = useSelector(selectNetworkName);
  const { rpcUrl: networkRpcUrl, type: networkType } =
    useSelector(selectProviderConfig);
  const fromAddress = approvalRequest?.requestData?.from;
  const { accountAddress, accountBalance } = useAccountInfo(fromAddress);

  return (
    <View>
      <InfoSection>
        <InfoRow label={strings('confirm.account')}>
          <Address address={accountAddress}></Address>
        </InfoRow>
        <InfoRow label={strings('confirm.balance')}>{accountBalance}</InfoRow>
      </InfoSection>
      <InfoSection>
        <InfoRow
          label={strings('confirm.network')}
          // todo: add tooltip content when available
          tooltip={strings('confirm.network')}
        >
          {networkName}
        </InfoRow>
        <InfoRow label={strings('confirm.rpc_url')}>
          <InfoURL
            url={networkRpcUrl ?? `https://${networkType}.infura.io/v3/`}
          />
        </InfoRow>
      </InfoSection>
    </View>
  );
};

export default AccountNetworkInfoExpanded;
