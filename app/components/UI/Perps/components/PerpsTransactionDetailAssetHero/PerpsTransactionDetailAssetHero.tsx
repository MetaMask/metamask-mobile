import React from 'react';
import { View } from 'react-native';
import { PerpsTransactionSelectorsIDs } from '../../Perps.testIds';
import { PerpsTransaction } from '../../types/transactionHistory';
import PerpsTokenLogo from '../PerpsTokenLogo';
import { TransactionDetailStyles } from '../../utils/transactionDetailStyles';
import { Text, TextVariant } from '@metamask/design-system-react-native';

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
    <Text variant={TextVariant.HeadingLg} style={styles.assetAmount}>
      {transaction.subtitle}
    </Text>
  </View>
);

export default PerpsTransactionDetailAssetHero;
