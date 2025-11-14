import React, {
  useRef,
  useState,
  useCallback,
  useEffect,
  useMemo,
} from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { useTheme } from '../../../../util/theme';
import { useParams } from '../../../../util/navigation/navUtils';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../component-library/components/BottomSheets/BottomSheetHeader';
import Text, {
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconSize,
} from '../../../../component-library/components/Icons/Icon';
import Avatar, {
  AvatarSize,
  AvatarVariant,
} from '../../../../component-library/components/Avatars/Avatar';
import { strings } from '../../../../../locales/i18n';
import { ProcessedNetwork } from '../../../hooks/useNetworksByNamespace/useNetworksByNamespace';
import { CaipChainId } from '@metamask/utils';
import {
  selectNetworkConfigurationsByCaipChainId,
  EvmAndMultichainNetworkConfigurationsWithCaipChainId,
} from '../../../../selectors/networkController';
import { SupportedCaipChainId } from '@metamask/multichain-network-controller';
import { getNetworkImageSource } from '../../../../util/networks';
import { POPULAR_NETWORK_CHAIN_IDS } from '../../../../constants/popular-networks';

export enum NetworkOption {
  AllNetworks = 'all',
}

export interface TrendingTokenNetworkBottomSheetParams {
  onNetworkSelect?: (chainIds: CaipChainId[] | null) => void;
  selectedNetwork?: CaipChainId[] | null;
}

const closeButtonStyle = StyleSheet.create({
  closeButton: {
    width: 24,
    height: 24,
    flexShrink: 0,
    marginTop: -12,
  },
});

const TrendingTokenNetworkBottomSheet = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { onNetworkSelect, selectedNetwork: initialSelectedNetwork } =
    useParams<TrendingTokenNetworkBottomSheetParams>();

  const networkConfigurations = useSelector(
    selectNetworkConfigurationsByCaipChainId,
  );

  const networks = useMemo(() => {
    const filteredConfigs: EvmAndMultichainNetworkConfigurationsWithCaipChainId[] =
      [];

    for (const [caipChainId, config] of Object.entries(networkConfigurations)) {
      // Only include popular networks
      const isPopular =
        POPULAR_NETWORK_CHAIN_IDS.has(caipChainId as SupportedCaipChainId) ||
        POPULAR_NETWORK_CHAIN_IDS.has(config.chainId as SupportedCaipChainId);

      if (!isPopular) {
        continue;
      }

      // Include all networks (EVM and non-EVM like Solana)
      // No filtering by isEvm since we want to show all networks
      filteredConfigs.push(config);
    }

    // Convert to ProcessedNetwork format
    return filteredConfigs.map(
      (config): ProcessedNetwork => ({
        id: config.caipChainId,
        name: config.name,
        caipChainId: config.caipChainId,
        isSelected: false,
        imageSource: getNetworkImageSource({
          chainId: config.caipChainId,
        }),
      }),
    );
  }, [networkConfigurations]);

  // Default to "All networks" if no selection
  const [selectedNetwork, setSelectedNetwork] = useState<
    CaipChainId[] | null | NetworkOption
  >(initialSelectedNetwork ?? NetworkOption.AllNetworks);

  // Sync selectedNetwork when initialSelectedNetwork changes
  useEffect(() => {
    if (initialSelectedNetwork !== undefined) {
      setSelectedNetwork(initialSelectedNetwork);
    }
  }, [initialSelectedNetwork]);

  const optionStyles = StyleSheet.create({
    optionsList: {
      paddingBottom: 32,
    },
    optionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 16,
      paddingHorizontal: 16,
      minHeight: 56,
    },
    optionRowSelected: {
      backgroundColor: colors.background.muted,
    },
    optionContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
  });

  const handleClose = useCallback(() => {
    // Navigate back immediately to dismiss modal and remove overlay
    // The sheet animation will continue in the background
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
    sheetRef.current?.onCloseBottomSheet();
  }, [navigation]);

  const handleSheetClose = useCallback(() => {
    // Navigate back immediately when clicking outside to dismiss modal and remove overlay
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  const isAllNetworksSelected =
    selectedNetwork === NetworkOption.AllNetworks || selectedNetwork === null;

  const onNetworkOptionPress = useCallback(
    (network: ProcessedNetwork | NetworkOption.AllNetworks) => {
      if (network === NetworkOption.AllNetworks) {
        setSelectedNetwork(NetworkOption.AllNetworks);
        if (onNetworkSelect) {
          onNetworkSelect(null);
        }
      } else {
        const chainIds = [(network as ProcessedNetwork).caipChainId];
        setSelectedNetwork(chainIds);
        if (onNetworkSelect) {
          onNetworkSelect(chainIds);
        }
      }
      sheetRef.current?.onCloseBottomSheet();
    },
    [onNetworkSelect],
  );

  const isNetworkSelected = (network: ProcessedNetwork) => {
    if (isAllNetworksSelected) return false;
    return (
      Array.isArray(selectedNetwork) &&
      selectedNetwork.includes(network.caipChainId)
    );
  };

  return (
    <BottomSheet
      shouldNavigateBack={false}
      ref={sheetRef}
      onClose={handleSheetClose}
    >
      <BottomSheetHeader
        onClose={handleClose}
        closeButtonProps={{ style: closeButtonStyle.closeButton }}
      >
        <Text variant={TextVariant.HeadingMD}>
          {strings('trending.networks')}
        </Text>
      </BottomSheetHeader>
      <ScrollView style={optionStyles.optionsList}>
        <TouchableOpacity
          style={[
            optionStyles.optionRow,
            isAllNetworksSelected && optionStyles.optionRowSelected,
          ]}
          onPress={() => onNetworkOptionPress(NetworkOption.AllNetworks)}
        >
          <View style={optionStyles.optionContent}>
            <Icon name={IconName.Global} size={IconSize.Md} />
            <Text variant={TextVariant.BodyMD}>
              {strings('trending.all_networks')}
            </Text>
          </View>
          {isAllNetworksSelected && (
            <Icon name={IconName.Check} size={IconSize.Md} />
          )}
        </TouchableOpacity>
        {networks.map((network) => {
          const isSelected = isNetworkSelected(network);
          return (
            <TouchableOpacity
              key={network.caipChainId}
              style={[
                optionStyles.optionRow,
                isSelected && optionStyles.optionRowSelected,
              ]}
              onPress={() => onNetworkOptionPress(network)}
            >
              <View style={optionStyles.optionContent}>
                <Avatar
                  variant={AvatarVariant.Network}
                  size={AvatarSize.Xs}
                  name={network.name}
                  imageSource={network.imageSource}
                />
                <Text variant={TextVariant.BodyMD}>{network.name}</Text>
              </View>
              {isSelected && <Icon name={IconName.Check} size={IconSize.Md} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </BottomSheet>
  );
};

export { TrendingTokenNetworkBottomSheet };
