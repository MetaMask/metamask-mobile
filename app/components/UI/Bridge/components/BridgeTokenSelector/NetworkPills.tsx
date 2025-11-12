import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { StyleSheet } from 'react-native';
import {
  Text,
  Button,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { selectBridgeFeatureFlags } from '../../../../../core/redux/slices/bridge';
import { RootState } from '../../../../../reducers';
import { Hex, CaipChainId } from '@metamask/utils';
import { selectNetworkConfigurations } from '../../../../../selectors/networkController';
import { PopularList } from '../../../../../util/networks/customNetworks';
import { MultichainNetworkConfiguration } from '@metamask/multichain-network-controller';
import { ScrollView } from 'react-native-gesture-handler';
import { useStyles } from '../../../../../component-library/hooks';
import { Theme } from '../../../../../util/theme/models';
import { NETWORK_TO_SHORT_NETWORK_NAME_MAP } from '../../../../../constants/bridge';

const getNetworkName = (
  chainId: Hex | CaipChainId,
  networkConfigurations: Record<string, MultichainNetworkConfiguration>,
) => {
  // Convert CAIP chain ID to hex format for network configurations lookup
  const convertedChainId = chainId.startsWith('eip155:')
    ? `0x${parseInt(chainId.split(':')[1]).toString(16)}`
    : chainId;

  return (
    NETWORK_TO_SHORT_NETWORK_NAME_MAP[convertedChainId as CaipChainId | Hex] ??
    networkConfigurations?.[convertedChainId as Hex]?.name ??
    PopularList.find((network) => network.chainId === convertedChainId)
      ?.nickname ??
    'Unknown Network'
  );
};

const createStyles = (params: { theme: Theme }) => {
  const { theme } = params;
  return StyleSheet.create({
    networksButton: {
      borderColor: theme.colors.border.muted,
      backgroundColor: theme.colors.background.default,
      borderRadius: 10,
    },
    selectedNetworkIcon: {
      borderColor: theme.colors.border.muted,
      backgroundColor: theme.colors.background.muted,
      borderRadius: 10,
    },
    scrollView: {
      flexGrow: 0,
    },
    contentContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginHorizontal: 8,
    },
  });
};

interface NetworkPillsProps {
  selectedChainId?: CaipChainId;
  onChainSelect: (chainId?: CaipChainId) => void;
}

export const NetworkPills: React.FC<NetworkPillsProps> = ({
  selectedChainId,
  onChainSelect,
}) => {
  const { styles } = useStyles(createStyles, {});
  const bridgeFeatureFlags = useSelector((state: RootState) =>
    selectBridgeFeatureFlags(state),
  );
  const networkConfigurations = useSelector(selectNetworkConfigurations);

  // Extract chainRanking from feature flags
  const chainRanking = useMemo(() => {
    // Use chainRanking from bridge feature flags
    if (!bridgeFeatureFlags.chainRanking) {
      return [];
    }

    return bridgeFeatureFlags.chainRanking.map((chain) => ({
      ...chain,
      name: getNetworkName(chain.chainId, networkConfigurations),
    }));
  }, [bridgeFeatureFlags, networkConfigurations]);

  const handleAllPress = () => {
    onChainSelect(undefined);
  };

  const handleChainPress = (chainId: CaipChainId) => {
    onChainSelect(chainId);
  };

  const renderChainPills = () =>
    chainRanking.map((chain) => {
      const isSelected = selectedChainId === chain.chainId;

      return (
        <Button
          key={chain.chainId}
          variant={ButtonVariant.Secondary}
          style={
            isSelected ? styles.selectedNetworkIcon : styles.networksButton
          }
          onPress={() => handleChainPress(chain.chainId)}
        >
          <Text>{chain.name}</Text>
        </Button>
      );
    });

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scrollView}
      contentContainerStyle={styles.contentContainer}
    >
      {/* All CTA - First pill */}
      <Button
        variant={ButtonVariant.Secondary}
        style={
          !selectedChainId ? styles.selectedNetworkIcon : styles.networksButton
        }
        onPress={handleAllPress}
      >
        <Text>{strings('bridge.all')}</Text>
      </Button>
      {renderChainPills()}
    </ScrollView>
  );
};
