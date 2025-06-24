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
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import { isTestNet } from '../../../util/networks';

// Internal dependencies.
import {
  NetworkConnectMultiSelectorProps,
  Network,
  NetworkListItem,
  SectionHeader,
} from './NetworkMultiSelectList.types.ts';
import styleSheet from './NetworkMultiSelectList.styles';

const NetworkMultiSelectList = ({
  onSelectNetwork,
  networks = [],
  additionalNetworks = [],
  isLoading = false,
  selectedChainIds,
  renderRightAccessory,
  isSelectionDisabled,
  isAutoScrollEnabled = true,
  showSectionHeaders = true,
  showDefaultNetworksHeader = false,
  defaultNetworksTitle = 'Default Networks',
  additionalNetworksTitle = 'Additional Networks',
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
      if (showSectionHeaders && showDefaultNetworksHeader) {
        data.push({
          id: 'default-header',
          title: defaultNetworksTitle,
          type: 'header',
        } as SectionHeader);
      }
      data.push(...networks);
    }

    // Add additional networks section
    if (additionalNetworks.length > 0) {
      if (showSectionHeaders) {
        data.push({
          id: 'additional-header',
          title: additionalNetworksTitle,
          type: 'header',
        } as SectionHeader);
      }
      data.push(...additionalNetworks);
    }

    return data;
  }, [
    networks,
    additionalNetworks,
    showSectionHeaders,
    showDefaultNetworksHeader,
    defaultNetworksTitle,
    additionalNetworksTitle,
  ]);

  const getKeyExtractor = (item: NetworkListItem) => {
    if ('type' in item && item.type === 'header') {
      return item.id;
    }
    return (item as Network).id;
  };

  const isHeaderItem = (item: NetworkListItem): item is SectionHeader =>
    'type' in item && item.type === 'header';

  const renderNetworkItem: ListRenderItem<NetworkListItem> = useCallback(
    ({ item }) => {
      // Render section header
      if (isHeaderItem(item)) {
        return (
          <View style={styles.sectionHeader}>
            <Text variant={TextVariant.BodyMDBold}>{item.title}</Text>
          </View>
        );
      }

      // Render network item
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
      styles.sectionHeader,
    ],
  );

  const onContentSizeChanged = useCallback(() => {
    if (!combinedData.length || !isAutoScrollEnabled) return;
    if (networksLengthRef.current !== combinedData.length) {
      const selectedNetwork = combinedData.find(
        (item) => !isHeaderItem(item) && (item as Network).isSelected,
      ) as Network | undefined;

      if (selectedNetwork) {
        networkListRef?.current?.scrollToOffset({
          offset: selectedNetwork.yOffset ?? 0,
          animated: false,
        });
      }
      networksLengthRef.current = combinedData.length;
    }
  }, [combinedData, isAutoScrollEnabled]);

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
