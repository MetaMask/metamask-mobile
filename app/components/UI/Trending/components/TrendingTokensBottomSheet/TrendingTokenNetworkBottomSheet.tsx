import React, { useRef, useState, useCallback, useEffect } from 'react';
import { HeaderStandard } from '@metamask/design-system-react-native';
import { StyleSheet } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import { strings } from '../../../../../../locales/i18n';
import { ProcessedNetwork } from '../../../../hooks/useNetworksByNamespace/useNetworksByNamespace';
import { CaipChainId } from '@metamask/utils';
import NetworkOptionCells from '../NetworkOptionCells/NetworkOptionCells';

export enum NetworkOption {
  AllNetworks = 'all',
}

export interface TrendingTokenNetworkBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
  onNetworkSelect?: (chainIds: CaipChainId[] | null) => void;
  selectedNetwork?: CaipChainId[] | null;
  /** Networks to display in the bottom sheet */
  networks: ProcessedNetwork[];
  /** When true, the "All networks" option is hidden */
  hideAllNetworks?: boolean;
}

const TrendingTokenNetworkBottomSheet: React.FC<
  TrendingTokenNetworkBottomSheetProps
> = ({
  isVisible,
  onClose,
  onNetworkSelect,
  selectedNetwork: initialSelectedNetwork,
  networks,
  hideAllNetworks = false,
}) => {
  const sheetRef = useRef<BottomSheetRef>(null);

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

  const selectedChainIds = Array.isArray(selectedNetwork)
    ? selectedNetwork
    : null;

  const onNetworkOptionPress = useCallback(
    (chainIds: CaipChainId[] | null) => {
      setSelectedNetwork(chainIds ?? NetworkOption.AllNetworks);
      onNetworkSelect?.(chainIds);
      sheetRef.current?.onCloseBottomSheet(() => {
        onClose();
      });
    },
    [onNetworkSelect, onClose],
  );

  if (!isVisible) return null;

  return (
    <BottomSheet
      shouldNavigateBack={false}
      ref={sheetRef}
      onClose={handleSheetClose}
      testID="trending-token-network-bottom-sheet"
    >
      <HeaderStandard
        title={strings('trending.networks')}
        onClose={handleClose}
        closeButtonProps={{ testID: 'close-button' }}
      />
      <ScrollView style={optionStyles.optionsList}>
        <NetworkOptionCells
          networks={networks}
          allLabel={
            hideAllNetworks ? undefined : strings('trending.all_networks')
          }
          selectedChainIds={selectedChainIds}
          onSelect={onNetworkOptionPress}
        />
      </ScrollView>
    </BottomSheet>
  );
};

export { TrendingTokenNetworkBottomSheet };
