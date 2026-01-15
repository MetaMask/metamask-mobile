import React from 'react';
import { View } from 'react-native';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { PerpsTransactionSelectorsIDs } from '../../Perps.testIds';
import { PerpsTransaction } from '../../types/transactionHistory';
import PerpsTokenLogo from '../PerpsTokenLogo';
import { TransactionDetailStyles } from '../../utils/transactionDetailStyles';

interface PerpsTransactionDetailAssetHeroProps {
  transaction: PerpsTransaction;
  styles: TransactionDetailStyles;
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
