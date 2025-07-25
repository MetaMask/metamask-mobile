import { Hex } from '@metamask/utils';
import React from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';

import TagBase, {
  TagSeverity,
  TagShape,
} from '../../../../../../../component-library/base-components/TagBase';
import Avatar, {
  AvatarAccountType,
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
import { getLabelTextByAddress } from '../../../../../../../util/address';
import { RootState } from '../../../../../../UI/BasicFunctionality/BasicFunctionalityModal/BasicFunctionalityModal.test';
import { useSignatureRequest } from '../../../../hooks/signatures/useSignatureRequest';
import { useTransactionBatchesMetadata } from '../../../../hooks/transactions/useTransactionBatchesMetadata';
import { useTransactionMetadataRequest } from '../../../../hooks/transactions/useTransactionMetadataRequest';
import useAccountInfo from '../../../../hooks/useAccountInfo';
import useNetworkInfo from '../../../../hooks/useNetworkInfo';
import InfoSection from '../../../UI/info-row/info-section';
import styleSheet from './account-network-info-collapsed.styles';

const AccountNetworkInfoCollapsed = () => {
  const useBlockieIcon = useSelector(
    (state: RootState) => state.settings.useBlockieIcon,
  );

  const signatureRequest = useSignatureRequest();
  const transactionMetadata = useTransactionMetadataRequest();
  const transactionBatchesMetadata = useTransactionBatchesMetadata();

  let chainId: Hex | undefined;
  let fromAddress: string | undefined;
  if (signatureRequest) {
    chainId = signatureRequest?.chainId;
    fromAddress = signatureRequest?.messageParams?.from;
  } else if (transactionMetadata) {
    chainId = transactionMetadata?.chainId as Hex;
    fromAddress = transactionMetadata?.txParams?.from as string;
  } else {
    // transactionBatchesMetadata
    chainId = transactionBatchesMetadata?.chainId as Hex;
    fromAddress = transactionBatchesMetadata?.from as string;
  }
  const { accountName } = useAccountInfo(fromAddress, chainId as Hex);
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
            <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
              {networkName}
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
