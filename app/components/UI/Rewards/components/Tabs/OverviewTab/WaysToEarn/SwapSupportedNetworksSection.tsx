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
import { selectEvmNetworkConfigurationsByChainId } from '../../../../../../../selectors/networkController';
import { selectNonEvmNetworkConfigurationsByChainId } from '../../../../../../../selectors/multichainNetworkController';
import { PopularList } from '../../../../../../../util/networks/customNetworks';
import { selectAdditionalNetworksBlacklistFeatureFlag } from '../../../../../../../selectors/featureFlagController/networkBlacklist';
import { SeasonWayToEarnSpecificSwapDto } from '../../../../../../../core/Engine/controllers/rewards-controller/types';

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
      <Box twClassName="bg-muted px-1 rounded">
        <Text variant={TextVariant.BodyXs} color={TextColor.TextAlternative}>
          {network.boost}
        </Text>
      </Box>
    )}
  </Box>
);

export const SwapSupportedNetworksSection = ({
  supportedNetworksTitle,
  supportedNetworks,
}: SeasonWayToEarnSpecificSwapDto) => {
  const evmNetworkConfigurations = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );
  const nonEvmNetworkConfigurations = useSelector(
    selectNonEvmNetworkConfigurationsByChainId,
  );
  const additionalNetworksBlacklist = useSelector(
    selectAdditionalNetworksBlacklistFeatureFlag,
  );

  const resolvedNetworks = useMemo(() => {
    const allNetworkConfigurations: Record<
      string,
      { name: string; [key: string]: unknown }
    > = {
      ...evmNetworkConfigurations,
      ...nonEvmNetworkConfigurations,
    };

    // Exclude any chain IDs present in the remote/local blacklist
    const allowedNetworks = supportedNetworks.filter(
      (network) => !additionalNetworksBlacklist?.includes(network.chainId),
    );

    return allowedNetworks
      .map((network) => {
        const networkConfig = allNetworkConfigurations[network.chainId];
        let name = networkConfig?.name;

        // If we don't have the network config, check if it's in PopularList and use that name
        if (!name) {
          const popularNetwork = PopularList.find(
            (popular) => popular.chainId === network.chainId,
          );
          name = popularNetwork?.nickname || 'Unknown Network';
        }

        return {
          chainId: network.chainId,
          name,
          ...(network.boost && { boost: network.boost }),
        };
      })
      .filter((network) => network.name !== 'Unknown Network');
  }, [
    supportedNetworks,
    evmNetworkConfigurations,
    nonEvmNetworkConfigurations,
    additionalNetworksBlacklist,
  ]);

  return (
    <Box twClassName="w-full bg-muted p-4 rounded-md">
      <Text variant={TextVariant.SectionHeading}>{supportedNetworksTitle}</Text>
      <Box twClassName="mt-3">
        <Box
          flexDirection={BoxFlexDirection.Row}
          twClassName="flex-wrap -mx-2 -my-1"
        >
          {resolvedNetworks.map((network) => (
            <Box key={network.chainId} twClassName="basis-1/2 px-2 py-1">
              <SwapSupportedNetworkItem network={network} />
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default SwapSupportedNetworksSection;
