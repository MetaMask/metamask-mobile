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
import { formatPerpsBalance } from '../../../../../UI/Perps/utils/formatUtils';
import { PerpsAccountPickerSelectorsIDs } from '../../../ConfirmationView.testIds';
import {
  usePerpsSubAccounts,
  type SubAccountInfo,
} from '../../../hooks/transactions/usePerpsSubAccounts';
import {
  ConfirmationParams,
  PayWithOption,
} from '../../confirm/confirm-component';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { hasTransactionType } from '../../../utils/transaction';
import stylesheet from './perps-account-picker-row.styles';

const PerpsAccountPickerRowContent: React.FC = () => {
  const { styles } = useStyles(stylesheet, {});
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const surfaceClass = useElevatedSurface();
  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const transactionMeta = useTransactionMetadataRequest();
  const { subAccounts, selectedSubAccount } = usePerpsSubAccounts();

  const filteredAccounts = useMemo(() => {
    if (!searchQuery.trim()) return subAccounts;
    const query = searchQuery.toLowerCase();
    return subAccounts.filter((a) => a.name.toLowerCase().includes(query));
  }, [subAccounts, searchQuery]);

  const handleSelect = useCallback(
    (id: string) => {
      const transactionId = transactionMeta?.id;
      if (transactionId) {
        updateTransaction(
          {
            ...transactionMeta,
            txParams: { ...transactionMeta?.txParams, from: id },
          },
          transactionId,
        );
      }

      bottomSheetRef.current?.onCloseBottomSheet();
    },
    [transactionMeta],
  );

  const handleSheetClosed = useCallback(() => {
    setSearchQuery('');
    setIsPickerVisible(false);
  }, []);

  const handleModalRequestClose = useCallback(() => {
    bottomSheetRef.current?.onCloseBottomSheet();
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: SubAccountInfo }) => {
      const isSelected = item.id === selectedSubAccount?.id;
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
    [handleSelect, selectedSubAccount?.id, styles],
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
      )}
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
