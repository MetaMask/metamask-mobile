import { NavigationProp, ParamListBase } from '@react-navigation/native';
import React, { useState } from 'react';
import { Image, TouchableHighlight, TextStyle } from 'react-native';
import { capitalize } from 'lodash';
import { Transaction, TransactionType } from '@metamask/keyring-api';
import { useTheme } from '../../../util/theme';
import { strings } from '../../../../locales/i18n';
import ListItem from '../../Base/ListItem';
import StatusText from '../../Base/StatusText';
import { getTransactionIcon } from '../../../util/transaction-icons';
import { toDateFormat } from '../../../util/date';
import { useMultichainTransactionDisplay } from '../../hooks/useMultichainTransactionDisplay';
import MultichainTransactionDetailsModal from '../MultichainTransactionDetailsModal';
import styles from './MultichainTransactionListItem.styles';

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

    title = `${strings('transactions.swap')} ${fromUnit} ${strings(
      'transactions.to',
    )} ${toUnit}`;
  }

  const style = styles(colors, typography);

  const handlePress = () => {
    setIsModalVisible(true);
  };

  const renderTxElementIcon = (transactionType: string) => {
    const isFailedTransaction = status === 'failed';
    const icon = getTransactionIcon(transactionType, isFailedTransaction);
    return <Image source={icon} style={style.icon} resizeMode="stretch" />;
  };

  return (
    <>
      <TouchableHighlight
        style={[
          style.itemContainer,
          { borderBottomColor: colors.border.muted },
        ]}
        onPress={handlePress}
        underlayColor={colors.background.alternative}
        activeOpacity={1}
        testID={`transaction-list-item-${transaction.id}`}
      >
        <ListItem>
          <ListItem.Date style={style.listItemDate}>
            {transaction.timestamp &&
              toDateFormat(new Date(transaction.timestamp * 1000))}
          </ListItem.Date>
          <ListItem.Content style={style.listItemContent}>
            <ListItem.Icon>{renderTxElementIcon(type)}</ListItem.Icon>
            <ListItem.Body>
              <ListItem.Title
                numberOfLines={1}
                style={style.listItemTitle as TextStyle}
              >
                {title}
              </ListItem.Title>
              <StatusText
                testID={`transaction-status-${transaction.id}`}
                status={status}
                style={style.listItemStatus as TextStyle}
                context="transaction"
              />
            </ListItem.Body>
            {Boolean(asset?.amount) && (
              <ListItem.Amount style={style.listItemAmount as TextStyle}>
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
