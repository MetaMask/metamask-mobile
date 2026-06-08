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
  TextVariant,
} from '@metamask/design-system-react-native';

import Avatar, {
  AvatarSize,
  AvatarVariant,
} from '../../../../../component-library/components/Avatars/Avatar';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import { useStyles } from '../../../../../component-library/hooks/useStyles';
import { useElevatedSurface } from '../../../../../util/theme/themeUtils';
import { strings } from '../../../../../../locales/i18n';
import type { SubAccountInfo } from '../../types/subAccount';
import { formatPerpsBalance } from '../../utils/formatUtils';
import { PerpsAccountPickerSelectorsIDs } from '../../Perps.testIds';
import stylesheet from './PerpsAccountPicker.styles';

interface PerpsAccountPickerProps {
  visible: boolean;
  accounts: SubAccountInfo[];
  selectedAccountId: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
}

const PerpsAccountPicker: React.FC<PerpsAccountPickerProps> = ({
  visible,
  accounts,
  selectedAccountId,
  onSelect,
  onClose,
}) => {
  const { styles } = useStyles(stylesheet, {});
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const surfaceClass = useElevatedSurface();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredAccounts = useMemo(() => {
    if (!searchQuery.trim()) return accounts;
    const query = searchQuery.toLowerCase();
    return accounts.filter((a) => a.name.toLowerCase().includes(query));
  }, [accounts, searchQuery]);

  const handleSelect = useCallback(
    (id: string) => {
      onSelect(id);
      bottomSheetRef.current?.onCloseBottomSheet();
    },
    [onSelect],
  );

  const handleSheetClosed = useCallback(() => {
    setSearchQuery('');
    onClose();
  }, [onClose]);

  const handleModalRequestClose = useCallback(() => {
    bottomSheetRef.current?.onCloseBottomSheet();
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: SubAccountInfo }) => {
      const isSelected = item.id === selectedAccountId;
      return (
        <TouchableOpacity
          onPress={() => handleSelect(item.id)}
          style={[styles.accountItem, isSelected && styles.accountItemSelected]}
          testID={`${PerpsAccountPickerSelectorsIDs.ACCOUNT_ITEM}-${item.id}`}
        >
          <View style={styles.accountItemLeft}>
            <Avatar
              variant={AvatarVariant.Account}
              accountAddress={item.id || '0x0'}
              size={AvatarSize.Md}
            />
            <Text variant={TextVariant.BodyMd}>{item.name}</Text>
          </View>
          <Text variant={TextVariant.BodyMd}>
            {formatPerpsBalance(item.totalBalance)}
          </Text>
        </TouchableOpacity>
      );
    },
    [handleSelect, selectedAccountId, styles],
  );

  if (!visible) return null;

  return (
    <Modal
      visible
      animationType="none"
      transparent
      presentationStyle="overFullScreen"
      onRequestClose={handleModalRequestClose}
    >
      <View style={styles.modalRoot}>
        <BottomSheet
          testID={PerpsAccountPickerSelectorsIDs.SHEET}
          ref={bottomSheetRef}
          isFullscreen
          keyboardAvoidingViewEnabled={false}
          onClose={handleSheetClosed}
          twClassName={surfaceClass}
        >
          <HeaderStandard
            title={strings('perps.select_perps_account')}
            onClose={handleModalRequestClose}
          />
          <View style={styles.searchContainer}>
            <Icon
              name={IconName.Search}
              size={IconSize.Md}
              color={IconColor.Alternative}
            />
            <TextInput
              testID={PerpsAccountPickerSelectorsIDs.SEARCH_INPUT}
              style={styles.searchInput}
              placeholder={strings('perps.search_account')}
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
  );
};

export default PerpsAccountPicker;
