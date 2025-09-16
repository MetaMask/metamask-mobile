import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import AvatarNetwork from '../../../../../../../component-library/components/Avatars/Avatar/variants/AvatarNetwork/AvatarNetwork';
import { AvatarSize } from '../../../../../../../component-library/components/Avatars/Avatar';
import { getNetworkImageSource } from '../../../../../../../util/networks';
import { NETWORKS_CHAIN_ID } from '../../../../../../../constants/network';
import { SolScope } from '@metamask/keyring-api';
import { selectEvmNetworkConfigurationsByChainId } from '../../../../../../../selectors/networkController';
import { selectNonEvmNetworkConfigurationsByChainId } from '../../../../../../../selectors/multichainNetworkController';
import { strings } from '../../../../../../../../locales/i18n';
import { PopularList } from '../../../../../../../util/networks/customNetworks';

interface NetworkConfig {
  chainId: string;
  name: string;
  boost?: string;
}

const SwapSupportedNetworkItem = ({ network }: { network: NetworkConfig }) => (
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

// Define which networks are supported for rewards
const SWAP_SUPPORTED_CHAIN_IDS = [
  NETWORKS_CHAIN_ID.MAINNET,
  NETWORKS_CHAIN_ID.LINEA_MAINNET,
  NETWORKS_CHAIN_ID.OPTIMISM,
  NETWORKS_CHAIN_ID.BSC,
  NETWORKS_CHAIN_ID.POLYGON,
  NETWORKS_CHAIN_ID.BASE,
  NETWORKS_CHAIN_ID.ARBITRUM,
  SolScope.Mainnet,
  NETWORKS_CHAIN_ID.AVAXCCHAIN,
  NETWORKS_CHAIN_ID.ZKSYNC_ERA,
  NETWORKS_CHAIN_ID.SEI,
];

export const SwapSupportedNetworksSection = () => {
  const evmNetworkConfigurations = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );
  const nonEvmNetworkConfigurations = useSelector(
    selectNonEvmNetworkConfigurationsByChainId,
  );

  const supportedNetworks = useMemo(() => {
    const allNetworkConfigurations: Record<
      string,
      { name: string; [key: string]: unknown }
    > = {
      ...evmNetworkConfigurations,
      ...nonEvmNetworkConfigurations,
    };

    return SWAP_SUPPORTED_CHAIN_IDS.map((chainId) => {
      const networkConfig = allNetworkConfigurations[chainId];
      let name = networkConfig?.name;

      // If we don't have the network config, check if it's in PopularList and use that name
      if (!name) {
        const popularNetwork = PopularList.find(
          (network) => network.chainId === chainId,
        );
        name = popularNetwork?.nickname || 'Unknown Network';
      }

      // Add boost for Linea
      const boost =
        chainId === NETWORKS_CHAIN_ID.LINEA_MAINNET ? '+100%' : undefined;

      return {
        chainId,
        name,
        ...(boost && { boost }),
      };
    }).filter((network) => network.name !== 'Unknown Network'); // Only include networks we have names for
  }, [evmNetworkConfigurations, nonEvmNetworkConfigurations]);

  return (
    <Box twClassName="w-full bg-muted p-4 rounded-md">
      <Text variant={TextVariant.SectionHeading}>
        {strings('rewards.ways_to_earn.supported_networks')}
      </Text>
      <Box twClassName="mt-3">
        <Box
          flexDirection={BoxFlexDirection.Row}
          twClassName="flex-wrap -mx-2 -my-1"
        >
          {supportedNetworks.map((network, index) => (
            <Box key={index} twClassName="basis-1/2 px-2 py-1">
              <SwapSupportedNetworkItem network={network} />
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default SwapSupportedNetworksSection;
