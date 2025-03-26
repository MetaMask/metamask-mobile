import { NavigationProp, ParamListBase } from '@react-navigation/native';
import React, { useState } from 'react';
import {
  StyleSheet,
  Image,
  TouchableHighlight,
  ImageStyle,
  TextStyle,
} from 'react-native';
import type { ThemeColors, ThemeTypography } from '@metamask/design-tokens';
import { capitalize } from 'lodash';
import { Transaction, TransactionType } from '@metamask/keyring-api';
import { useTheme } from '../../../util/theme';
import { strings } from '../../../../locales/i18n';
import ListItem from '../../Base/ListItem';
import StatusText from '../../Base/StatusText';
import { fontStyles } from '../../../styles/common';
import { getTransactionIcon } from '../../../util/transaction-icons';
import { toDateFormat } from '../../../util/date';
import { useMultichainTransactionDisplay } from '../../hooks/useMultichainTransactionDisplay';
import MultichainTransactionDetailsModal from '../MultichainTransactionDetailsModal';

const createStyles = (colors: ThemeColors, typography: ThemeTypography) =>
  StyleSheet.create({
    row: {
      backgroundColor: colors.background.default,
      flex: 1,
      borderBottomWidth: 1,
    },
    actionContainerStyle: {
      height: 25,
      padding: 0,
    },
    speedupActionContainerStyle: {
      marginRight: 10,
    },
    actionStyle: {
      fontSize: 10,
      padding: 0,
      paddingHorizontal: 10,
    },
    icon: {
      width: 32,
      height: 32,
    } as ImageStyle,
    summaryWrapper: {
      padding: 15,
    },
    fromDeviceText: {
      color: colors.text.alternative,
      fontSize: 14,
      marginBottom: 10,
      ...fontStyles.normal,
    },
    importText: {
      color: colors.text.alternative,
      fontSize: 14,
      ...fontStyles.bold,
      alignContent: 'center',
    },
    importRowBody: {
      alignItems: 'center',
      backgroundColor: colors.background.alternative,
      paddingTop: 10,
    },
    listItemDate: {
      marginBottom: 10,
      paddingBottom: 0,
    },
    listItemContent: {
      alignItems: 'flex-start',
      marginTop: 0,
      paddingTop: 0,
    },
    listItemTitle: {
      ...typography.sBodyLGMedium,
      marginTop: 0,
    },
    listItemStatus: {
      ...(typography.sBodyMDBold as TextStyle),
    },
    listItemFiatAmount: {
      ...(typography.sBodyLGMedium as TextStyle),
      marginTop: 0,
    },
    listItemAmount: {
      ...(typography.sBodyMD as TextStyle),
      color: colors.text.alternative,
    },
    itemContainer: {
      padding: 0,
      borderBottomWidth: 1,
    },
    typeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    typeIcon: {
      marginRight: 8,
    },
    typeText: {
      fontSize: 16,
      fontWeight: '600',
    },
    statusText: {
      fontSize: 12,
    },
    addressText: {
      fontSize: 14,
    },
    amountText: {
      fontSize: 16,
      fontWeight: '600',
    },
    dateText: {
      fontSize: 12,
    },
    feeContainer: {
      marginTop: 4,
    },
    feeText: {
      fontSize: 12,
    },
  });

const MultichainTransactionListItem = ({
  transaction,
  selectedAddress,
  navigation,
}: {
  transaction: Transaction;
  selectedAddress: string;
  navigation: NavigationProp<ParamListBase>;
}) => {
  const { colors, typography } = useTheme();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const { type, status, to, from, asset } = useMultichainTransactionDisplay({
    transaction,
    userAddress: selectedAddress,
  });

  let title = capitalize(type);

  if (type === TransactionType.Swap) {
    const fromAsset = from?.asset;
    const toAsset = to?.asset;

    const fromUnit = fromAsset?.fungible ? fromAsset.unit : '';
    const toUnit = toAsset?.fungible ? toAsset.unit : '';

    title = `${strings('swap')} ${fromUnit} ${strings('to')} ${toUnit}`;
  }

  const styles = createStyles(colors, typography);

  const handlePress = () => {
    setIsModalVisible(true);
  };

  const renderTxElementIcon = (transactionType: string) => {
    const isFailedTransaction = status === 'failed';
    const icon = getTransactionIcon(transactionType, isFailedTransaction);
    return <Image source={icon} style={styles.icon} resizeMode="stretch" />;
  };

  return (
    <>
      <TouchableHighlight
        style={[
          styles.itemContainer,
          { borderBottomColor: colors.border.muted },
        ]}
        onPress={handlePress}
        underlayColor={colors.background.alternative}
        activeOpacity={1}
        testID={`transaction-list-item-${transaction.id}`}
      >
        <ListItem>
          <ListItem.Date style={styles.listItemDate}>
            {transaction.timestamp &&
              toDateFormat(new Date(transaction.timestamp * 1000))}
          </ListItem.Date>
          <ListItem.Content style={styles.listItemContent}>
            <ListItem.Icon>{renderTxElementIcon(type)}</ListItem.Icon>
            <ListItem.Body>
              <ListItem.Title
                numberOfLines={1}
                style={styles.listItemTitle as TextStyle}
              >
                {title}
              </ListItem.Title>
              <StatusText
                testID={`transaction-status-${transaction.id}`}
                status={status}
                style={styles.listItemStatus as TextStyle}
                context="transaction"
              />
            </ListItem.Body>
            {Boolean(asset?.amount) && (
              <ListItem.Amount style={styles.listItemAmount as TextStyle}>
                {asset?.amount} {asset?.unit}
              </ListItem.Amount>
            )}
          </ListItem.Content>
        </ListItem>
      </TouchableHighlight>

      <MultichainTransactionDetailsModal
        isVisible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        transaction={transaction}
        userAddress={selectedAddress}
        navigation={navigation}
      />
    </>
  );
};

export default MultichainTransactionListItem;
