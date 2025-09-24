import { StyleSheet, View } from 'react-native';
import React, { useCallback } from 'react';
import BadgeWrapper from '../../../component-library/components/Badges/BadgeWrapper';
import Badge, {
  BadgeVariant,
} from '../../../component-library/components/Badges/Badge';
import { AvatarSize } from '../../../component-library/components/Avatars/Avatar';
import { BadgeAnchorElementShape } from '../../../component-library/components/Badges/BadgeWrapper/BadgeWrapper.types';
import { Image } from 'expo-image';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import {
  getTestNetImageByChainId,
  isLineaMainnetChainId,
  isMainNet,
  isSolanaMainnet,
  isTestNet,
} from '../../../util/networks';
import { useSelector } from 'react-redux';
import { SupportedCaipChainId } from '@metamask/multichain-network-controller';
import images from 'images/image-icons';
import {
  CustomNetworkImgMapping,
  PopularList,
  UnpopularNetworkList,
} from '../../../util/networks/customNetworks';
import { selectNetworkName } from '../../../selectors/networkInfos';

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
  },
  content: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  collectibleIcon: {
    width: '100%',
    height: '100%',
  },
});

const NftGridMedia = ({
  image,
  chainId,
}: {
  image: string | null | undefined;
  chainId: SupportedCaipChainId | `0x${string}`;
}) => {
  const networkName = useSelector(selectNetworkName);

  const NetworkBadgeSource = useCallback(() => {
    if (isTestNet(chainId)) return getTestNetImageByChainId(chainId);

    if (isMainNet(chainId)) return images.ETHEREUM;

    if (isLineaMainnetChainId(chainId)) return images['LINEA-MAINNET'];

    if (isSolanaMainnet(chainId)) return images.SOLANA;

    const unpopularNetwork = UnpopularNetworkList.find(
      (networkConfig) => networkConfig.chainId === chainId,
    );

    const popularNetwork = PopularList.find(
      (networkConfig) => networkConfig.chainId === chainId,
    );
    const network = unpopularNetwork || popularNetwork;
    const customNetworkImg = CustomNetworkImgMapping[chainId as `0x${string}`];

    if (network) {
      return network.rpcPrefs.imageSource;
    } else if (customNetworkImg) {
      return customNetworkImg;
    }
    return undefined;
  }, [chainId]);

  return (
    <BadgeWrapper
      style={styles.container}
      badgePosition={{
        bottom: 5,
        right: 5,
      }}
      anchorElementShape={BadgeAnchorElementShape.Rectangular}
      badgeElement={
        <Badge
          variant={BadgeVariant.Network}
          imageSource={NetworkBadgeSource()}
          name={networkName}
          isScaled={false}
          size={AvatarSize.Xs}
        />
      }
    >
      <View style={styles.content}>
        {image ? (
          <Image
            source={{ uri: image }}
            style={styles.collectibleIcon}
            contentFit="cover"
            placeholder="Loading..."
          />
        ) : (
          <Box twClassName="w-full h-full bg-alternative items-center justify-center">
            <Text variant={TextVariant.BodySm} twClassName="text-alternative">
              No Image
            </Text>
          </Box>
        )}
      </View>
    </BadgeWrapper>
  );
};

export default NftGridMedia;
