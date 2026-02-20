import React from 'react';
import { TouchableOpacity } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import Text from '../../../../../component-library/components/Texts/Text/Text';
import Avatar, {
  AvatarSize,
  AvatarVariant,
} from '../../../../../component-library/components/Avatars/Avatar';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../../component-library/components/Buttons/ButtonIcon';
import {
  IconColor,
  IconName,
} from '../../../../../component-library/components/Icons/Icon';
import { getNetworkImageSource } from '../../../../../util/networks';
import { ImportTokenViewSelectorsIDs } from '../../ImportAssetView.testIds';
import { Box } from '@metamask/design-system-react-native';
import {
  MultichainNetworkConfiguration,
  SupportedCaipChainId,
} from '@metamask/multichain-network-controller';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Hex } from '@metamask/utils';

interface NetworkSelectorProps {
  selectedNetwork: SupportedCaipChainId | Hex | null;
  openNetworkSelector: () => void;
  networkConfigurations: Record<string, MultichainNetworkConfiguration>;
}

const NetworkSelector = ({
  selectedNetwork,
  openNetworkSelector,
  networkConfigurations,
}: NetworkSelectorProps) => {
  const tw = useTailwind();

  return (
    <Box twClassName="px-4 pt-4" testID="add-asset-network-selector">
      <TouchableOpacity
        style={tw.style(
          'border border-default rounded-lg flex-row items-center p-4 mb-4 mt-1',
        )}
        onPress={openNetworkSelector}
        onLongPress={openNetworkSelector}
      >
        {selectedNetwork ? (
          <Box twClassName="mr-2">
            <Avatar
              variant={AvatarVariant.Network}
              size={AvatarSize.Sm}
              name={networkConfigurations?.[selectedNetwork as Hex]?.name || ''}
              imageSource={getNetworkImageSource({
                networkType: 'evm',
                chainId: selectedNetwork,
              })}
              testID={ImportTokenViewSelectorsIDs.SELECT_NETWORK_BUTTON}
            />
          </Box>
        ) : null}
        <Text style={tw.style('text-default text-base')}>
          {selectedNetwork
            ? networkConfigurations?.[selectedNetwork as Hex]?.name
            : strings('networks.select_network')}
        </Text>
        <Box
          twClassName="flex-row items-center absolute px-4 right-0"
          pointerEvents="none"
        >
          <ButtonIcon
            iconName={IconName.ArrowDown}
            size={ButtonIconSizes.Sm}
            iconColor={IconColor.Default}
            testID={ImportTokenViewSelectorsIDs.SELECT_NETWORK_BUTTON}
            accessibilityRole="button"
          />
        </Box>
      </TouchableOpacity>
    </Box>
  );
};

export default NetworkSelector;
