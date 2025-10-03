import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  Text,
  TextVariant,
  FontWeight,
  TextColor,
} from '@metamask/design-system-react-native';
import Avatar, {
  AvatarSize,
  AvatarVariant,
} from '../../../../../component-library/components/Avatars/Avatar';
import { getNetworkImageSource, isTestNet } from '../../../../../util/networks';
import { selectEvmNetworkConfigurationsByChainId } from '../../../../../selectors/networkController';
import { selectNonEvmNetworkConfigurationsByChainId } from '../../../../../selectors/multichainNetworkController';
import { CaipChainId } from '@metamask/utils';
import { toEvmCaipChainId } from '@metamask/multichain-network-controller';

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
    // Early return if scopes is not an array or is empty
    if (!Array.isArray(scopes) || scopes.length === 0) {
      return [];
    }

    const allNetworks: Record<
      CaipChainId,
      { name: string; chainId: CaipChainId }
    > = {};

    // Add EVM networks with hex chain IDs
    Object.entries(evmNetworks || {}).forEach(([hexChainId, networkConfig]) => {
      if (networkConfig?.name && typeof hexChainId === 'string') {
        try {
          const caipChainId = toEvmCaipChainId(hexChainId as `0x${string}`);
          allNetworks[caipChainId] = {
            name: networkConfig.name,
            chainId: caipChainId,
          };
        } catch (error) {
          // Skip invalid chain IDs
          console.warn('Invalid EVM chain ID:', hexChainId, error);
        }
      }
    });

    // Add non-EVM networks with CAIP chain IDs
    Object.entries(nonEvmNetworks || {}).forEach(([chainId, networkConfig]) => {
      if (typeof chainId === 'string' && networkConfig?.name) {
        const caipChainId = chainId as CaipChainId;
        allNetworks[caipChainId] = {
          name: networkConfig.name,
          chainId: caipChainId,
        };
      }
    });

    const compatibleNetworks: NetworkInfo[] = [];
    const addedChainIds = new Set<CaipChainId>();

    scopes.forEach((scope: string) => {
      // Skip invalid scope values
      if (typeof scope !== 'string' || !scope.trim()) {
        return;
      }

      const caipScope = scope as CaipChainId;

      // Safe check for wildcard patterns
      if (caipScope.includes(':*') || caipScope.endsWith(':0')) {
        // Wildcard scope - add all networks for this namespace
        const scopeParts = caipScope.split(':');
        if (scopeParts.length < 2) {
          console.warn('Invalid CAIP scope format:', caipScope);
          return;
        }

        const namespace = scopeParts[0];
        if (!namespace) {
          return;
        }

        Object.entries(allNetworks).forEach(([chainId, network]) => {
          if (typeof chainId !== 'string' || !network?.name) {
            return;
          }

          const chainIdParts = chainId.split(':');
          if (chainIdParts.length < 2) {
            return;
          }

          const chainIdNamespace = chainIdParts[0];
          const chainIdValue = chainIdParts[1];

          if (
            chainIdNamespace === namespace &&
            !addedChainIds.has(chainId as CaipChainId) &&
            typeof chainIdValue === 'string' &&
            !isTestNet(chainIdValue)
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
        if (
          network?.name &&
          !addedChainIds.has(caipScope) &&
          typeof network.chainId === 'string'
        ) {
          // Extract chain ID value for isTestNet check
          const chainIdParts = network.chainId.split(':');
          const chainIdValue =
            chainIdParts.length > 1 ? chainIdParts[1] : network.chainId;

          if (!isTestNet(chainIdValue)) {
            compatibleNetworks.push({
              chainId: caipScope,
              networkName: network.name,
            });
            addedChainIds.add(caipScope);
          }
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
            'h-6 w-6 items-center justify-center rounded-md bg-background-default',
          )}
        >
          <Text
            variant={TextVariant.BodyXs}
            fontWeight={FontWeight.Bold}
            color={TextColor.PrimaryAlternative}
          >
            +{remainingCount}
          </Text>
        </Box>
      )}
    </Box>
  );
};

export default NetworkAvatars;
