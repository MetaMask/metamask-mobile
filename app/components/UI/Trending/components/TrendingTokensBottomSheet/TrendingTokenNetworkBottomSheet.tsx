import React, { useRef, useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../../../../../util/theme';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import Avatar, {
  AvatarSize,
  AvatarVariant,
} from '../../../../../component-library/components/Avatars/Avatar';
import { strings } from '../../../../../../locales/i18n';
import { ProcessedNetwork } from '../../../../hooks/useNetworksByNamespace/useNetworksByNamespace';
import { CaipChainId } from '@metamask/utils';
import { usePopularNetworks } from '../../hooks/usePopularNetworks/usePopularNetworks';

export enum NetworkOption {
  AllNetworks = 'all',
}

export interface TrendingTokenNetworkBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
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

const TrendingTokenNetworkBottomSheet: React.FC<
  TrendingTokenNetworkBottomSheetProps
> = ({
  isVisible,
  onClose,
  onNetworkSelect,
  selectedNetwork: initialSelectedNetwork,
}) => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const { colors } = useTheme();
  const networks = usePopularNetworks();

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

  // Open bottom sheet when isVisible becomes true
  useEffect(() => {
    if (isVisible) {
      sheetRef.current?.onOpenBottomSheet();
    }
  }, [isVisible]);

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
    sheetRef.current?.onCloseBottomSheet(() => {
      onClose();
    });
  }, [onClose]);

  const handleSheetClose = useCallback(() => {
    onClose();
  }, [onClose]);

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
      sheetRef.current?.onCloseBottomSheet(() => {
        onClose();
      });
    },
    [onNetworkSelect, onClose],
  );

  const isNetworkSelected = (network: ProcessedNetwork) => {
    if (isAllNetworksSelected) return false;
    return (
      Array.isArray(selectedNetwork) &&
      selectedNetwork.includes(network.caipChainId)
    );
  };

  if (!isVisible) return null;

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
