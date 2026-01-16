import React from 'react';
import { View, ViewStyle, TextStyle } from 'react-native';
import TouchableOpacity from '../../../../Base/TouchableOpacity';
import Text from '../../../../../component-library/components/Texts/Text';
import { PerpsTransactionSelectorsIDs } from '../../Perps.testIds';
import { PERPS_TRANSACTIONS_HISTORY_CONSTANTS } from '../../constants/transactionsHistoryConfig';
import { PerpsTransaction } from '../../types/transactionHistory';
import PerpsTokenLogo from '../PerpsTokenLogo';
import PerpsFillTag from '../PerpsFillTag';

// Re-export FillType from the types file for backwards compatibility
export { FillType } from '../../types/transactionHistory';

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
}) => (
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
        <PerpsFillTag transaction={item} />
      </View>

      {!!item.subtitle && (
        <Text style={styles.transactionSubtitle}>{item.subtitle}</Text>
      )}
    </View>
    <View style={styles.rightContent}>{renderRightContent(item)}</View>
  </TouchableOpacity>
);

export default PerpsTransactionItem;
