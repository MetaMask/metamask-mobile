import React, { useRef, useState, useCallback, useEffect } from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import HeaderCenter from '../../../../../component-library/components-temp/HeaderCenter';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import {
  AvatarSize,
  AvatarVariant,
} from '../../../../../component-library/components/Avatars/Avatar';
import Cell, {
  CellVariant,
} from '../../../../../component-library/components/Cells/Cell';
import { strings } from '../../../../../../locales/i18n';
import { ProcessedNetwork } from '../../../../hooks/useNetworksByNamespace/useNetworksByNamespace';
import { CaipChainId } from '@metamask/utils';
import { TRENDING_NETWORKS_LIST } from '../../utils/trendingNetworksList';

export enum NetworkOption {
  AllNetworks = 'all',
}

export interface TrendingTokenNetworkBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
  onNetworkSelect?: (chainIds: CaipChainId[] | null) => void;
  selectedNetwork?: CaipChainId[] | null;
}

const TrendingTokenNetworkBottomSheet: React.FC<
  TrendingTokenNetworkBottomSheetProps
> = ({
  isVisible,
  onClose,
  onNetworkSelect,
  selectedNetwork: initialSelectedNetwork,
}) => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const networks = TRENDING_NETWORKS_LIST;

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
      paddingBottom: 16,
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
      testID="trending-token-network-bottom-sheet"
    >
      <HeaderCenter
        title={strings('trending.networks')}
        onClose={handleClose}
        closeButtonProps={{ testID: 'close-button' }}
      />
      <ScrollView style={optionStyles.optionsList}>
        <Cell
          variant={CellVariant.Select}
          title={strings('trending.all_networks')}
          isSelected={isAllNetworksSelected}
          onPress={() => onNetworkOptionPress(NetworkOption.AllNetworks)}
          avatarProps={{
            variant: AvatarVariant.Icon,
            name: IconName.Global,
            size: AvatarSize.Sm,
          }}
        >
          {isAllNetworksSelected && (
            <Icon name={IconName.Check} size={IconSize.Md} />
          )}
        </Cell>
        {networks.map((network) => {
          const isSelected = isNetworkSelected(network);
          return (
            <Cell
              testID={`network-select-${network.caipChainId}`}
              key={network.caipChainId}
              variant={CellVariant.Select}
              title={network.name}
              isSelected={isSelected}
              onPress={() => onNetworkOptionPress(network)}
              avatarProps={{
                variant: AvatarVariant.Network,
                name: network.name,
                imageSource: network.imageSource,
                size: AvatarSize.Sm,
              }}
            >
              {isSelected && <Icon name={IconName.Check} size={IconSize.Md} />}
            </Cell>
          );
        })}
      </ScrollView>
    </BottomSheet>
  );
};

export { TrendingTokenNetworkBottomSheet };
