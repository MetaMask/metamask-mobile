import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  Text,
  TextVariant,
  TextColor,
  FontWeight,
} from '@metamask/design-system-react-native';
import Avatar, {
  AvatarSize,
  AvatarVariant,
} from '../../../../../component-library/components/Avatars/Avatar';
import { getNetworkImageSource } from '../../../../../util/networks';
import { selectEvmNetworkConfigurationsByChainId } from '../../../../../selectors/networkController';
import { selectNonEvmNetworkConfigurationsByChainId } from '../../../../../selectors/multichainNetworkController';
import { CaipChainId, toCaipChainId } from '@metamask/utils';

export interface NetworkAvatarsProps {
  scopes: string[];
  maxVisible?: number;
  testID?: string;
}

interface NetworkInfo {
  chainId: CaipChainId;
  networkName: string;
}

const NetworkAvatars: React.FC<NetworkAvatarsProps> = ({
  scopes,
  maxVisible = 3,
  testID,
}) => {
  const tw = useTailwind();
  const evmNetworks = useSelector(selectEvmNetworkConfigurationsByChainId);
  const nonEvmNetworks = useSelector(
    selectNonEvmNetworkConfigurationsByChainId,
  );

  // Convert scopes to network information
  const networks = useMemo(() => {
    const allNetworks: Record<
      CaipChainId,
      { name: string; chainId: CaipChainId }
    > = {};

    // Add EVM networks with hex chain IDs
    Object.entries(evmNetworks || {}).forEach(([hexChainId, networkConfig]) => {
      if (networkConfig?.name) {
        const caipChainId = toCaipChainId('eip155', hexChainId);
        allNetworks[caipChainId] = {
          name: networkConfig.name,
          chainId: caipChainId,
        };
      }
    });

    // Add non-EVM networks with CAIP chain IDs
    Object.entries(nonEvmNetworks || {}).forEach(([chainId, networkConfig]) => {
      const caipChainId = chainId as CaipChainId;
      if (networkConfig?.name) {
        allNetworks[caipChainId] = {
          name: networkConfig.name,
          chainId: caipChainId,
        };
      }
    });

    const compatibleNetworks: NetworkInfo[] = [];
    const addedChainIds = new Set<CaipChainId>();

    scopes.forEach((scope: string) => {
      const caipScope = scope as CaipChainId;
      if (caipScope.includes(':*') || caipScope.endsWith(':0')) {
        // Wildcard scope - add all networks for this namespace
        const namespace = caipScope.split(':')[0];
        Object.entries(allNetworks).forEach(([chainId, network]) => {
          if (
            chainId.split(':')[0] === namespace &&
            !addedChainIds.has(chainId as CaipChainId)
          ) {
            compatibleNetworks.push({
              chainId: chainId as CaipChainId,
              networkName: network.name,
            });
            addedChainIds.add(chainId as CaipChainId);
          }
        });
      } else {
        // Specific network scope
        const network = allNetworks[caipScope];
        if (network && !addedChainIds.has(caipScope)) {
          compatibleNetworks.push({
            chainId: caipScope,
            networkName: network.name,
          });
          addedChainIds.add(caipScope);
        }
      }
    });

    return compatibleNetworks;
  }, [scopes, evmNetworks, nonEvmNetworks]);

  if (!networks.length) {
    return null;
  }

  const visibleNetworks = networks.slice(0, maxVisible);
  const remainingCount = Math.max(0, networks.length - maxVisible);

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      testID={testID}
      twClassName="gap-1"
    >
      {visibleNetworks.map((network, index) => {
        const networkImageSource = getNetworkImageSource({
          chainId: network.chainId,
        });

        return (
          <Box
            key={network.chainId}
            style={tw.style(
              'relative',
              // Add higher z-index to later avatars so they appear on top
              { zIndex: visibleNetworks.length - index },
            )}
          >
            <Avatar
              variant={AvatarVariant.Network}
              size={AvatarSize.Sm}
              name={network.networkName}
              imageSource={networkImageSource}
              style={tw.style(
                'border-2 border-background-default bg-background-default',
              )}
            />
          </Box>
        );
      })}

      {remainingCount > 0 && (
        <Box
          style={tw.style(
            'h-8 w-8 items-center justify-center rounded-full border-2 border-background-default bg-background-alternative',
          )}
        >
          <Text
            variant={TextVariant.BodyXs}
            color={TextColor.TextAlternative}
            fontWeight={FontWeight.Medium}
          >
            +{remainingCount}
          </Text>
        </Box>
      )}
    </Box>
  );
};

export default NetworkAvatars;
