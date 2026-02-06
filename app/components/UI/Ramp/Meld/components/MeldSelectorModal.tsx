/**
 * Generic BottomSheet selector modal for Meld.
 *
 * Provides a searchable list in a BottomSheet, used for:
 * - Country selection
 * - Fiat currency selection
 * - Crypto currency selection
 * - Payment method selection
 *
 * Follows the same pattern as the existing Ramp selectors
 * (RegionSelectorModal, TokenSelectModal, FiatSelectorModal).
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, ListRenderItem, StyleSheet } from 'react-native';
import Fuse from 'fuse.js';
import {
  Box,
  Text,
  TextVariant,
  BoxFlexDirection,
  BoxAlignItems,
} from '@metamask/design-system-react-native';

import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import ListItemSelect from '../../../../../component-library/components/List/ListItemSelect';

const styles = StyleSheet.create({
  list: { maxHeight: 400 },
});

const MAX_RESULTS = 30;

export interface SelectorItem {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
}

interface MeldSelectorModalProps<T> {
  visible: boolean;
  onClose: () => void;
  title: string;
  items: T[];
  selectedId: string | null;
  onSelect: (item: T) => void;
  /** Extract a SelectorItem from the raw data item */
  toSelectorItem: (item: T) => SelectorItem;
  /** Fuse.js search keys (field paths on SelectorItem) */
  searchKeys?: string[];
  /** Placeholder for the search input */
  searchPlaceholder?: string;
}

function MeldSelectorModal<T>({
  visible,
  onClose,
  title,
  items,
  selectedId,
  onSelect,
  toSelectorItem,
  searchKeys = ['title', 'subtitle', 'id'],
  searchPlaceholder = 'Search...',
}: MeldSelectorModalProps<T>) {
  const sheetRef = useRef<BottomSheetRef>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Map raw items to SelectorItems, keeping reference to original
  const mappedItems = useMemo(
    () => items.map((raw) => ({ raw, selector: toSelectorItem(raw) })),
    [items, toSelectorItem],
  );

  // Fuse search index
  const fuse = useMemo(
    () =>
      new Fuse(mappedItems, {
        keys: searchKeys.map((k) => `selector.${k}`),
        threshold: 0.3,
      }),
    [mappedItems, searchKeys],
  );

  // Filtered results
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return mappedItems;
    return fuse
      .search(searchQuery)
      .map((r) => r.item)
      .slice(0, MAX_RESULTS);
  }, [searchQuery, fuse, mappedItems]);

  const handleSelect = useCallback(
    (item: { raw: T; selector: SelectorItem }) => {
      onSelect(item.raw);
      sheetRef.current?.onCloseBottomSheet();
    },
    [onSelect],
  );

  const handleClose = useCallback(() => {
    setSearchQuery('');
    onClose();
  }, [onClose]);

  const renderItem: ListRenderItem<{
    raw: T;
    selector: SelectorItem;
  }> = useCallback(
    ({ item }) => (
      <ListItemSelect
        isSelected={item.selector.id === selectedId}
        onPress={() => handleSelect(item)}
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="py-1"
        >
          <Box twClassName="flex-1">
            <Text variant={TextVariant.BodyLgMedium}>
              {item.selector.title}
            </Text>
            {item.selector.subtitle ? (
              <Text variant={TextVariant.BodySm} twClassName="text-muted">
                {item.selector.subtitle}
              </Text>
            ) : null}
          </Box>
        </Box>
      </ListItemSelect>
    ),
    [selectedId, handleSelect],
  );

  if (!visible) return null;

  return (
    <BottomSheet
      ref={sheetRef}
      onClose={handleClose}
      shouldNavigateBack={false}
    >
      {/* Header */}
      <Box twClassName="px-4 pt-2 pb-3">
        <Text variant={TextVariant.HeadingSm}>{title}</Text>
      </Box>

      {/* Search */}
      {items.length > 5 && (
        <Box twClassName="px-4 pb-3">
          <Box twClassName="bg-muted rounded-lg px-3 py-2">
            <Text
              variant={TextVariant.BodyMd}
              twClassName={searchQuery ? '' : 'text-muted'}
              onPress={() => {
                // Focus handled by parent
              }}
            >
              {searchQuery || searchPlaceholder}
            </Text>
          </Box>
        </Box>
      )}

      {/* List */}
      <FlatList
        data={filteredItems}
        renderItem={renderItem}
        keyExtractor={(item) => item.selector.id}
        style={styles.list}
        keyboardShouldPersistTaps="handled"
      />
    </BottomSheet>
  );
}

export default MeldSelectorModal;
