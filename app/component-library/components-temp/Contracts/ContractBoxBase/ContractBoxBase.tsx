import React from 'react';
import Text, { TextVariant } from '../../../components/Texts/Text';
import { ContractBoxBaseProps, IconViewProps } from './ContractBoxBase.types';
import { View, Pressable } from 'react-native';
import { formatAddress } from '../../../../util/address';
import Icon, { IconName, IconSize } from '../../../components/Icon';
import styleSheet from './ContractBoxBase.styles';
import AvatarToken from '../../../components/Avatars/AvatarToken';
import {
  EXPORT_ICON_TEST_ID,
  COPY_ICON_TEST_ID,
  CONTRACT_BOX_TEST_ID,
  CONTRACT_BOX_NO_PET_NAME_TEST_ID,
} from './ContractBoxBase.constants';
import { useStyles } from '../../../hooks';

// External dependencies.
import { AvatarBaseSize } from '../../../components/Avatars/AvatarBase';

const ContractBoxBase = ({
  contractAddress,
  contractLocalImage,
  contractPetName,
  handleCopyAddress,
  handleExportAddress,
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
        <AvatarToken
          size={AvatarBaseSize.Xl}
          imageSource={contractLocalImage}
        />
        {contractPetName ? (
          <View>
            <Text style={styles.header} variant={TextVariant.sHeadingMD}>
              {contractPetName}
            </Text>
            <Text variant={TextVariant.sBodyMD}>{formattedAddress}</Text>
          </View>
        ) : (
          <View testID={CONTRACT_BOX_NO_PET_NAME_TEST_ID}>
            <Text style={styles.header} variant={TextVariant.sHeadingMD}>
              {formattedAddress}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.iconContainer}>
        <IconView
          onPress={handleCopyAddress}
          name={IconName.CopyFilled}
          size={IconSize.Lg}
          testID={COPY_ICON_TEST_ID}
        />
        <IconView
          onPress={handleExportAddress}
          name={IconName.ExportOutline}
          size={IconSize.Md}
          testID={EXPORT_ICON_TEST_ID}
        />
      </View>
    </View>
  );
};

export default ContractBoxBase;
