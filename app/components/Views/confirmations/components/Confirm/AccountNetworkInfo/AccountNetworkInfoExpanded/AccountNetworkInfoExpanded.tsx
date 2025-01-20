import React from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';

import { strings } from '../../../../../../../../locales/i18n';
import { selectChainId } from '../../../../../../../selectors/networkController';
import { renderShortAddress } from '../../../../../../../util/address';
import useAccountInfo from '../../../../hooks/useAccountInfo';
import useApprovalRequest from '../../../../hooks/useApprovalRequest';
import InfoSection from '../../../UI/InfoRow/InfoSection';
import InfoRow from '../../../UI/InfoRow';
import Network from '../../../UI/InfoRow/InfoValue/Network';

const AccountNetworkInfoExpanded = () => {
  const { approvalRequest } = useApprovalRequest();
  const chainId = useSelector(selectChainId);
  const fromAddress = approvalRequest?.requestData?.from;
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
