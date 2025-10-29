import React, { useMemo } from 'react';
import { View, TouchableOpacity, ViewStyle, TextStyle } from 'react-native';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { PerpsTransactionSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';
import { PERPS_TRANSACTIONS_HISTORY_CONSTANTS } from '../../constants/transactionsHistoryConfig';
import { PerpsTransaction } from '../../types/transactionHistory';
import PerpsTokenLogo from '../PerpsTokenLogo';
import TagBase, {
  TagSeverity,
  TagShape,
} from '../../../../../component-library/base-components/TagBase';
import { strings } from '../../../../../../locales/i18n';
import { useSelector } from 'react-redux';
import { selectSelectedInternalAccountByScope } from '../../../../../selectors/multichainAccounts/accounts';
import { EVM_SCOPE } from '../../../Earn/constants/networks';
interface PerpsTransactionItemProps {
  item: PerpsTransaction;
  styles: {
    transactionItem?: ViewStyle;
    tokenIconContainer?: ViewStyle;
    transactionContent?: ViewStyle;
    transactionContentCentered?: ViewStyle;
    transactionTitle?: TextStyle;
    transactionTitleCentered?: TextStyle;
    transactionSubtitle?: TextStyle;
    rightContent?: ViewStyle;
    fillTag?: ViewStyle;
    [key: string]: ViewStyle | TextStyle | undefined;
  };
  onPress: (transaction: PerpsTransaction) => void;
  renderRightContent: (transaction: PerpsTransaction) => React.ReactNode;
}

const PerpsTransactionItem: React.FC<PerpsTransactionItemProps> = ({
  item,
  styles,
  onPress,
  renderRightContent,
}) => {
  const selectedAccount = useSelector(selectSelectedInternalAccountByScope)(
    EVM_SCOPE,
  );
  const fillTag = useMemo(() => {
    let label = '';

    if (
      item.fill?.isLiquidation &&
      // liquidatedUser isn't always the current user. It can also mean the fill filled another user's liquidation.
      // We only want to show the liquidated tag if the liquidation event is for the current user.
      item.fill?.liquidation?.liquidatedUser === selectedAccount?.address
    ) {
      label = strings('perps.transactions.order.liquidated');
    } else if (item.fill?.isTakeProfit) {
      label = strings('perps.transactions.order.take_profit');
    } else if (item.fill?.isStopLoss) {
      label = strings('perps.transactions.order.stop_loss');
    }

    if (!label) {
      return null;
    }

    let severity = TagSeverity.Default;

    if (item.fill?.isLiquidation) {
      severity = TagSeverity.Danger;
    }

    let textColor = TextColor.Alternative;
    if (item.fill?.isLiquidation) {
      textColor = TextColor.Error;
    }

    return (
      <TagBase
        shape={TagShape.Pill}
        severity={severity}
        includesBorder={Boolean(!item.fill?.liquidation)}
      >
        <Text variant={TextVariant.BodyXSMedium} color={textColor}>
          {label}
        </Text>
      </TagBase>
    );
  }, [
    item.fill?.isLiquidation,
    item.fill?.isStopLoss,
    item.fill?.isTakeProfit,
    item.fill?.liquidation,
    selectedAccount?.address,
  ]);

  return (
    <TouchableOpacity
      testID={PerpsTransactionSelectorsIDs.TRANSACTION_ITEM}
      style={styles.transactionItem}
      onPress={() => onPress(item)}
      activeOpacity={
        PERPS_TRANSACTIONS_HISTORY_CONSTANTS.LIST_ITEM_SELECTOR_OPACITY
      }
    >
      <View
        testID={PerpsTransactionSelectorsIDs.TRANSACTION_ITEM_AVATAR}
        style={styles.tokenIconContainer}
      >
        <PerpsTokenLogo
          symbol={item.asset}
          size={36}
          recyclingKey={`${item.asset}-${item.id}`}
        />
      </View>

      <View
        style={
          item.subtitle
            ? styles.transactionContent
            : styles.transactionContentCentered
        }
      >
        <View style={styles.fillTag}>
          <Text
            style={
              item.subtitle
                ? styles.transactionTitle
                : styles.transactionTitleCentered
            }
          >
            {item.title}
          </Text>
          {fillTag}
        </View>

        {item.subtitle && (
          <Text style={styles.transactionSubtitle}>{item.subtitle}</Text>
        )}
      </View>
      <View style={styles.rightContent}>{renderRightContent(item)}</View>
    </TouchableOpacity>
  );
};

export default PerpsTransactionItem;
