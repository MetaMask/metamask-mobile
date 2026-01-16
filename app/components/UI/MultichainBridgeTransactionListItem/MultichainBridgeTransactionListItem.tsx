import { NavigationProp } from '@react-navigation/native';
import { RootParamList } from '../../../types/navigation';
import React from 'react';
import {
  Image,
  TouchableHighlight,
  TextStyle,
  useColorScheme,
} from 'react-native';
import { Transaction } from '@metamask/keyring-api';
import { BridgeHistoryItem } from '@metamask/bridge-status-controller';
import { useTheme } from '../../../util/theme';
import ListItem from '../../Base/ListItem';
import StatusText from '../../Base/StatusText';
import { getTransactionIcon } from '../../../util/transaction-icons';
import { toDateFormat } from '../../../util/date';
import styles from '../MultichainTransactionListItem/MultichainTransactionListItem.styles';
import BridgeActivityItemTxSegments from '../Bridge/components/TransactionDetails/BridgeActivityItemTxSegments';
import { useSelector } from 'react-redux';
import { RootState } from '../../../reducers';
import {
  getSwapBridgeTxActivityTitle,
  handleUnifiedSwapsTxHistoryItemClick,
} from '../Bridge/utils/transaction-history';
import { ethers } from 'ethers';
import { formatAmountWithThreshold } from '../../../util/number';
import BadgeWrapper from '../../../component-library/components/Badges/BadgeWrapper';
import Badge, {
  BadgeVariant,
} from '../../../component-library/components/Badges/Badge';
import { getNetworkImageSource } from '../../../util/networks';
import { parseCaipAssetType } from '@metamask/utils';

const MultichainBridgeTransactionListItem = ({
  transaction,
  bridgeHistoryItem,
  navigation,
  index,
}: {
  transaction: Transaction;
  bridgeHistoryItem: BridgeHistoryItem;
  navigation: NavigationProp<RootParamList>;
  index?: number;
}) => {
  const { colors, typography } = useTheme();
  const osColorScheme = useColorScheme();
  const appTheme = useSelector((state: RootState) => state.user.appTheme);
  const style = styles(colors, typography);

  const isSwap =
    bridgeHistoryItem.quote.srcAsset.chainId ===
    bridgeHistoryItem.quote.destAsset.chainId;

  const handlePress = () => {
    handleUnifiedSwapsTxHistoryItemClick({
      navigation,
      multiChainTx: transaction,
      bridgeTxHistoryItem: bridgeHistoryItem,
    });
  };

  const renderTxElementIcon = () => {
    const isFailedTransaction = transaction.status === 'failed';
    const icon = getTransactionIcon(
      isSwap ? 'swap' : 'bridge',
      isFailedTransaction,
      appTheme,
      osColorScheme,
    );
    const chainId = parseCaipAssetType(
      bridgeHistoryItem.quote.srcAsset.assetId,
    ).chainId;
    if (!chainId)
      return <Image source={icon} style={style.icon} resizeMode="stretch" />;

    const networkImageSource = getNetworkImageSource({ chainId });
    return (
      <BadgeWrapper
        badgeElement={
          <Badge
            variant={BadgeVariant.Network}
            imageSource={networkImageSource}
          />
        }
      >
        <Image source={icon} style={style.icon} resizeMode="stretch" />
      </BadgeWrapper>
    );
  };

  // Does not apply to swaps
  const isBridgeComplete = Boolean(
    bridgeHistoryItem?.status.srcChain.txHash &&
      bridgeHistoryItem.status.destChain?.txHash,
  );

  const rawAmount = parseFloat(
    ethers.utils.formatUnits(
      bridgeHistoryItem.quote.srcTokenAmount,
      bridgeHistoryItem.quote.srcAsset.decimals,
    ),
  );

  const displayAmount = formatAmountWithThreshold(rawAmount, 5);

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
            <ListItem.Icon>{renderTxElementIcon()}</ListItem.Icon>
            <ListItem.Body>
              <ListItem.Title
                numberOfLines={1}
                style={style.listItemTitle as TextStyle}
              >
                {getSwapBridgeTxActivityTitle(bridgeHistoryItem)}
              </ListItem.Title>
              {!isBridgeComplete && !isSwap && (
                <BridgeActivityItemTxSegments
                  bridgeTxHistoryItem={bridgeHistoryItem}
                  transactionStatus={transaction.status}
                />
              )}
              {(isBridgeComplete || isSwap) && (
                <StatusText
                  testID={`transaction-status-${transaction.id}`}
                  status={transaction.status}
                  style={style.listItemStatus as TextStyle}
                  context="transaction"
                />
              )}
            </ListItem.Body>
            <ListItem.Amount style={style.listItemAmount as TextStyle}>
              {displayAmount} {bridgeHistoryItem.quote.srcAsset.symbol}
            </ListItem.Amount>
          </ListItem.Content>
        </ListItem>
      </TouchableHighlight>
    </>
  );
};

export default MultichainBridgeTransactionListItem;
