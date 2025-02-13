import React from 'react';
import { View } from 'react-native';

import Avatar, {
  AvatarSize,
  AvatarVariant,
} from '../../../../../../../../component-library/components/Avatars/Avatar';
import Text from '../../../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../../../../component-library/hooks';
import useNetworkInfo from '../../../../../hooks/useNetworkInfo';
import styleSheet from './Network.styles';

interface NetworkProps {
  chainId?: string;
}

const Network = ({ chainId }: NetworkProps) => {
  const { networkName, networkImage } = useNetworkInfo(chainId);
  const { styles } = useStyles(styleSheet, {});

  if (!chainId) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Avatar
        variant={AvatarVariant.Network}
        name={networkName}
        imageSource={networkImage}
        size={AvatarSize.Sm}
      />
      <Text style={styles.value}>{networkName}</Text>
    </View>
  );
};

export default Network;
