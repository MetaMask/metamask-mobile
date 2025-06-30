// Third party dependencies.
import React, { useCallback, useMemo, useRef } from 'react';
import { ImageSourcePropType, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList, ListRenderItem } from '@shopify/flash-list';
import { parseCaipChainId } from '@metamask/utils';
import { toHex } from '@metamask/controller-utils';
import { CHAIN_IDS } from '@metamask/transaction-controller';

// Constants for main chains that should not show edit option
const MAIN_CHAIN_IDS = new Set([
  CHAIN_IDS.MAINNET,
  CHAIN_IDS.LINEA_MAINNET,
] as string[]);

// External dependencies.
import { useStyles } from '../../../component-library/hooks/index.ts';
import {
  AvatarSize,
  AvatarVariant,
} from '../../../component-library/components/Avatars/Avatar/index.ts';
import { IconName } from '../../../component-library/components/Icons/Icon/index.ts';
import Cell, {
  CellVariant,
} from '../../../component-library/components/Cells/Cell/index.ts';
import { isTestNet } from '../../../util/networks/index.js';
import Device from '../../../util/device/index.js';

// Internal dependencies.
import {
  NetworkMultiSelectorListProps,
  Network,
  NetworkListItem,
  AdditionalNetworkSection,
  NetworkListItemType,
} from './NetworkMultiSelectorList.types.ts';
import styleSheet from './NetworkMultiSelectorList.styles';

const NetworkMultiSelectList = ({
  onSelectNetwork,
  networks = [],
  isLoading = false,
  selectedChainIds,
  renderRightAccessory,
  isSelectionDisabled,
  isAutoScrollEnabled = true,
  additionalNetworksComponent,
  openModal,
  ...props
}: NetworkMultiSelectorListProps) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const networkListRef = useRef<any>(null);
  const networksLengthRef = useRef<number>(0);
  const safeAreaInsets = useSafeAreaInsets();

  const { styles } = useStyles(styleSheet, {});

  const combinedData: NetworkListItem[] = useMemo(() => {
    const data: NetworkListItem[] = [];

    if (networks.length > 0) {
      data.push(...networks);
    }

    if (additionalNetworksComponent) {
      data.push({
        id: 'additional-network-section',
        type: NetworkListItemType.AdditionalNetworkSection,
        component: additionalNetworksComponent,
      } as AdditionalNetworkSection);
    }

    return data;
  }, [networks, additionalNetworksComponent]);

  const getKeyExtractor = (item: NetworkListItem) => {
    if (
      'type' in item &&
      item.type === NetworkListItemType.AdditionalNetworkSection
    ) {
      return item.id;
    }
    return (item as Network).id;
  };

  const isAdditionalNetworkSection = (
    item: NetworkListItem,
  ): item is AdditionalNetworkSection =>
    'type' in item &&
    item.type === NetworkListItemType.AdditionalNetworkSection;

  const renderNetworkItem: ListRenderItem<NetworkListItem> = useCallback(
    ({ item }) => {
      if (isAdditionalNetworkSection(item)) {
        return <View>{item.component}</View>;
      }

      const {
        caipChainId,
        name,
        isSelected,
        imageSource,
        networkTypeOrRpcUrl,
      } = item as Network;
      const isDisabled = isLoading || isSelectionDisabled;

      let isSelectedNetwork = isSelected;
      if (selectedChainIds) {
        isSelectedNetwork = selectedChainIds.includes(caipChainId);
      }
      const parsedCaipChainId = parseCaipChainId(caipChainId);
      const namespace = parsedCaipChainId.namespace;

      const chainId =
        namespace !== 'solana' ? toHex(parsedCaipChainId.reference) : '';
      if (chainId && isTestNet(chainId)) return null;

      return (
        <View
          testID={`${name}-${isSelectedNetwork ? 'selected' : 'not-selected'}`}
        >
          <Cell
            variant={CellVariant.MultiSelectWithMenu}
            isSelected={isSelectedNetwork}
            title={name}
            onPress={() => onSelectNetwork?.(caipChainId, isSelectedNetwork)}
            avatarProps={{
              variant: AvatarVariant.Network,
              name,
              imageSource: imageSource as ImageSourcePropType,
              size: AvatarSize.Sm,
            }}
            buttonIcon={IconName.MoreVertical}
            disabled={isDisabled}
            showButtonIcon={!!networkTypeOrRpcUrl}
            buttonProps={{
              onButtonClick: () => {
                const rawChainId = parseCaipChainId(caipChainId).reference;
                const currentChainId = toHex(rawChainId);
                const isMainChain = MAIN_CHAIN_IDS.has(currentChainId);
                openModal({
                  isVisible: true,
                  caipChainId,
                  displayEdit: !isMainChain,
                  networkTypeOrRpcUrl: networkTypeOrRpcUrl || '',
                  isReadOnly: false,
                });
              },
            }}
          >
            {renderRightAccessory?.(caipChainId, name)}
          </Cell>
        </View>
      );
    },
    [
      isLoading,
      selectedChainIds,
      renderRightAccessory,
      isSelectionDisabled,
      onSelectNetwork,
      openModal,
    ],
  );

  const onContentSizeChanged = useCallback(() => {
    if (!networks.length || !isAutoScrollEnabled) return;
    if (networksLengthRef.current !== networks.length) {
      const selectedNetwork = networks.find(({ isSelected }) => isSelected);
      networkListRef?.current?.scrollToOffset({
        offset: selectedNetwork?.yOffset ?? 0,
        animated: false,
      });
      networksLengthRef.current = networks.length;
    }
  }, [networks, isAutoScrollEnabled]);

  return (
    <FlashList
      style={styles.networkList}
      ref={networkListRef}
      onContentSizeChange={onContentSizeChanged}
      data={combinedData}
      keyExtractor={getKeyExtractor}
      renderItem={renderNetworkItem}
      estimatedItemSize={56}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        paddingBottom: safeAreaInsets.bottom + Device.getDeviceHeight() * 0.05,
      }}
      {...props}
    />
  );
};

export default NetworkMultiSelectList;
