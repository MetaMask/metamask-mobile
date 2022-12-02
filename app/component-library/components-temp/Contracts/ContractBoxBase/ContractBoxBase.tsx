// Third party depencies
import React from 'react';
import { View, Pressable } from 'react-native';

// External dependencies.
import Avatar, {
  AvatarSize,
  AvatarVariants,
} from '../../../components/Avatars/Avatar';
import Text, { TextVariants } from '../../../components/Texts/Text';
import { formatAddress } from '../../../../util/address';
import Icon, { IconNames, IconSize } from '../../../components/Icons/Icon';
import { useStyles } from '../../../hooks';

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
          <View>
            <Text style={styles.header} variant={TextVariants.sHeadingMD}>
              {contractPetName}
            </Text>
            <Text variant={TextVariants.sBodyMD}>{formattedAddress}</Text>
          </View>
        ) : (
          <View testID={CONTRACT_BOX_NO_PET_NAME_TEST_ID}>
            <Text style={styles.header} variant={TextVariants.sHeadingMD}>
              {formattedAddress}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.iconContainer}>
        <IconView
          onPress={onCopyAddress}
          name={IconNames.Copy}
          size={IconSize.Lg}
          testID={COPY_ICON_TEST_ID}
        />
        <IconView
          onPress={onExportAddress}
          name={IconNames.Export}
          size={IconSize.Md}
          testID={EXPORT_ICON_TEST_ID}
        />
      </View>
    </View>
  );
};

export default ContractBoxBase;
