import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Modal,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  BottomSheet,
  BottomSheetRef,
  HeaderStandard,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

import Avatar, {
  AvatarSize,
  AvatarVariant,
} from '../../../../../../component-library/components/Avatars/Avatar';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../../component-library/components/Icons/Icon';
import { useStyles } from '../../../../../../component-library/hooks/useStyles';
import { useElevatedSurface } from '../../../../../../util/theme/themeUtils';
import { strings } from '../../../../../../../locales/i18n';
import stylesheet from './account-picker-row.styles';

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
  const { styles } = useStyles(stylesheet, {});
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const surfaceClass = useElevatedSurface();
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
          style={[styles.accountItem, isSelected && styles.accountItemSelected]}
          testID={`${testIDs.ACCOUNT_ITEM}-${item.id}`}
        >
          <View style={styles.accountItemLeft}>
            <Avatar
              variant={AvatarVariant.Account}
              accountAddress={item.id || '0x0'}
              size={AvatarSize.Md}
            />
            <Text variant={TextVariant.BodyMd}>{item.name}</Text>
          </View>
          <Text variant={TextVariant.BodyMd}>{formatBalance(item)}</Text>
        </TouchableOpacity>
      );
    },
    [handleSelect, selectedSubAccount?.id, styles, testIDs, formatBalance],
  );

  if (subAccounts.length === 0) {
    return null;
  }

  return (
    <>
      <View style={styles.rowContainer}>
        <TouchableOpacity
          onPress={() => setIsPickerVisible(true)}
          style={styles.row}
          testID={testIDs.ROW}
        >
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {strings('confirm.label.to')}
          </Text>
          <View style={styles.valueContainer}>
            {selectedSubAccount ? (
              <>
                <Avatar
                  variant={AvatarVariant.Account}
                  accountAddress={selectedSubAccount.id || '0x0'}
                  size={AvatarSize.Sm}
                />
                <Text
                  variant={TextVariant.BodyMd}
                  numberOfLines={1}
                  ellipsizeMode="middle"
                  twClassName="shrink"
                >
                  {selectedSubAccount.name}
                </Text>
              </>
            ) : (
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextAlternative}
              >
                {strings('confirm.label.to')}
              </Text>
            )}
            <Icon
              name={IconName.ArrowDown}
              size={IconSize.Sm}
              color={IconColor.Alternative}
            />
          </View>
        </TouchableOpacity>
      </View>
      {isPickerVisible && (
        <Modal
          visible
          animationType="none"
          transparent
          presentationStyle="overFullScreen"
          onRequestClose={handleModalRequestClose}
        >
          <View style={styles.modalRoot}>
            <BottomSheet
              testID={testIDs.SHEET}
              ref={bottomSheetRef}
              isFullscreen
              keyboardAvoidingViewEnabled={false}
              onClose={handleSheetClosed}
              twClassName={surfaceClass}
            >
              <HeaderStandard title={title} onClose={handleModalRequestClose} />
              <View style={styles.searchContainer}>
                <Icon
                  name={IconName.Search}
                  size={IconSize.Md}
                  color={IconColor.Alternative}
                />
                <TextInput
                  testID={testIDs.SEARCH_INPUT}
                  style={styles.searchInput}
                  placeholder={searchPlaceholder}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              <FlatList
                data={filteredAccounts}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                style={styles.list}
              />
            </BottomSheet>
          </View>
        </Modal>
      )}
    </>
  );
}
