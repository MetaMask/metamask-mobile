import React, { useCallback } from 'react';
import { StyleSheet } from 'react-native';
import { Box } from '../../Box/Box';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
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
import AvatarNetwork from '../../../../component-library/components/Avatars/Avatar/variants/AvatarNetwork/AvatarNetwork';
import { AvatarSize } from '../../../../component-library/components/Avatars/Avatar';

const NETWORK_GAP = 2;
const NETWORK_OVERFLOW_OVERLAY_SIZE = 16;
const NETWORK_OVERFLOW_OVERLAY_MARGIN_LEFT =
  -NETWORK_OVERFLOW_OVERLAY_SIZE - NETWORK_GAP;

const createStyles = (params: { theme: Theme }) => {
  const { theme } = params;
  return StyleSheet.create({
    networksButton: {
      borderColor: theme.colors.border.muted,
    },
    avatarContainer: {},
    avatarNetwork: {
      marginRight: 0,
    },
    networkOverflowOverlay: {
      backgroundColor: theme.colors.overlay.alternative,
      width: NETWORK_OVERFLOW_OVERLAY_SIZE,
      height: NETWORK_OVERFLOW_OVERLAY_SIZE,
      borderRadius: 4,
      marginLeft: NETWORK_OVERFLOW_OVERLAY_MARGIN_LEFT,
      lineHeight: NETWORK_OVERFLOW_OVERLAY_SIZE,
      paddingHorizontal: 0.5,
    },
  });
};

export const MAX_NETWORK_ICONS = 3;

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
    navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.SOURCE_NETWORK_SELECTOR,
    });
  };

  const renderSourceNetworks = useCallback(
    () =>
      networksToShow.map(({ chainId }) => (
        <Box key={chainId} style={styles.avatarContainer}>
          <AvatarNetwork
            key={chainId}
            imageSource={getNetworkImageSource({ chainId })}
            name={networkConfigurations[chainId]?.name}
            size={AvatarSize.Xs}
            style={styles.avatarNetwork}
          />
        </Box>
      )),
    [networkConfigurations, styles, networksToShow],
  );

  return (
    <Button
      onPress={onPress ?? navigateToNetworkSelector}
      variant={ButtonVariants.Secondary}
      label={
        <Box
          flexDirection={FlexDirection.Row}
          alignItems={AlignItems.center}
          gap={4}
        >
          <Box
            flexDirection={FlexDirection.Row}
            alignItems={AlignItems.center}
            gap={NETWORK_GAP}
          >
            {renderSourceNetworks()}
            {selectedSourceChainIds.length > MAX_NETWORK_ICONS && (
              <Text
                variant={TextVariant.BodyXS}
                color={TextColor.Inverse}
                style={styles.networkOverflowOverlay}
              >
                +{selectedSourceChainIds.length - MAX_NETWORK_ICONS}
              </Text>
            )}
          </Box>
          <Text>{networkText}</Text>
        </Box>
      }
      style={styles.networksButton}
      endIconName={IconName.ArrowDown}
    />
  );
};
