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

export enum FillType {
  Standard = 'standard',
  Liquidation = 'liquidation',
  TakeProfit = 'take_profit',
  StopLoss = 'stop_loss',
  AutoDeleveraging = 'auto_deleveraging',
}

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
    const { fill } = item;

    if (!fill) {
      return null;
    }

    if (fill.fillType === FillType.Standard) {
      return null;
    }

    const tagConfig = {
      [FillType.AutoDeleveraging]: {
        label: strings('perps.transactions.order.auto_deleveraging'),
        severity: TagSeverity.Info,
        textColor: TextColor.Default,
        includesBorder: false,
      },
      [FillType.Liquidation]: {
        // Only show if liquidated user is current user
        condition:
          fill.liquidation?.liquidatedUser === selectedAccount?.address,
        label: strings('perps.transactions.order.liquidated'),
        severity: TagSeverity.Danger,
        textColor: TextColor.Error,
        includesBorder: false,
      },
      [FillType.TakeProfit]: {
        label: strings('perps.transactions.order.take_profit'),
        severity: TagSeverity.Default,
        textColor: TextColor.Alternative,
        includesBorder: true,
      },
      [FillType.StopLoss]: {
        label: strings('perps.transactions.order.stop_loss'),
        severity: TagSeverity.Default,
        textColor: TextColor.Alternative,
        includesBorder: true,
      },
    }[fill.fillType];

    if (
      !tagConfig ||
      (tagConfig.condition !== undefined && !tagConfig.condition)
    ) {
      return null;
    }

    return (
      <TagBase
        shape={TagShape.Pill}
        severity={tagConfig.severity}
        includesBorder={tagConfig.includesBorder}
      >
        <Text variant={TextVariant.BodyXSMedium} color={tagConfig.textColor}>
          {tagConfig.label}
        </Text>
      </TagBase>
    );
  }, [item, selectedAccount?.address]);

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
