import React from 'react';
import { Text, View } from 'react-native';
import { useSelector } from 'react-redux';

import Avatar, {
  AvatarAccountType,
  AvatarVariant,
} from '../../../../../../../component-library/components/Avatars/Avatar';
import Badge, {
  BadgeVariant,
} from '../../../../../../../component-library/components/Badges/Badge';
import BadgeWrapper from '../../../../../../../component-library/components/Badges/BadgeWrapper';
import { selectChainId } from '../../../../../../../selectors/networkController';
import { useStyles } from '../../../../../../../component-library/hooks';
import { RootState } from '../../../../../../UI/BasicFunctionality/BasicFunctionalityModal/BasicFunctionalityModal.test';
import useAccountInfo from '../../../../hooks/useAccountInfo';
import useApprovalRequest from '../../../../hooks/useApprovalRequest';
import useNetworkInfo from '../../../../hooks/useNetworkInfo';
import styleSheet from './AccountNetworkInfoCollapsed.styles';

const AccountNetworkInfoCollapsed = () => {
  const { approvalRequest } = useApprovalRequest();
  const chainId = useSelector(selectChainId);
  const { networkName, networkImage } = useNetworkInfo(chainId);
  const useBlockieIcon = useSelector(
    (state: RootState) => state.settings.useBlockieIcon,
  );
  const fromAddress = approvalRequest?.requestData?.from;
  const { accountName } = useAccountInfo(fromAddress);
  const { styles } = useStyles(styleSheet, {});

  return (
    <View style={styles.container}>
      <BadgeWrapper
        badgeElement={
          <Badge
            variant={BadgeVariant.Network}
            name={networkName}
            imageSource={networkImage}
          />
        }
        style={styles.badgeWrapper}
      >
        <Avatar
          variant={AvatarVariant.Account}
          type={
            useBlockieIcon
              ? AvatarAccountType.Blockies
              : AvatarAccountType.JazzIcon
          }
          accountAddress={fromAddress}
        />
      </BadgeWrapper>
      <View>
        <Text style={styles.accountName}>{accountName}</Text>
        <Text style={styles.networkName}>{networkName}</Text>
      </View>
    </View>
  );
};

export default AccountNetworkInfoCollapsed;
