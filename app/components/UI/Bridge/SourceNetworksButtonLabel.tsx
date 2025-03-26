import React from 'react';
import { StyleSheet } from 'react-native';
import { Box } from '../Box/Box';
import Text, { TextVariant } from '../../../component-library/components/Texts/Text';
import { useStyles } from '../../../component-library/hooks';
import { Theme } from '../../../util/theme/models';
import { Hex } from '@metamask/utils';
import { selectNetworkConfigurations } from '../../../selectors/networkController';
import { getNetworkImageSource } from '../../../util/networks';
import { FlexDirection, AlignItems, JustifyContent } from '../Box/box.types';
import Badge, { BadgeVariant } from '../../../component-library/components/Badges/Badge';
import { strings } from '../../../../locales/i18n';
import { selectEnabledSourceChains } from '../../../core/redux/slices/bridge';

const createStyles = (params: { theme: Theme }) => {
  const { theme } = params;
  return StyleSheet.create({
    networkOverflowCircle: {
      backgroundColor: theme.colors.background.alternative,
      width: 20,
      height: 20,
      borderRadius: 10,
    },
  });
};

export const MAX_NETWORK_ICONS = 2;

interface SourceNetworksButtonProps {
  networksToShow: { chainId: Hex }[];
  networkConfigurations: ReturnType<typeof selectNetworkConfigurations>;
  selectedSourceChainIds: Hex[];
  enabledSourceChains: ReturnType<typeof selectEnabledSourceChains>;
}

export const SourceNetworksButtonLabel: React.FC<SourceNetworksButtonProps> = ({
  networksToShow,
  networkConfigurations,
  selectedSourceChainIds,
  enabledSourceChains,
}) => {
  const { styles } = useStyles(createStyles, {});

  let networkText = '';
  if (selectedSourceChainIds.length === enabledSourceChains.length) {
    networkText = strings('bridge.all_networks');
  } else if (selectedSourceChainIds.length === 1) {
    networkText = strings('bridge.one_network');
  } else {
    networkText = strings('bridge.num_networks', { numNetworks: selectedSourceChainIds.length });
  }

  return (
    <Box flexDirection={FlexDirection.Row} alignItems={AlignItems.center} gap={4}>
      <Box flexDirection={FlexDirection.Row} alignItems={AlignItems.center} gap={-8}>
          {networksToShow.map(({ chainId }) => (
            <Badge
              key={chainId}
            variant={BadgeVariant.Network}
            // @ts-expect-error - The utils/network file is still JS and this function expects a networkType, and should be optional
            imageSource={getNetworkImageSource({ chainId })}
            name={networkConfigurations[chainId]?.name}
            />
          ))}
          {selectedSourceChainIds.length > MAX_NETWORK_ICONS && (
            <Box style={styles.networkOverflowCircle} justifyContent={JustifyContent.center} alignItems={AlignItems.center}>
              <Text variant={TextVariant.BodySM}>+{selectedSourceChainIds.length - MAX_NETWORK_ICONS}</Text>
            </Box>
          )}
        </Box>
        <Text>{networkText}</Text>
    </Box>
  );
};
