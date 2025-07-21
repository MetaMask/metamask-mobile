import { NavigationProp, ParamListBase } from '@react-navigation/native';
import React, { useState } from 'react';
import {
  Image,
  TouchableHighlight,
  TextStyle,
  useColorScheme,
} from 'react-native';
import { Transaction } from '@metamask/keyring-api';
import { useTheme } from '../../../util/theme';
import ListItem from '../../Base/ListItem';
import StatusText from '../../Base/StatusText';
import { getTransactionIcon } from '../../../util/transaction-icons';
import { toDateFormat } from '../../../util/date';
import { useMultichainTransactionDisplay } from '../../hooks/useMultichainTransactionDisplay';
import MultichainTransactionDetailsModal from '../MultichainTransactionDetailsModal';
import styles from './MultichainTransactionListItem.styles';
import { useSelector } from 'react-redux';
import { RootState } from '../../../reducers';
import { NonEvmNetworkConfiguration } from '@metamask/multichain-network-controller';

const MultichainTransactionListItem = ({
  transaction,
  networkConfig,
  navigation,
  index,
}: {
  transaction: Transaction;
  networkConfig: NonEvmNetworkConfiguration;
  selectedAddress: string;
  navigation: NavigationProp<ParamListBase>;
  index?: number;
}) => {
  const { colors, typography } = useTheme();
  const osColorScheme = useColorScheme();
  const appTheme = useSelector((state: RootState) => state.user.appTheme);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const displayData = useMultichainTransactionDisplay(
    transaction,
    networkConfig,
  );
  const { title, to, priorityFee, isRedeposit } = displayData;

  const style = styles(colors, typography);

  const renderTxElementIcon = (transactionType: string) => {
    const isFailedTransaction = transaction.status === 'failed';
    const icon = getTransactionIcon(
      transactionType,
      isFailedTransaction,
      appTheme,
      osColorScheme,
    );
    return <Image source={icon} style={style.icon} resizeMode="stretch" />;
  };

  return (
    <>
      <TouchableHighlight
        style={[
          style.itemContainer,
          { borderBottomColor: colors.border.muted },
        ]}
        onPress={() => setIsModalVisible(true)}
        underlayColor={colors.background.alternative}
        activeOpacity={1}
        testID={`transaction-item-${index ?? 0}`}
      >
        <ListItem>
          <ListItem.Date style={style.listItemDate}>
            {transaction.timestamp &&
              toDateFormat(new Date(transaction.timestamp * 1000))}
          </ListItem.Date>
          <ListItem.Content style={style.listItemContent}>
            <ListItem.Icon>
              {renderTxElementIcon(
                isRedeposit ? 'redeposit' : transaction.type,
              )}
            </ListItem.Icon>
            <ListItem.Body>
              <ListItem.Title
                numberOfLines={1}
                style={style.listItemTitle as TextStyle}
              >
                {title}
              </ListItem.Title>
              <StatusText
                testID={`transaction-status-${transaction.id}`}
                status={transaction.status}
                style={style.listItemStatus as TextStyle}
                context="transaction"
              />
            </ListItem.Body>
            <ListItem.Amount style={style.listItemAmount as TextStyle}>
              {isRedeposit
                ? `${priorityFee?.amount} ${priorityFee?.unit}`
                : `${to?.amount} ${to?.unit}`}
            </ListItem.Amount>
          </ListItem.Content>
        </ListItem>
      </TouchableHighlight>

      <MultichainTransactionDetailsModal
        isVisible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        displayData={displayData}
        transaction={transaction}
        navigation={navigation}
      />
    </>
  );
};

export default MultichainTransactionListItem;
