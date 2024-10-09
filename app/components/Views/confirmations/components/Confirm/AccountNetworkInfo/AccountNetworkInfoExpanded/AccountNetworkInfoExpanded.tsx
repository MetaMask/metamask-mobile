import React from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';

import { strings } from '../../../../../../../../locales/i18n';
import { selectRpcUrl } from '../../../../../../../selectors/networkController';
import { useStyles } from '../../../../../../../component-library/hooks';
import { selectNetworkName } from '../../../../../../../selectors/networkInfos';
import useAccountInfo from '../../../../hooks/useAccountInfo';
import useApprovalRequest from '../../../../hooks/useApprovalRequest';
import styleSheet from './AccountNetworkInfoExpanded.styles';
import InfoSection from '../../../UI/InfoRow/InfoSection';
import InfoRow from '../../../UI/InfoRow';
import InfoURL from '../../../UI/InfoRow/InfoValue/InfoURL';

const AccountNetworkInfoExpanded = () => {
  const { approvalRequest } = useApprovalRequest();
  const networkName = useSelector(selectNetworkName);
  const networkRpcUrl = useSelector(selectRpcUrl);
  const fromAddress = approvalRequest?.requestData?.from;
  const { accountAddress, addressBalance } = useAccountInfo(fromAddress);
  const { styles } = useStyles(styleSheet, {});

  return (
    <View style={styles.container}>
      <InfoSection>
        <InfoRow label={strings('confirm.account')}>{accountAddress}</InfoRow>
        <InfoRow label={strings('confirm.balance')}>{addressBalance}</InfoRow>
      </InfoSection>
      <InfoSection>
        <InfoRow
          label={strings('confirm.network')}
          tooltip={strings('confirm.network')}
        >
          {networkName}
        </InfoRow>
        <InfoRow label={strings('confirm.rpc_url')}>
          <InfoURL url={networkRpcUrl} />
        </InfoRow>
      </InfoSection>
    </View>
  );
};

export default AccountNetworkInfoExpanded;
