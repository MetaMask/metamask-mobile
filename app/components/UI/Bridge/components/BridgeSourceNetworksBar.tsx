import React from 'react';
import { StyleSheet } from 'react-native';
import { Box } from '../../Box/Box';
import Text from '../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../component-library/hooks';
import { Theme } from '../../../../util/theme/models';
import { CaipChainId, Hex } from '@metamask/utils';
import { selectNetworkConfigurations } from '../../../../selectors/networkController';
import { getNetworkImageSource } from '../../../../util/networks';
import { FlexDirection, AlignItems } from '../../Box/box.types';
import { strings } from '../../../../../locales/i18n';
import { selectEnabledSourceChains } from '../../../../core/redux/slices/bridge';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import Button, {
  ButtonVariants,
} from '../../../../component-library/components/Buttons/Button';
import Routes from '../../../../constants/navigation/Routes';
import { useNavigation } from '@react-navigation/native';
import {
  AvatarSize,
  AvatarVariant,
} from '../../../../component-library/components/Avatars/Avatar';
import AvatarGroup from './AvatarGroup';

const createStyles = (params: { theme: Theme }) => {
  const { theme } = params;
  return StyleSheet.create({
    networksButton: {
      borderColor: theme.colors.border.muted,
    },
  });
};

interface SourceNetworksButtonProps {
  networksToShow: { chainId: Hex | CaipChainId }[];
  networkConfigurations: ReturnType<typeof selectNetworkConfigurations>;
  selectedSourceChainIds: (Hex | CaipChainId)[];
  enabledSourceChains: ReturnType<typeof selectEnabledSourceChains>;
  onPress?: () => void;
}

export const BridgeSourceNetworksBar: React.FC<SourceNetworksButtonProps> = ({
  networksToShow,
  networkConfigurations,
  selectedSourceChainIds,
  enabledSourceChains,
  onPress,
}) => {
  const { styles } = useStyles(createStyles, {});
  const navigation = useNavigation();

  let networkText = '';
  if (selectedSourceChainIds.length === enabledSourceChains.length) {
    networkText = strings('bridge.all_networks');
  } else if (selectedSourceChainIds.length === 1) {
    networkText = strings('bridge.one_network');
  } else {
    networkText = strings('bridge.num_networks', {
      numNetworks: selectedSourceChainIds.length,
    });
  }

  const navigateToNetworkSelector = () => {
    navigation.navigate(Routes.BRIDGE.MODALS.SOURCE_NETWORK_SELECTOR);
  };

  const networkAvatars = networksToShow.map(({ chainId }) => ({
    imageSource: getNetworkImageSource({ chainId }),
    name: networkConfigurations[chainId]?.name,
    size: AvatarSize.Xs,
    variant: AvatarVariant.Network as const,
    includesBorder: true,
  }));

  return (
    <Button
      onPress={onPress ?? navigateToNetworkSelector}
      variant={ButtonVariants.Secondary}
      label={
        <Box
          flexDirection={FlexDirection.Row}
          alignItems={AlignItems.center}
          gap={8}
        >
          <Box flexDirection={FlexDirection.Row} alignItems={AlignItems.center}>
            <AvatarGroup
              avatarPropsList={networkAvatars}
              size={AvatarSize.Xs}
              maxStackedAvatars={4}
            />
          </Box>
          <Text>{networkText}</Text>
        </Box>
      }
      style={styles.networksButton}
      endIconName={IconName.ArrowDown}
    />
  );
};
