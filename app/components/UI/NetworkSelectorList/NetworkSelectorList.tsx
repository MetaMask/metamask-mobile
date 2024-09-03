// Third party dependencies.
import React, { useCallback, useRef } from 'react';
import { ListRenderItem, ImageSourcePropType } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import Cell, {
  CellVariant,
} from '../../../component-library/components/Cells/Cell';

// External dependencies.
import { useStyles } from '../../../component-library/hooks';

// Internal dependencies.
import {
  NetworkConnectMultiSelectorProps,
  Network,
} from './NetworkSelectorList.types';
import styleSheet from './NetworkSelectorList.styles';
import {
  AvatarSize,
  AvatarVariant,
} from '../../../component-library/components/Avatars/Avatar';

const NetworkSelectorList = ({
  onSelectNetwork,
  networks = [],
  isLoading = false,
  selectedNetworkIds,
  isMultiSelect = true,
  renderRightAccessory,
  isSelectionDisabled,
  isAutoScrollEnabled = true,
  ...props
}: NetworkConnectMultiSelectorProps) => {
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const networkListRef = useRef<any>(null);
  const networksLengthRef = useRef<number>(0);
  const { styles } = useStyles(styleSheet, {});

  const getKeyExtractor = ({ id }: Network) => id;

  const renderNetworkItem: ListRenderItem<Network> = useCallback(
    ({ item: { id, name, isSelected, imageSource } }) => {
      // console.log('networkItem: ', item);
      const isDisabled = isLoading || isSelectionDisabled;
      const cellVariant = isMultiSelect
        ? CellVariant.MultiSelect
        : CellVariant.Select;
      let isSelectedNetwork = isSelected;
      if (selectedNetworkIds) {
        isSelectedNetwork = selectedNetworkIds.includes(id);
      }

      return (
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
          style={styles.networkItemContainer}
        >
          {renderRightAccessory?.(id, name)}
        </Cell>
      );
    },
    [
      isLoading,
      selectedNetworkIds,
      renderRightAccessory,
      isSelectionDisabled,
      onSelectNetwork,
      styles,
      isMultiSelect,
    ],
  );

  const onContentSizeChanged = useCallback(() => {
    if (!networks.length || !isAutoScrollEnabled) return;
    if (networksLengthRef.current !== networks.length) {
      const selectedNetwork = networks.find(({ isSelected }) => isSelected);
      networkListRef?.current?.scrollToOffset({
        offset: selectedNetwork?.yOffset,
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
