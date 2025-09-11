import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import AvatarNetwork from '../../../../../../component-library/components/Avatars/Avatar/variants/AvatarNetwork/AvatarNetwork';
import { AvatarSize } from '../../../../../../component-library/components/Avatars/Avatar';
import { getNetworkImageSource } from '../../../../../../util/networks';
import { NETWORKS_CHAIN_ID } from '../../../../../../constants/network';
import { SolScope } from '@metamask/keyring-api';

const NetworkItem = ({
  network,
}: {
  network: (typeof supportedNetworks)[0];
}) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    justifyContent={BoxJustifyContent.Between}
    twClassName="gap-1"
  >
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName="gap-1 flex-1 min-w-0"
    >
      <AvatarNetwork
        size={AvatarSize.Xs}
        name={network.name}
        imageSource={getNetworkImageSource({
          chainId: network.chainId,
        })}
      />
      <Text
        variant={TextVariant.BodyXs}
        color={TextColor.TextAlternative}
        numberOfLines={1}
        ellipsizeMode="tail"
        twClassName="min-w-0 shrink"
      >
        {network.name}
      </Text>
    </Box>
    {network.boost && (
      <Box twClassName="bg-muted px-1 py-0.5 rounded">
        <Text variant={TextVariant.BodyXs} color={TextColor.TextAlternative}>
          {network.boost}
        </Text>
      </Box>
    )}
  </Box>
);

const supportedNetworks = [
  { chainId: NETWORKS_CHAIN_ID.MAINNET, name: 'Ethereum Mainnet' },
  { chainId: NETWORKS_CHAIN_ID.LINEA_MAINNET, name: 'Linea', boost: '+100%' },
  { chainId: NETWORKS_CHAIN_ID.OPTIMISM, name: 'OP Mainnet' },
  { chainId: NETWORKS_CHAIN_ID.BSC, name: 'Binance Smart Chain' },
  { chainId: NETWORKS_CHAIN_ID.POLYGON, name: 'Polygon' },
  { chainId: NETWORKS_CHAIN_ID.BASE, name: 'Base' },
  { chainId: NETWORKS_CHAIN_ID.ARBITRUM, name: 'Arbitrum One' },
  { chainId: SolScope.Mainnet, name: 'Solana' },
  { chainId: NETWORKS_CHAIN_ID.AVAXCCHAIN, name: 'Avalanche' },
  { chainId: NETWORKS_CHAIN_ID.ZKSYNC_ERA, name: 'zkSync' },
  { chainId: NETWORKS_CHAIN_ID.SEI, name: 'sEI' },
];

export const SupportedNetworksSection = () => (
  <Box twClassName="w-full bg-muted p-4 rounded-md">
    <Text variant={TextVariant.SectionHeading}>{'Supported Networks'}</Text>
    <Box twClassName="mt-3">
      <Box
        flexDirection={BoxFlexDirection.Row}
        twClassName="flex-wrap -mx-2 -my-1"
      >
        {supportedNetworks.map((network, index) => (
          <Box key={index} twClassName="basis-1/2 px-2 py-1">
            <NetworkItem network={network} />
          </Box>
        ))}
      </Box>
    </Box>
  </Box>
);

export default SupportedNetworksSection;
