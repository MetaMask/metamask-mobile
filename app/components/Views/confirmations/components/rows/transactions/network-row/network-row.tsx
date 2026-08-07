import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Hex } from '@metamask/utils';
import {
  AvatarNetwork,
  AvatarNetworkSize,
  type ImageOrSvgSrc,
} from '@metamask/design-system-react-native';

import { strings } from '../../../../../../../../locales/i18n';
import Text, {
  TextVariant,
} from '../../../../../../../component-library/components/Texts/Text';
import { getNetworkImageSource } from '../../../../../../../util/networks';
import useNetworkInfo from '../../../../hooks/useNetworkInfo';
import { useTransactionMetadataRequest } from '../../../../hooks/transactions/useTransactionMetadataRequest';
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
  chainId?: Hex;
  style?: Record<string, unknown>;
}

const NetworkRow = ({ chainId: chainIdProp, style }: NetworkRowProps) => {
  const transactionMetadata = useTransactionMetadataRequest();
  const chainId = chainIdProp ?? (transactionMetadata?.chainId as Hex);
  const { networkName } = useNetworkInfo(chainId);
  const networkImage = getNetworkImageSource({ chainId });

  return (
    <InfoRow label={strings('transactions.network')} style={style}>
      <View style={styles.container}>
        {networkImage && (
          <View style={styles.avatar}>
            <AvatarNetwork
              size={AvatarNetworkSize.Xs}
              src={networkImage as ImageOrSvgSrc}
              name={networkName}
            />
          </View>
        )}
        <Text variant={TextVariant.BodyMD}>{networkName}</Text>
      </View>
    </InfoRow>
  );
};

export default NetworkRow;
