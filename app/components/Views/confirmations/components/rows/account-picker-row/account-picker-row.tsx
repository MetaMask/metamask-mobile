import React, { useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, Modal, TextInput, TouchableOpacity } from 'react-native';

import {
  BottomSheet,
  BottomSheetHeader,
  BottomSheetRef,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  KeyValueSelect,
  KeyValueSelectVariant,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

import Avatar, {
  AvatarSize,
  AvatarVariant,
} from '../../../../../../component-library/components/Avatars/Avatar';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../../component-library/components/Icons/Icon';
import { strings } from '../../../../../../../locales/i18n';

export interface SubAccountBase {
  id: string;
  name: string;
}

export interface AccountPickerTestIDs {
  ROW: string;
  SHEET: string;
  SEARCH_INPUT: string;
  ACCOUNT_ITEM: string;
}

export interface AccountPickerRowContentProps<T extends SubAccountBase> {
  subAccounts: T[];
  selectedSubAccount: T | null;
  onSelect: (id: string) => void;
  formatBalance: (account: T) => string;
  title: string;
  searchPlaceholder: string;
  testIDs: AccountPickerTestIDs;
}

export function AccountPickerRowContent<T extends SubAccountBase>({
  subAccounts,
  selectedSubAccount,
  onSelect,
  formatBalance,
  title,
  searchPlaceholder,
  testIDs,
}: AccountPickerRowContentProps<T>) {
  const tw = useTailwind();
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredAccounts = useMemo(() => {
    if (!searchQuery.trim()) return subAccounts;
    const query = searchQuery.toLowerCase();
    return subAccounts.filter((a) => a.name.toLowerCase().includes(query));
  }, [subAccounts, searchQuery]);

  const handleSelect = useCallback(
    (id: string) => {
      onSelect(id);
      bottomSheetRef.current?.onCloseBottomSheet();
    },
    [onSelect],
  );

  const handleSheetClosed = useCallback(() => {
    setSearchQuery('');
    setIsPickerVisible(false);
  }, []);

  const handleModalRequestClose = useCallback(() => {
    bottomSheetRef.current?.onCloseBottomSheet();
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: T }) => {
      const isSelected = item.id === selectedSubAccount?.id;
      return (
        <TouchableOpacity
          onPress={() => handleSelect(item.id)}
          style={tw.style(
            'flex-row items-center justify-between py-3.5 px-4',
            isSelected && 'bg-pressed',
          )}
          testID={`${testIDs.ACCOUNT_ITEM}-${item.id}`}
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            gap={3}
            twClassName="shrink"
          >
            <Avatar
              variant={AvatarVariant.Account}
              accountAddress={item.id || '0x0'}
              size={AvatarSize.Md}
            />
            <Text variant={TextVariant.BodyMd}>{item.name}</Text>
          </Box>
          <Text variant={TextVariant.BodyMd}>{formatBalance(item)}</Text>
        </TouchableOpacity>
      );
    },
    [formatBalance, handleSelect, selectedSubAccount?.id, testIDs, tw],
  );

  if (subAccounts.length === 0) {
    return null;
  }

  return (
    <>
      <KeyValueSelect
        testID={testIDs.ROW}
        variant={KeyValueSelectVariant.Summary}
        keyLabel={strings('confirm.label.to')}
        keyTextProps={{
          color: TextColor.TextAlternative,
        }}
        value={selectedSubAccount?.name}
        valueStartAccessory={
          selectedSubAccount ? (
            <Avatar
              variant={AvatarVariant.Account}
              accountAddress={selectedSubAccount.id || '0x0'}
              size={AvatarSize.Sm}
            />
          ) : undefined
        }
        onPress={() => setIsPickerVisible(true)}
        selectButtonProps={{
          placeholder: strings('confirm.label.to'),
        }}
      />
      {isPickerVisible && (
        <Modal
          visible
          animationType="none"
          transparent
          presentationStyle="overFullScreen"
          onRequestClose={handleModalRequestClose}
        >
          <Box twClassName="flex-1">
            <BottomSheet
              testID={testIDs.SHEET}
              ref={bottomSheetRef}
              isFullscreen
              keyboardAvoidingViewEnabled={false}
              onClose={handleSheetClosed}
            >
              <BottomSheetHeader onClose={handleModalRequestClose}>
                {title}
              </BottomSheetHeader>
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                gap={2}
                twClassName="mx-4 mb-2 px-3 py-2.5 rounded-lg border border-muted"
              >
                <Icon
                  name={IconName.Search}
                  size={IconSize.Md}
                  color={IconColor.Alternative}
                />
                <TextInput
                  testID={testIDs.SEARCH_INPUT}
                  style={tw`flex-1 p-0 text-body-md text-default`}
                  placeholder={searchPlaceholder}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </Box>
              <FlatList
                data={filteredAccounts}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                style={tw`flex-1`}
              />
            </BottomSheet>
          </Box>
        </Modal>
      )}
    </>
  );
}
