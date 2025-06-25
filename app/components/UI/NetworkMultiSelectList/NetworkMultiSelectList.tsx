// Third party dependencies.
import React, { useCallback, useMemo, useRef } from 'react';
import { ImageSourcePropType, View } from 'react-native';
import { FlashList, ListRenderItem } from '@shopify/flash-list';
import { parseCaipChainId } from '@metamask/utils';
import { toHex } from '@metamask/controller-utils';

// External dependencies.
import { useStyles } from '../../../component-library/hooks';
import {
  AvatarSize,
  AvatarVariant,
} from '../../../component-library/components/Avatars/Avatar';
import { IconName } from '../../../component-library/components/Icons/Icon';
import Cell, {
  CellVariant,
} from '../../../component-library/components/Cells/Cell';
import { isTestNet } from '../../../util/networks';

// Internal dependencies.
import {
  NetworkConnectMultiSelectorProps,
  Network,
  NetworkListItem,
  AdditionalNetworkSection,
  NetworkListItemType,
} from './NetworkMultiSelectList.types.ts';
import styleSheet from './NetworkMultiSelectList.styles';

const NetworkMultiSelectList = ({
  onSelectNetwork,
  networks = [],
  isLoading = false,
  selectedChainIds,
  renderRightAccessory,
  isSelectionDisabled,
  isAutoScrollEnabled = true,
  additionalNetworksComponent,
  ...props
}: NetworkConnectMultiSelectorProps) => {
  const networksLengthRef = useRef<number>(0);
  const { styles } = useStyles(styleSheet, {});
  /**
   * Ref for the FlashList component.
   * The type of the ref is not explicitly defined.
   */
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const networkListRef = useRef<any>(null);

  // Combine networks and additional networks with section headers
  const combinedData: NetworkListItem[] = useMemo(() => {
    const data: NetworkListItem[] = [];

    // Add default networks section
    if (networks.length > 0) {
      data.push(...networks);
    }

    // Add additional network section if provided
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
      // Render additional network section
      if (isAdditionalNetworkSection(item)) {
        return <View>{item.component}</View>;
      }

      // Render selectable network items
      const { caipChainId, name, isSelected, imageSource } = item as Network;
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
      {...props}
    />
  );
};

export default NetworkMultiSelectList;
