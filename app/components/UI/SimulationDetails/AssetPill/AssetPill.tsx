/* eslint-disable react/prop-types */
import React from 'react';
import { View, ViewProps } from 'react-native';
import { useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';

import Text, {
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import AvatarNetwork from '../../../../component-library/components/Avatars/Avatar/variants/AvatarNetwork';
import { AvatarSize } from '../../../../component-library/components/Avatars/Avatar/Avatar.types';
import {
  selectChainId,
  selectTicker,
} from '../../../../selectors/networkController';
import { NetworkList } from '../../../../util/networks';
import { useStyles } from '../../../hooks/useStyles';
import Name from '../../Name/Name';
import { NameType } from '../../Name/Name.types';
import { AssetIdentifier, AssetType } from '../types';
import styleSheet from './AssetPill.styles';

interface AssetPillProperties extends ViewProps {
  asset: AssetIdentifier;
}

const getNetworkImage = (chainId: Hex) => {
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const network: any = Object.values(NetworkList).find(
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (nw: any) => nw.chainId === chainId,
  );
  return network?.imageSource || null;
};

const NativeAssetPill: React.FC = () => {
  const { styles } = useStyles(styleSheet, {});
  const ticker = useSelector(selectTicker);
  const chainId = useSelector(selectChainId);
  const imageSource = getNetworkImage(chainId);

  return (
    <View style={styles.nativeAssetPill}>
      <AvatarNetwork
        testID="simulation-details-asset-pill-avatar-network"
        size={AvatarSize.Xs}
        name={ticker}
        imageSource={imageSource}
      />
      <Text variant={TextVariant.BodyMD}>{ticker}</Text>
    </View>
  );
};

const AssetPill: React.FC<AssetPillProperties> = ({ asset }) => {
  const { styles } = useStyles(styleSheet, {});

  return (
    <View style={styles.assetPill}>
      {asset.type === AssetType.Native ? (
        <NativeAssetPill />
      ) : (
        <Name
          testID="simulation-details-asset-pill-name"
          type={NameType.EthereumAddress}
          value={asset.address as Hex}
        />
      )}
    </View>
  );
};

export default AssetPill;
