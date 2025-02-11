import React from 'react';
import { View } from 'react-native';

import styleSheet from './TokenHero.styles';
import Badge, {
  BadgeVariant,
} from '../../../../../../component-library/components/Badges/Badge';
import BadgeWrapper from '../../../../../../component-library/components/Badges/BadgeWrapper';
import { useStyles } from '../../../../../../component-library/hooks';
import images from '../../../../../../images/image-icons';
import TokenIcon from '../../../../../UI/Swaps/components/TokenIcon';
import Text, {
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { useTokenValues } from '../../../hooks/useTokenValues';

// TODO: This component will extend to use token information from transaction metadata on upcoming redesigned confirmations
const TokenHero = () => {
  const { styles } = useStyles(styleSheet, {});
  const { fiatDisplayValue, tokenAmountDisplayValue } = useTokenValues();

  const tokenSymbol = 'ETH';

  const NetworkAndTokenImage = (
    <View style={styles.networkAndTokenContainer}>
      <BadgeWrapper
        badgeElement={
          <Badge imageSource={images.ETHEREUM} variant={BadgeVariant.Network} />
        }
      >
        <TokenIcon big symbol={tokenSymbol} />
      </BadgeWrapper>
    </View>
  );

  const AssetAmount = (
    <View style={styles.assetAmountContainer}>
      <Text style={styles.assetAmountText} variant={TextVariant.HeadingLG}>
        {tokenAmountDisplayValue} {tokenSymbol}
      </Text>
    </View>
  );

  const AssetFiatConversion = (
    <View style={styles.assetFiatConversionContainer}>
      <Text style={styles.assetFiatConversionText} variant={TextVariant.BodyMD}>
        {fiatDisplayValue}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {NetworkAndTokenImage}
      {AssetAmount}
      {AssetFiatConversion}
    </View>
  );
};

export default TokenHero;
