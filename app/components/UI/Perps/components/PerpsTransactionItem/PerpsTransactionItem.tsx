import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import Text from '../../../../../component-library/components/Texts/Text';
import Avatar, {
  AvatarSize,
  AvatarVariant,
} from '../../../../../component-library/components/Avatars/Avatar';
import RemoteImage from '../../../../Base/RemoteImage';
import { usePerpsAssetMetadata } from '../../hooks/usePerpsAssetsMetadata';
import { PerpsTransactionSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';
import { PERPS_TRANSACTIONS_HISTORY_CONSTANTS } from '../../constants/transactionsHistoryConfig';
import { PerpsTransaction } from '../../types/transactionHistory';

interface PerpsTransactionItemProps {
  item: PerpsTransaction;
  styles: ReturnType<typeof StyleSheet.create>;
  onPress: (transaction: PerpsTransaction) => void;
  renderRightContent: (transaction: PerpsTransaction) => React.ReactNode;
}

const PerpsTransactionItem: React.FC<PerpsTransactionItemProps> = ({
  item,
  styles,
  onPress,
  renderRightContent,
}) => {
  const { assetUrl } = usePerpsAssetMetadata(item.asset);

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
        {assetUrl ? (
          <RemoteImage
            source={{ uri: assetUrl }}
            style={styles.transactionIcon}
            resizeMode="cover"
          />
        ) : (
          <Avatar
            variant={AvatarVariant.Network}
            name={item.asset}
            size={AvatarSize.Md}
          />
        )}
      </View>

      <View
        style={
          item.subtitle
            ? styles.transactionContent
            : styles.transactionContentCentered
        }
      >
        <Text
          style={
            item.subtitle
              ? styles.transactionTitle
              : styles.transactionTitleCentered
          }
        >
          {item.title}
        </Text>
        {item.subtitle && (
          <Text style={styles.transactionSubtitle}>{item.subtitle}</Text>
        )}
      </View>

      <View style={styles.rightContent}>{renderRightContent(item)}</View>
    </TouchableOpacity>
  );
};

export default PerpsTransactionItem;
