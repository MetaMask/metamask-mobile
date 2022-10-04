// Third party depencies
import React from 'react';
import { View, Pressable } from 'react-native';

// External dependencies.
import { AvatarBaseSize } from '../../../components/Avatars/AvatarBase';
import Text, { TextVariant } from '../../../components/Texts/Text';
import { formatAddress } from '../../../../util/address';
import Icon, { IconName, IconSize } from '../../../components/Icon';
import AvatarToken from '../../../components/Avatars/AvatarToken';
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
