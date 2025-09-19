import { Hex } from '@metamask/utils';
import React from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';

import Avatar, {
  AvatarVariant,
} from '../../../../../../../component-library/components/Avatars/Avatar';
import Badge, {
  BadgeVariant,
} from '../../../../../../../component-library/components/Badges/Badge';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../../../component-library/components/Badges/BadgeWrapper';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../../../component-library/components/Icons/Icon';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../../../component-library/hooks';
import { selectAvatarAccountType } from '../../../../../../../selectors/settings';
import { selectMultichainAccountsState2Enabled } from '../../../../../../../selectors/featureFlagController/multichainAccounts';
import useAccountInfo from '../../../../hooks/useAccountInfo';
import { useApprovalInfo } from '../../../../hooks/useApprovalInfo';
import useNetworkInfo from '../../../../hooks/useNetworkInfo';
import InfoSection from '../../../UI/info-row/info-section';
import styleSheet from './account-network-info-collapsed.styles';

const AccountNetworkInfoCollapsed = () => {
  const mockAvatarAccountType = useSelector(selectAvatarAccountType);
  const isMultichainAccountsState2Enabled = useSelector(
    selectMultichainAccountsState2Enabled,
  );
  const { chainId, fromAddress } = useApprovalInfo() ?? {};

  const { accountName, walletName, accountGroupName } = useAccountInfo(
    fromAddress as string,
    chainId as Hex,
  );
  const { styles } = useStyles(styleSheet, {});

  const { networkName, networkImage } = useNetworkInfo(chainId);

  const avatarComponent = (
    <Avatar
      variant={AvatarVariant.Account}
      type={mockAvatarAccountType}
      accountAddress={fromAddress as string}
    />
  );

  return (
    <InfoSection>
      <View style={styles.container}>
        <View style={styles.accountContainer}>
          {isMultichainAccountsState2Enabled ? (
            <View style={styles.badgeWrapper}>{avatarComponent}</View>
          ) : (
            <BadgeWrapper
              badgePosition={BadgePosition.BottomRight}
              badgeElement={
                <Badge
                  variant={BadgeVariant.Network}
                  name={networkName}
                  imageSource={networkImage}
                />
              }
              style={styles.badgeWrapper}
            >
              {avatarComponent}
            </BadgeWrapper>
          )}
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
            <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
              {walletName || networkName}
            </Text>
          </View>
        </View>
        <Icon
          color={IconColor.Muted}
          size={IconSize.Sm}
          name={IconName.ArrowRight}
        />
      </View>
    </InfoSection>
  );
};

export default AccountNetworkInfoCollapsed;
