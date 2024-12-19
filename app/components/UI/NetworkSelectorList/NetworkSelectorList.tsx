// Third party dependencies.
import React, { useCallback, useRef } from 'react';
import { ListRenderItem, ImageSourcePropType, View } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';

// External dependencies.
import { useStyles } from '../../../component-library/hooks';
import {
  AvatarSize,
  AvatarVariant,
} from '../../../component-library/components/Avatars/Avatar';
import Cell, {
  CellVariant,
} from '../../../component-library/components/Cells/Cell';

// Internal dependencies.
import {
  NetworkConnectMultiSelectorProps,
  Network,
} from './NetworkSelectorList.types';
import styleSheet from './NetworkSelectorList.styles';

const NetworkSelectorList = ({
  onSelectNetwork,
  networks = [],
  isLoading = false,
  selectedChainIds,
  isMultiSelect = true,
  renderRightAccessory,
  isSelectionDisabled,
  isAutoScrollEnabled = true,
  ...props
}: NetworkConnectMultiSelectorProps) => {
  const networksLengthRef = useRef<number>(0);
  const { styles } = useStyles(styleSheet, {});
  /**
   * Ref for the FlatList component.
   * The type of the ref is not explicitly defined.
   */
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const networkListRef = useRef<any>(null);

  const getKeyExtractor = ({ id }: Network) => id;

  const renderNetworkItem: ListRenderItem<Network> = useCallback(
    ({ item: { id, name, isSelected, imageSource } }) => {
      const isDisabled = isLoading || isSelectionDisabled;
      const cellVariant = isMultiSelect
        ? CellVariant.MultiSelect
        : CellVariant.Select;
      let isSelectedNetwork = isSelected;
      if (selectedChainIds) {
        isSelectedNetwork = selectedChainIds.includes(id);
      }
      return (
        <View
          testID={`${name}-${isSelectedNetwork ? 'selected' : 'not-selected'}`}
        >
          <Cell
            variant={cellVariant}
            isSelected={isSelectedNetwork}
            title={name}
            onPress={() => onSelectNetwork?.(id, isSelectedNetwork)}
            avatarProps={{
              variant: AvatarVariant.Network,
              name,
              imageSource: imageSource as ImageSourcePropType,
              size: AvatarSize.Sm,
            }}
            disabled={isDisabled}
          >
            {renderRightAccessory?.(id, name)}
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
      isMultiSelect,
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
    <FlatList
      style={styles.networkList}
      ref={networkListRef}
      onContentSizeChange={onContentSizeChanged}
      data={networks}
      keyExtractor={getKeyExtractor}
      renderItem={renderNetworkItem}
      initialNumToRender={999}
      {...props}
    />
  );
};

export default NetworkSelectorList;
