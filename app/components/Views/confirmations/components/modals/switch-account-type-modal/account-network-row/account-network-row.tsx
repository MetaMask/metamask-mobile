import React from 'react';
import { View } from 'react-native';

import { strings } from '../../../../../../../../locales/i18n';
import Avatar, {
  AvatarSize,
  AvatarVariant,
} from '../../../../../../../component-library/components/Avatars/Avatar';
import Button, {
  ButtonVariants,
} from '../../../../../../../component-library/components/Buttons/Button';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../../component-library/components/Texts/Text';
import { getNetworkImageSource } from '../../../../../../../util/networks';
import { useStyles } from '../../../../../../hooks/useStyles';
import { EIP7702NetworkConfiguration } from '../../../../hooks/useEIP7702Networks';
import styleSheet from './account-network-row.styles';

const AccountNetworkRow = ({
  network,
}: {
  network: EIP7702NetworkConfiguration;
}) => {
  const { styles } = useStyles(styleSheet, {});
  const { name, chainId, isSupported } = network;
  const networkImage = getNetworkImageSource({ networkType: 'evm', chainId });

  return (
    <View style={styles.wrapper}>
      <View style={styles.left_section}>
        <Avatar
          variant={AvatarVariant.Network}
          size={AvatarSize.Lg}
          name={name}
          imageSource={networkImage}
        />
        <View style={styles.name_section}>
          <Text variant={TextVariant.BodyMDBold}>{name}</Text>
          <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
            {isSupported
              ? strings('confirm.7702_functionality.smartAccountLabel')
              : strings('confirm.7702_functionality.standardAccountLabel')}
          </Text>
        </View>
      </View>
      <Button
        variant={ButtonVariants.Link}
        label={strings('confirm.7702_functionality.switch')}
        onPress={() => undefined}
      />
    </View>
  );
};

export default AccountNetworkRow;
