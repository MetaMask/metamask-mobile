import React from 'react';
import { StyleSheet, View } from 'react-native';
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
import Address from '../../../UI/InfoRow/InfoValue/Address';
import DisplayURL from '../../../UI/InfoRow/InfoValue/DisplayURL';
import Network from '../../../UI/InfoRow/InfoValue/Network';

const styles = StyleSheet.create({
  addressRowValue: {
    paddingTop: 8,
  },
});

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
        <InfoRow label={strings('confirm.account')}>
          <View style={styles.addressRowValue}>
            <Address address={accountAddress} chainId={chainId} />
          </View>
        </InfoRow>
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
          <DisplayURL
            url={networkRpcUrl ?? `https://${networkType}.infura.io/v3/`}
          />
        </InfoRow>
      </InfoSection>
    </View>
  );
};

export default AccountNetworkInfoExpanded;
