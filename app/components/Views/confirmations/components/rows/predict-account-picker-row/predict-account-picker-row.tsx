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
import { formatCurrencyValue } from '../../../../../UI/Predict/utils/format';
import { PredictAccountPickerSelectorsIDs } from '../../../ConfirmationView.testIds';
import {
  usePredictSubAccounts,
  type PredictSubAccountInfo,
} from '../../../hooks/transactions/usePredictSubAccounts';
import {
  ConfirmationParams,
  PayWithOption,
} from '../../confirm/confirm-component';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { hasTransactionType } from '../../../utils/transaction';
import { replaceAccountInNestedTransactions } from '../../../utils/transaction-pay';
import stylesheet from './predict-account-picker-row.styles';

const formatPredictBalance = (balance: string): string => {
  const num = parseFloat(balance);
  if (isNaN(num)) return '$0.00';
  return formatCurrencyValue(num) ?? '$0.00';
};

const PredictAccountPickerRowContent: React.FC = () => {
  const { styles } = useStyles(stylesheet, {});
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const surfaceClass = useElevatedSurface();
  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const transactionMeta = useTransactionMetadataRequest();
  const { subAccounts, selectedSubAccount } = usePredictSubAccounts();

  const filteredAccounts = useMemo(() => {
    if (!searchQuery.trim()) return subAccounts;
    const query = searchQuery.toLowerCase();
    return subAccounts.filter((a) => a.name.toLowerCase().includes(query));
  }, [subAccounts, searchQuery]);

  const handleSelect = useCallback(
    (id: string) => {
      const transactionId = transactionMeta?.id;
      if (!transactionId) {
        bottomSheetRef.current?.onCloseBottomSheet();
        return;
      }

      const oldWallet = selectedSubAccount?.walletAddress;
      const newAccount = subAccounts.find((a) => a.id === id);
      const newWallet = newAccount?.walletAddress;

      updateTransaction(
        {
          ...transactionMeta,
          txParams: { ...transactionMeta?.txParams, from: id, to: id },
        },
        transactionId,
      );

      if (oldWallet && newWallet && oldWallet !== newWallet) {
        replaceAccountInNestedTransactions({
          transactionId,
          nestedTransactions: transactionMeta?.nestedTransactions,
          oldAddress: oldWallet,
          newAddress: newWallet,
        });
      }

      bottomSheetRef.current?.onCloseBottomSheet();
    },
    [transactionMeta, selectedSubAccount, subAccounts],
  );

  const handleSheetClosed = useCallback(() => {
    setSearchQuery('');
    setIsPickerVisible(false);
  }, []);

  const handleModalRequestClose = useCallback(() => {
    bottomSheetRef.current?.onCloseBottomSheet();
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: PredictSubAccountInfo }) => {
      const isSelected = item.id === selectedSubAccount?.id;
      return (
        <TouchableOpacity
          onPress={() => handleSelect(item.id)}
          style={[styles.accountItem, isSelected && styles.accountItemSelected]}
          testID={`${PredictAccountPickerSelectorsIDs.ACCOUNT_ITEM}-${item.id}`}
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
            {formatPredictBalance(item.balance)}
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
          testID={PredictAccountPickerSelectorsIDs.ROW}
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
              testID={PredictAccountPickerSelectorsIDs.SHEET}
              ref={bottomSheetRef}
              isFullscreen
              keyboardAvoidingViewEnabled={false}
              onClose={handleSheetClosed}
              twClassName={surfaceClass}
            >
              <HeaderStandard
                title={strings('predict.select_predict_account')}
                onClose={handleModalRequestClose}
              />
              <View style={styles.searchContainer}>
                <Icon
                  name={IconName.Search}
                  size={IconSize.Md}
                  color={IconColor.Alternative}
                />
                <TextInput
                  testID={PredictAccountPickerSelectorsIDs.SEARCH_INPUT}
                  style={styles.searchInput}
                  placeholder={strings('predict.search_account')}
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

export const PredictAccountPickerRow: React.FC = () => {
  const transactionMeta = useTransactionMetadataRequest();
  const { payWithOption } = useParams<ConfirmationParams>({});

  const isPredictDeposit =
    payWithOption === PayWithOption.MoneyAccount &&
    hasTransactionType(transactionMeta, [TransactionType.predictDeposit]);

  if (!isPredictDeposit) {
    return null;
  }

  return <PredictAccountPickerRowContent />;
};

const t = {
  batchId: '0x730da19bab5c451ea7092131c02cb519',
  chainId: '0x89',
  id: 'cbb17670-6412-11f1-846e-459929faa100',
  isGasFeeSponsored: false,
  isFirstTimeInteraction: true,
  isInternal: true,
  nestedTransactions: [
    {
      to: '0xC011a7E12a19f7B1f670d46F03B03f3342E82DFB',
      data: '0xa9059cbb000000000000000000000000e9331d16c86102dcf4d8084f0b7dc6199039b7240000000000000000000000000000000000000000000000000000000000000000',
      type: 'predictDeposit',
    },
  ],
  networkClientId: 'polygon-mainnet',
  origin: 'metamask',
  status: 'unapproved',
  time: 1781016731480,
  txParams: {
    from: '0x5ab02a4b30766cc58c07138180ee46e900a820b1',
    authorizationList: [
      { address: '0x63c0c19a282a1B52b07dD5a65b58948A07DAE32B' },
    ],
    data: '0xe9ae5c53010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000140000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000020000000000000000000000000c011a7e12a19f7b1f670d46f03b03f3342e82dfb000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000044a9059cbb000000000000000000000000e9331d16c86102dcf4d8084f0b7dc6199039b724000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
    gas: '0x1bde3',
    to: '0x178239802520a9c99dcbd791f81326b70298d629',
    value: '0x0',
    maxFeePerGas: '0x6d5ffc6192',
    maxPriorityFeePerGas: '0x1d5c254d00',
    type: '0x4',
  },
  type: 'batch',
  userEditedGasLimit: false,
  verifiedOnBlockchain: false,
  gasFeeEstimates: {
    type: 'fee-market',
    low: { maxFeePerGas: '0x54758ccecc', maxPriorityFeePerGas: '0x19d358e200' },
    medium: {
      maxFeePerGas: '0x6c6edfd387',
      maxPriorityFeePerGas: '0x1d4719ba40',
    },
    high: {
      maxFeePerGas: '0x8156f9ffc2',
      maxPriorityFeePerGas: '0x1da9a1ba00',
    },
  },
  gasFeeEstimatesLoaded: true,
  batchTransactions: [],
  batchTransactionsOptions: {},
  metamaskPay: {
    bridgeFeeFiat: '0',
    chainId: '0x8f',
    networkFeeFiat: '0',
    targetFiat: '0',
    tokenAddress: '0xaca92e438df0b2401ff60da7e4337b687a2435da',
    totalFiat: '0',
  },
  gasFeeTokens: [],
  gasUsed: '0x124b7',
  simulationData: { callTraceErrors: [], tokenBalanceChanges: [] },
};
