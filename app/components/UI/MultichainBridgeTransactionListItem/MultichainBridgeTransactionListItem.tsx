import { NavigationProp, ParamListBase } from '@react-navigation/native';
import React, { useState } from 'react';
import {
  Image,
  TouchableHighlight,
  TextStyle,
  useColorScheme,
} from 'react-native';
import { Transaction, TransactionType } from '@metamask/keyring-api';
import { BridgeHistoryItem } from '@metamask/bridge-status-controller';
import { useTheme } from '../../../util/theme';
import ListItem from '../../Base/ListItem';
import StatusText from '../../Base/StatusText';
import { getTransactionIcon } from '../../../util/transaction-icons';
import { toDateFormat } from '../../../util/date';
import { useMultichainTransactionDisplay } from '../../hooks/useMultichainTransactionDisplay';
import MultichainTransactionDetailsModal from '../MultichainTransactionDetailsModal';
import styles from './MultichainBridgeTransactionListItem.styles';
import BridgeActivityItemTxSegments from '../Bridge/components/TransactionDetails/BridgeActivityItemTxSegments';
import Routes from '../../../constants/navigation/Routes';
import { useSelector } from 'react-redux';
import { RootState } from '../../../reducers';
import { NonEvmNetworkConfiguration } from '@metamask/multichain-network-controller';

const MultichainBridgeTransactionListItem = ({
  transaction,
  networkConfig,
  bridgeHistoryItem,
  selectedAddress,
  navigation,
  index,
}: {
  transaction: Transaction;
  networkConfig: NonEvmNetworkConfiguration;
  bridgeHistoryItem?: BridgeHistoryItem;
  selectedAddress: string;
  navigation: NavigationProp<ParamListBase>;
  index?: number;
}) => {
  const { colors, typography } = useTheme();
  const osColorScheme = useColorScheme();
  const appTheme = useSelector((state: RootState) => state.user.appTheme);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const { type, from, to, fees, baseFee, priorityFee, title } =
    useMultichainTransactionDisplay(transaction, networkConfig);

  const isSwapTx = type === TransactionType.Swap && bridgeHistoryItem;
  const isBridgeTx = type === TransactionType.Send && bridgeHistoryItem;
  const isBridgeComplete = bridgeHistoryItem
    ? Boolean(
        bridgeHistoryItem?.status.srcChain.txHash &&
          bridgeHistoryItem.status.destChain?.txHash,
      )
    : null;

  const style = styles(colors, typography);

  const handlePress = () => {
    if (isBridgeTx || isSwapTx) {
      navigation.navigate(Routes.BRIDGE.BRIDGE_TRANSACTION_DETAILS, {
        multiChainTx: transaction,
      });
    } else {
      setIsModalVisible(true);
    }
  };

  const renderTxElementIcon = (transactionType: string) => {
    const isFailedTransaction = status === 'failed';
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
        onPress={handlePress}
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
              {renderTxElementIcon(isBridgeTx ? 'bridge' : type)}
            </ListItem.Icon>
            <ListItem.Body>
              <ListItem.Title
                numberOfLines={1}
                style={style.listItemTitle as TextStyle}
              >
                {title}
              </ListItem.Title>
              {isBridgeTx && !isBridgeComplete && (
                <BridgeActivityItemTxSegments
                  bridgeTxHistoryItem={bridgeHistoryItem}
                  transactionStatus={transaction.status}
                />
              )}
              {(!isBridgeTx || (isBridgeTx && isBridgeComplete)) && (
                <StatusText
                  testID={`transaction-status-${transaction.id}`}
                  status={status}
                  style={style.listItemStatus as TextStyle}
                  context="transaction"
                />
              )}
            </ListItem.Body>
            <ListItem.Amount style={style.listItemAmount as TextStyle}>
              {to.amount} {to.unit}
            </ListItem.Amount>
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

export default MultichainBridgeTransactionListItem;
