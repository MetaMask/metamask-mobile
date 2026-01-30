import { useNavigation } from '@react-navigation/native';
import React, { useCallback } from 'react';
import {
  Image,
  TouchableHighlight,
  TextStyle,
  useColorScheme,
} from 'react-native';
import { Transaction, TransactionType } from '@metamask/keyring-api';
import { useTheme } from '../../../util/theme';
import ListItem from '../../Base/ListItem';
import StatusText from '../../Base/StatusText';
import { getTransactionIcon } from '../../../util/transaction-icons';
import { toDateFormat } from '../../../util/date';
import { useMultichainTransactionDisplay } from '../../hooks/useMultichainTransactionDisplay';
import styles from './MultichainTransactionListItem.styles';
import { useSelector } from 'react-redux';
import { RootState } from '../../../reducers';
import { SupportedCaipChainId } from '@metamask/multichain-network-controller';
import BadgeWrapper from '../../../component-library/components/Badges/BadgeWrapper';
import Badge, {
  BadgeVariant,
} from '../../../component-library/components/Badges/Badge';
import { getNetworkImageSource } from '../../../util/networks';
import Routes from '../../../constants/navigation/Routes';

const MultichainTransactionListItem = ({
  transaction,
  chainId,
  index,
}: {
  transaction: Transaction;
  chainId: SupportedCaipChainId;
  index?: number;
}) => {
  const { colors, typography } = useTheme();
  const osColorScheme = useColorScheme();
  const appTheme = useSelector((state: RootState) => state.user.appTheme);

  const navigation = useNavigation();
  const displayData = useMultichainTransactionDisplay(transaction, chainId);
  const { title, to, priorityFee, baseFee, isRedeposit } = displayData;

  const handlePress = useCallback(() => {
    // Type assertion needed for v6 navigate() overload resolution
    (navigation.navigate as (screen: string, params: object) => void)(
      Routes.MODAL.ROOT_MODAL_FLOW,
      {
        screen: Routes.SHEET.MULTICHAIN_TRANSACTION_DETAILS,
        params: { displayData, transaction },
      },
    );
  }, [navigation, displayData, transaction]);

  const style = styles(colors, typography);

  const renderTxElementIcon = (transactionType: string) => {
    const isFailedTransaction = transaction.status === 'failed';
    const icon = getTransactionIcon(
      transactionType.toLowerCase(),
      isFailedTransaction,
      appTheme,
      osColorScheme,
    );
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

  const displayAmount = () => {
    if (isRedeposit) {
      return `${priorityFee?.amount} ${priorityFee?.unit}`;
    }

    if (transaction.type === TransactionType.Unknown) {
      return `${baseFee?.amount} ${baseFee?.unit}`;
    }

    return `${to?.amount} ${to?.unit}`;
  };

  return (
    <TouchableHighlight
      style={[style.itemContainer, { borderBottomColor: colors.border.muted }]}
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
            {renderTxElementIcon(isRedeposit ? 'redeposit' : transaction.type)}
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
            {displayAmount()}
          </ListItem.Amount>
        </ListItem.Content>
      </ListItem>
    </TouchableHighlight>
  );
};

export default MultichainTransactionListItem;
