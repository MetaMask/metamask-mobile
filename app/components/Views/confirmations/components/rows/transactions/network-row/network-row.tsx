import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Hex } from '@metamask/utils';

import { strings } from '../../../../../../../../locales/i18n';
import Text, {
  TextVariant,
} from '../../../../../../../component-library/components/Texts/Text';
import AvatarNetwork from '../../../../../../../component-library/components/Avatars/Avatar/variants/AvatarNetwork/AvatarNetwork';
import { AvatarSize } from '../../../../../../../component-library/components/Avatars/Avatar/Avatar.types';
import { getNetworkImageSource } from '../../../../../../../util/networks';
import useNetworkInfo from '../../../../hooks/useNetworkInfo';
import InfoRow from '../../../UI/info-row';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    marginRight: 4,
  },
});

interface NetworkRowProps {
  chainId: Hex;
}

const NetworkRow = ({ chainId }: NetworkRowProps) => {
  const { networkName } = useNetworkInfo(chainId);
  const networkImage = getNetworkImageSource({ chainId });

  return (
    <InfoRow label={strings('transactions.network')}>
      <View style={styles.container}>
        {networkImage && (
          <AvatarNetwork
            size={AvatarSize.Xs}
            imageSource={networkImage}
            style={styles.avatar}
          />
        )}
        <Text variant={TextVariant.BodyMD}>{networkName}</Text>
      </View>
    </InfoRow>
  );
};

export default NetworkRow;
