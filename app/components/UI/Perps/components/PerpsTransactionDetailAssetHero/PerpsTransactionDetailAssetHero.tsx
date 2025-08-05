import React from 'react';
import { View, StyleSheet } from 'react-native';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import Avatar, {
  AvatarSize,
  AvatarVariant,
} from '../../../../../component-library/components/Avatars/Avatar';
import RemoteImage from '../../../../Base/RemoteImage';
import { usePerpsAssetMetadata } from '../../hooks/usePerpsAssetsMetadata';
import { PerpsTransaction } from '../../Views/PerpsTransactionsView/PerpsTransactionsView';

interface PerpsTransactionDetailAssetHeroProps {
  transaction: PerpsTransaction;
  styles: ReturnType<typeof StyleSheet.create>;
}

const PerpsTransactionDetailAssetHero: React.FC<
  PerpsTransactionDetailAssetHeroProps
> = ({ transaction, styles }) => {
  const { assetUrl } = usePerpsAssetMetadata(transaction.asset);

  return (
    <View
      testID="perps-transaction-detail-asset-hero"
      style={styles.assetContainer}
    >
      <View testID="asset-icon-container" style={styles.assetIconContainer}>
        {assetUrl ? (
          <RemoteImage
            source={{ uri: assetUrl }}
            style={styles.assetIcon}
            resizeMode="cover"
          />
        ) : (
          <Avatar
            variant={AvatarVariant.Network}
            name={transaction.asset}
            size={AvatarSize.Lg}
          />
        )}
      </View>
      <Text variant={TextVariant.HeadingLG} style={styles.assetAmount}>
        {transaction.subtitle}
      </Text>
    </View>
  );
};

export default PerpsTransactionDetailAssetHero;
