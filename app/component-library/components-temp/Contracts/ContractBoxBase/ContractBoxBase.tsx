// Third party depencies
import React from 'react';
import { View, Pressable } from 'react-native';

// External dependencies.
import Avatar, {
  AvatarSize,
  AvatarVariants,
} from '../../../components/Avatars/Avatar';
import Text, { TextVariant } from '../../../components/Texts/Text';
import { formatAddress } from '../../../../util/address';
import Icon, { IconName, IconSize } from '../../../components/Icons/Icon';
import { useStyles } from '../../../hooks';
import Button, { ButtonVariants } from '../../../components/Buttons/Button';
import Identicon from '../../../../components/UI/Identicon';

// Internal dependencies.
import { ContractBoxBaseProps, IconViewProps } from './ContractBoxBase.types';
import styleSheet from './ContractBoxBase.styles';
import {
  EXPORT_ICON_TEST_ID,
  COPY_ICON_TEST_ID,
  CONTRACT_BOX_TEST_ID,
  CONTRACT_BOX_NO_PET_NAME_TEST_ID,
} from './ContractBoxBase.constants';

const ContractBoxBase = ({
  contractAddress,
  contractLocalImage,
  contractPetName,
  onCopyAddress,
  onExportAddress,
  onContractPress,
  hasBlockExplorer,
}: ContractBoxBaseProps) => {
  const formattedAddress = formatAddress(contractAddress, 'short');
  const {
    styles,
    theme: { colors },
  } = useStyles(styleSheet, {});

  const IconView = ({ onPress, name, size, testID }: IconViewProps) => (
    <Pressable style={styles.icon} onPress={onPress} testID={testID}>
      <Icon color={colors.icon.alternative} name={name} size={size} />
    </Pressable>
  );

  return (
    <View style={styles.container} testID={CONTRACT_BOX_TEST_ID}>
      <View style={styles.rowContainer}>
        <View style={styles.imageContainer}>
          {contractLocalImage ? (
            <Avatar
              variant={AvatarVariants.Token}
              size={AvatarSize.Md}
              imageSource={contractLocalImage}
            />
          ) : (
            <Identicon address={contractAddress} diameter={25} />
          )}
        </View>
        {contractPetName ? (
          <Pressable onPress={onContractPress}>
            <Text style={styles.header} variant={TextVariant.HeadingMD}>
              {contractPetName}
            </Text>
            <Text variant={TextVariant.BodyMD}>{formattedAddress}</Text>
          </Pressable>
        ) : (
          <View testID={CONTRACT_BOX_NO_PET_NAME_TEST_ID}>
            <Button
              variant={ButtonVariants.Link}
              textVariant={TextVariant.HeadingMD}
              label={formattedAddress}
              style={styles.header}
              onPress={onContractPress}
            />
          </View>
        )}
      </View>
      <View style={styles.iconContainer}>
        <IconView
          onPress={onCopyAddress}
          name={IconName.Copy}
          size={IconSize.Lg}
          testID={COPY_ICON_TEST_ID}
        />
        {hasBlockExplorer && (
          <IconView
            name={IconName.Export}
            onPress={onExportAddress}
            size={IconSize.Md}
            testID={EXPORT_ICON_TEST_ID}
          />
        )}
      </View>
    </View>
  );
};

export default ContractBoxBase;
