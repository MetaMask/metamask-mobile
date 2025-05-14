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
import InfoSection from '../../../UI/info-row/info-section';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../../../component-library/components/Icons/Icon';
import useAccountInfo from '../../../../hooks/useAccountInfo';
import useNetworkInfo from '../../../../hooks/useNetworkInfo';
import { useSignatureRequest } from '../../../../hooks/signatures/useSignatureRequest';
import styleSheet from './account-network-info-collapsed.styles';
import { Hex } from '@metamask/utils';
import { useTransactionMetadataRequest } from '../../../../hooks/transactions/useTransactionMetadataRequest';

const AccountNetworkInfoCollapsed = () => {
  const useBlockieIcon = useSelector(
    (state: RootState) => state.settings.useBlockieIcon,
  );

  const signatureRequest = useSignatureRequest();
  const transactionMetadata = useTransactionMetadataRequest();

  let chainId: Hex | undefined;
  let fromAddress: string | undefined;
  if (signatureRequest) {
    chainId = signatureRequest?.chainId;
    fromAddress = signatureRequest?.messageParams?.from;
  } else {
    chainId = transactionMetadata?.chainId;
    fromAddress = transactionMetadata?.txParams?.from as string;
  }
  const { accountName } = useAccountInfo(fromAddress);
  const accountLabel = getLabelTextByAddress(fromAddress);
  const { styles } = useStyles(styleSheet, {
    accountNameWide: Boolean(!accountLabel),
  });

  const { networkName, networkImage } = useNetworkInfo(chainId);

  return (
    <InfoSection>
      <View style={styles.container}>
        <View style={styles.accountContainer}>
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
