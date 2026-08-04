import { Hex } from '@metamask/utils';
import React from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';
import { AvatarAccount } from '@metamask/design-system-react-native';

import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../../../component-library/components/Icons/Icon';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../../component-library/components/Texts/Text';
import { getAvatarAccountVariant } from '../../../../../../../component-library/components-temp/MultichainAccounts/avatarAccountVariant';
import { useStyles } from '../../../../../../../component-library/hooks';
import { selectAvatarAccountType } from '../../../../../../../selectors/settings';
import useAccountInfo from '../../../../hooks/useAccountInfo';
import { useApprovalInfo } from '../../../../hooks/useApprovalInfo';
import InfoSection from '../../../UI/info-row/info-section';
import styleSheet from './account-network-info-collapsed.styles';
import { selectWalletsMap } from '../../../../../../../selectors/multichainAccounts/accountTreeController';

const AccountNetworkInfoCollapsed = () => {
  const accountAvatarType = useSelector(selectAvatarAccountType);
  const { chainId, fromAddress } = useApprovalInfo() ?? {};
  const walletsMap = useSelector(selectWalletsMap);
  const hasMoreThanOneWallet = Object.keys(walletsMap || {}).length > 1;

  const { accountName, walletName, accountGroupName } = useAccountInfo(
    fromAddress as string,
    chainId as Hex,
  );
  const { styles } = useStyles(styleSheet, {});

  const avatarComponent = (
    <AvatarAccount
      variant={getAvatarAccountVariant(accountAvatarType)}
      address={fromAddress as string}
    />
  );

  return (
    <InfoSection>
      <View style={styles.container}>
        <View style={styles.accountContainer}>
          <View style={styles.badgeWrapper}>{avatarComponent}</View>
          <View style={styles.infoContainer}>
            <View style={styles.accountInfo}>
              <Text
                ellipsizeMode="tail"
                numberOfLines={1}
                style={styles.accountName}
              >
                {accountGroupName || accountName}
              </Text>
            </View>
            {hasMoreThanOneWallet && (
              <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
                {walletName}
              </Text>
            )}
          </View>
        </View>
        <Icon
          color={IconColor.Muted}
          size={IconSize.Sm}
          name={IconName.ArrowDown}
        />
      </View>
    </InfoSection>
  );
};

export default AccountNetworkInfoCollapsed;
