import React from 'react';
import { View, StyleSheet } from 'react-native';

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
import styleSheet from './TokenHero.styles';

const NetworkAndTokenImage = ({
  tokenSymbol,
  styles,
}: {
  tokenSymbol: string;
  styles: StyleSheet.NamedStyles<Record<string, unknown>>;
}) => (
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

const AssetAmount = ({
  tokenAmountDisplayValue,
  tokenSymbol,
  styles,
}: {
  tokenAmountDisplayValue: string;
  tokenSymbol: string;
  styles: StyleSheet.NamedStyles<Record<string, unknown>>;
}) => (
    <View style={styles.assetAmountContainer}>
      <Text style={styles.assetAmountText} variant={TextVariant.HeadingLG}>
        {tokenAmountDisplayValue} {tokenSymbol}
      </Text>
    </View>
  );

const AssetFiatConversion = ({
  fiatDisplayValue,
  styles,
}: {
  fiatDisplayValue: string;
  styles: StyleSheet.NamedStyles<Record<string, unknown>>;
}) => (
    <View style={styles.assetFiatConversionContainer}>
      <Text style={styles.assetFiatConversionText} variant={TextVariant.BodyMD}>
        {fiatDisplayValue}
      </Text>
    </View>
  );

const TokenHero = () => {
  const { styles } = useStyles(styleSheet, {});
  const { fiatDisplayValue, tokenAmountDisplayValue } = useTokenValues();

  const tokenSymbol = 'ETH';

  return (
    <View style={styles.container}>
      <NetworkAndTokenImage tokenSymbol={tokenSymbol} styles={styles} />
      <AssetAmount
        tokenAmountDisplayValue={tokenAmountDisplayValue}
        tokenSymbol={tokenSymbol}
        styles={styles}
      />
      <AssetFiatConversion
        fiatDisplayValue={fiatDisplayValue}
        styles={styles}
      />
    </View>
  );
};

export default TokenHero;
