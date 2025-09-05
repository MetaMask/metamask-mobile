import React from 'react';
import { View, StyleSheet } from 'react-native';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { PerpsTransactionSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';
import { PerpsTransaction } from '../../types/transactionHistory';
import PerpsTokenLogo from '../PerpsTokenLogo';

interface PerpsTransactionDetailAssetHeroProps {
  transaction: PerpsTransaction;
  styles: ReturnType<typeof StyleSheet.create>;
}

const PerpsTransactionDetailAssetHero: React.FC<
  PerpsTransactionDetailAssetHeroProps
> = ({ transaction, styles }) => (
  <View
    testID={PerpsTransactionSelectorsIDs.TRANSACTION_DETAIL_ASSET_HERO}
    style={styles.assetContainer}
  >
    <View
      testID={PerpsTransactionSelectorsIDs.ASSET_ICON_CONTAINER}
      style={styles.assetIconContainer}
    >
      <PerpsTokenLogo symbol={transaction.asset} size={44} />
    </View>
    <Text variant={TextVariant.HeadingLG} style={styles.assetAmount}>
      {transaction.subtitle}
    </Text>
  </View>
);

export default PerpsTransactionDetailAssetHero;
