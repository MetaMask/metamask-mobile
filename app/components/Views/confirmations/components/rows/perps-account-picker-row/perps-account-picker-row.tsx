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
import { TransactionType } from '@metamask/transaction-controller';

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
import { useParams } from '../../../../../../util/navigation/navUtils';
import { useElevatedSurface } from '../../../../../../util/theme/themeUtils';
import { updateTransaction } from '../../../../../../util/transaction-controller';
import { strings } from '../../../../../../../locales/i18n';
import { PerpsAccountPickerSelectorsIDs } from '../../../../../UI/Perps/Perps.testIds';
import { usePerpsSubAccounts } from '../../../../../UI/Perps/hooks';
import type { SubAccountInfo } from '../../../../../UI/Perps/types/subAccount';
import { formatPerpsBalance } from '../../../../../UI/Perps/utils/formatUtils';
import {
  ConfirmationParams,
  PayWithOption,
} from '../../confirm/confirm-component';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { hasTransactionType } from '../../../utils/transaction';
import stylesheet from './perps-account-picker-row.styles';

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

const PerpsAccountPickerRowContent: React.FC = () => {
  const { styles } = useStyles(stylesheet, {});
  const transactionMeta = useTransactionMetadataRequest();
  const { subAccounts, selectedSubAccount, selectSubAccount } =
    usePerpsSubAccounts();
  const [isPickerVisible, setIsPickerVisible] = useState(false);

  const handleAccountSelected = useCallback(
    (address: string) => {
      selectSubAccount(address);

      const transactionId = transactionMeta?.id;
      if (!transactionId) {
        return;
      }

      updateTransaction(
        {
          ...transactionMeta,
          txParams: { ...transactionMeta?.txParams, from: address },
        },
        transactionId,
      );
    },
    [selectSubAccount, transactionMeta],
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
          testID={PerpsAccountPickerSelectorsIDs.ROW}
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
      <PerpsAccountPicker
        visible={isPickerVisible}
        accounts={subAccounts}
        selectedAccountId={selectedSubAccount?.id ?? null}
        onSelect={handleAccountSelected}
        onClose={() => setIsPickerVisible(false)}
      />
    </>
  );
};

export const PerpsAccountPickerRow: React.FC = () => {
  const transactionMeta = useTransactionMetadataRequest();
  const { payWithOption } = useParams<ConfirmationParams>({});

  const isPerpsDeposit =
    payWithOption === PayWithOption.MoneyAccount &&
    hasTransactionType(transactionMeta, [TransactionType.perpsDeposit]);

  if (!isPerpsDeposit) {
    return null;
  }

  return <PerpsAccountPickerRowContent />;
};
