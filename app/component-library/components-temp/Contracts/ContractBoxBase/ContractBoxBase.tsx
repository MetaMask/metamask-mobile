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
import Icon, { IconName, IconSize } from '../../../components/Icon';
import { useStyles } from '../../../hooks';
import Button, { ButtonVariants } from '../../../components/Buttons/Button';

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
}: ContractBoxBaseProps) => {
  const formattedAddress = formatAddress(contractAddress, 'short');
  const { styles } = useStyles(styleSheet, {});

  const IconView = ({ onPress, name, size, testID }: IconViewProps) => (
    <Pressable onPress={onPress} testID={testID}>
      <Icon color={'grey'} name={name} size={size} />
    </Pressable>
  );

  return (
    <View style={styles.container} testID={CONTRACT_BOX_TEST_ID}>
      <View style={styles.rowContainer}>
        <Avatar
          variant={AvatarVariants.Token}
          size={AvatarSize.Xl}
          imageSource={contractLocalImage}
        />
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
              style={styles.header}
              onPress={onContractPress}
            >
              {formattedAddress}
            </Button>
          </View>
        )}
      </View>
      <View style={styles.iconContainer}>
        <IconView
          onPress={onCopyAddress}
          name={IconName.CopyFilled}
          size={IconSize.Lg}
          testID={COPY_ICON_TEST_ID}
        />
        <IconView
          onPress={onExportAddress}
          name={IconName.ExportOutline}
          size={IconSize.Md}
          testID={EXPORT_ICON_TEST_ID}
        />
      </View>
    </View>
  );
};

export default ContractBoxBase;
