import React from 'react';
import Text, { TextVariant } from '../../../components/Texts/Text';
import { ContractBoxBaseProps } from './ContractBoxBase.types';
import { View } from 'react-native';
import { formatAddress } from '../../../../util/address';
import Icon, { IconName, IconSize } from '../../../components/Icon';
import styleSheet from './ContractBoxBase.styles';
import AvatarToken from '../../../components/Avatars/AvatarToken';
import { useStyles } from '../../../hooks';

// External dependencies.
import { AvatarBaseSize } from '../../../components/Avatars/AvatarBase';

const ContractBoxBase = ({
  contractAddress,
  contractLocalImage,
  contractPetName,
}: ContractBoxBaseProps) => {
  const formattedAddress = formatAddress(contractAddress, 'short');
  const { styles } = useStyles(styleSheet, {});

  return (
    <View style={styles.container}>
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
          <Text style={styles.header} variant={TextVariant.sHeadingMD}>
            {formattedAddress}
          </Text>
        )}
      </View>
      <View style={styles.iconContainer}>
        <Icon color="grey" name={IconName.CopyFilled} size={IconSize.Lg} />
        <Icon color="grey" name={IconName.ExportOutline} size={IconSize.Md} />
      </View>
    </View>
  );
};

export default ContractBoxBase;
