import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { HeaderStandard } from '@metamask/design-system-react-native';
import type { CaipChainId } from '@metamask/utils';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
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
import Routes from '../../../../../constants/navigation/Routes';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../util/navigation/navUtils';
import { useNetworkFilterOptions } from '../../hooks/useNetworkFilterOptions';
import type { ProcessedNetwork } from '../../../../hooks/useNetworksByNamespace/useNetworksByNamespace';
import { ActivityScreenSelectorsIDs } from '../../ActivityScreen.testIds';

enum NetworkOption {
  AllNetworks = 'all',
}

export interface ActivityNetworkFilterSheetParams {
  selectedNetwork?: CaipChainId[] | null;
  onNetworkSelect: (chainIds: CaipChainId[] | null) => void;
}

export const createActivityNetworkFilterNavDetails =
  createNavigationDetails<ActivityNetworkFilterSheetParams>(
    Routes.MODAL.ROOT_MODAL_FLOW,
    Routes.SHEET.ACTIVITY_NETWORK_FILTER,
  );

const styles = StyleSheet.create({
  optionsList: {
    paddingBottom: 16,
  },
});

/**
 * Activity network filter hosted on `ROOT_MODAL_FLOW` so it covers the tab bar
 * when Activity is a tab (money account off). Selection is written back via a
 * non-serializable `onNetworkSelect` callback (OptionsSheet pattern).
 *
 * Reuses the Trending network-sheet list UI; kept as a separate screen so
 * Trending's in-tab sheet is unchanged.
 */
const ActivityNetworkFilterSheet: React.FC = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const { selectedNetwork: initialSelectedNetwork, onNetworkSelect } =
    useParams<ActivityNetworkFilterSheetParams>();
  const networks = useNetworkFilterOptions();

  const [selectedNetwork, setSelectedNetwork] = useState<
    CaipChainId[] | null | NetworkOption
  >(initialSelectedNetwork ?? NetworkOption.AllNetworks);
  // ROOT_MODAL_FLOW uses animation: 'none' — defer overlay presses until open
  // so the chip tap that opened us cannot immediately dismiss the sheet.
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (initialSelectedNetwork !== undefined) {
      setSelectedNetwork(initialSelectedNetwork);
    }
  }, [initialSelectedNetwork]);

  const handleSheetClose = useCallback(() => {
    // Backdrop / swipe dismiss: `shouldNavigateBack` pops the modal route.
  }, []);

  const handleSheetOpen = useCallback(() => {
    setIsReady(true);
  }, []);

  const isAllNetworksSelected =
    selectedNetwork === NetworkOption.AllNetworks || selectedNetwork === null;

  const onNetworkOptionPress = useCallback(
    (network: ProcessedNetwork | NetworkOption.AllNetworks) => {
      const chainIds =
        network === NetworkOption.AllNetworks
          ? null
          : [(network as ProcessedNetwork).caipChainId];

      if (chainIds === null) {
        setSelectedNetwork(NetworkOption.AllNetworks);
      } else {
        setSelectedNetwork(chainIds);
      }

      // OptionsSheet pattern: callback first, then close (goBack).
      onNetworkSelect(chainIds);
      sheetRef.current?.onCloseBottomSheet();
    },
    [onNetworkSelect],
  );

  const handleHeaderClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const isNetworkSelected = (network: ProcessedNetwork) => {
    if (isAllNetworksSelected) {
      return false;
    }
    return (
      Array.isArray(selectedNetwork) &&
      selectedNetwork.includes(network.caipChainId)
    );
  };

  return (
    <BottomSheet
      ref={sheetRef}
      onClose={handleSheetClose}
      onOpen={handleSheetOpen}
      // Overlay/swipe gated by isReady (press-through guard). shouldNavigateBack
      // stays true so select-then-close always pops the modal.
      isInteractable={isReady}
      shouldNavigateBack
      testID={ActivityScreenSelectorsIDs.NETWORK_FILTER_SHEET}
    >
      <HeaderStandard
        title={strings('trending.networks')}
        onClose={handleHeaderClose}
        closeButtonProps={{ testID: 'close-button' }}
      />
      <ScrollView style={styles.optionsList}>
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
          {isAllNetworksSelected ? (
            <Icon name={IconName.Check} size={IconSize.Md} />
          ) : null}
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
              {isSelected ? (
                <Icon name={IconName.Check} size={IconSize.Md} />
              ) : null}
            </Cell>
          );
        })}
      </ScrollView>
    </BottomSheet>
  );
};

export default ActivityNetworkFilterSheet;
