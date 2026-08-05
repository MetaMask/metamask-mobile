import React from 'react';
import { View } from 'react-native';
import {
  AvatarNetwork,
  AvatarNetworkSize,
  type ImageOrSvgSrc,
} from '@metamask/design-system-react-native';

import Text from '../../../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../../../../component-library/hooks';
import useNetworkInfo from '../../../../../hooks/useNetworkInfo';
import styleSheet from './network.styles';

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
      <AvatarNetwork
        name={networkName}
        src={networkImage as ImageOrSvgSrc}
        size={AvatarNetworkSize.Xs}
        imageOrSvgProps={{
          imageProps: { testID: 'network-avatar-image' },
        }}
      />
      <Text style={styles.value}>{networkName}</Text>
    </View>
  );
};

export default Network;
