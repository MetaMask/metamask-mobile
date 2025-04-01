import React from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';

import Avatar, {
  AvatarAccountType,
  AvatarVariant,
} from '../../../../../../../component-library/components/Avatars/Avatar';
import Badge, {
  BadgeVariant,
} from '../../../../../../../component-library/components/Badges/Badge';
import Text from '../../../../../../../component-library/components/Texts/Text';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../../../component-library/components/Badges/BadgeWrapper';
import TagBase, {
  TagSeverity,
  TagShape,
} from '../../../../../../../component-library/base-components/TagBase';
import { getLabelTextByAddress } from '../../../../../../../util/address';
import { useStyles } from '../../../../../../../component-library/hooks';
import { RootState } from '../../../../../../UI/BasicFunctionality/BasicFunctionalityModal/BasicFunctionalityModal.test';
import useAccountInfo from '../../../../hooks/useAccountInfo';
import useNetworkInfo from '../../../../hooks/useNetworkInfo';
import { useSignatureRequest } from '../../../../hooks/useSignatureRequest';
import styleSheet from './AccountNetworkInfoCollapsed.styles';

const AccountNetworkInfoCollapsed = () => {
  const signatureRequest = useSignatureRequest();
  const chainId = signatureRequest?.chainId;
  const { networkName, networkImage } = useNetworkInfo(chainId);
  const useBlockieIcon = useSelector(
    (state: RootState) => state.settings.useBlockieIcon,
  );
  const fromAddress = signatureRequest?.messageParams?.from as string;
  const { accountName } = useAccountInfo(fromAddress);
  const accountLabel = getLabelTextByAddress(fromAddress);
  const { styles } = useStyles(styleSheet, {
    accountNameWide: Boolean(!accountLabel),
  });

  return (
    <View style={styles.container}>
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
        <View style={styles.accountInfo}>
          <Text
            ellipsizeMode="tail"
            numberOfLines={1}
            style={styles.accountName}
          >
            {accountName}
          </Text>
          {accountLabel && (
            <TagBase
              style={styles.accountLabel}
              severity={TagSeverity.Neutral}
              shape={TagShape.Rectangle}
            >
              {accountLabel}
            </TagBase>
          )}
        </View>
        <Text style={styles.networkName}>{networkName}</Text>
      </View>
    </View>
  );
};

export default AccountNetworkInfoCollapsed;
