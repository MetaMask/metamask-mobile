import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { strings } from '../../../../../../../locales/i18n';
import Badge, {
  BadgeVariant,
} from '../../../../../../component-library/components/Badges/Badge';
import BadgeWrapper from '../../../../../../component-library/components/Badges/BadgeWrapper';
import Text, {
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../../component-library/hooks';
import images from '../../../../../../images/image-icons';
import TokenIcon from '../../../../../UI/Swaps/components/TokenIcon';
import { useTokenValues } from '../../../hooks/useTokenValues';
import { TooltipModal } from '../../UI/Tooltip/Tooltip';
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
  setIsModalVisible,
}: {
  tokenAmountDisplayValue: string;
  tokenSymbol: string;
  styles: StyleSheet.NamedStyles<Record<string, unknown>>;
  setIsModalVisible: ((isModalVisible: boolean) => void) | null;
}) => (
    <View style={styles.assetAmountContainer}>
      {setIsModalVisible ? (
        <TouchableOpacity onPress={() => setIsModalVisible(true)}>
          <Text style={styles.assetAmountText} variant={TextVariant.HeadingLG}>
            {tokenAmountDisplayValue} {tokenSymbol}
          </Text>
        </TouchableOpacity>
      ) : (
        <Text style={styles.assetAmountText} variant={TextVariant.HeadingLG}>
          {tokenAmountDisplayValue} {tokenSymbol}
        </Text>
      )}
    </View>
  );

const AssetFiatConversion = ({
  fiatDisplayValue,
  styles,
}: {
  fiatDisplayValue: string;
  styles: StyleSheet.NamedStyles<Record<string, unknown>>;
}) => (
  <Text style={styles.assetFiatConversionText} variant={TextVariant.BodyMD}>
    {fiatDisplayValue}
  </Text>
);

const TokenHero = () => {
  const { styles } = useStyles(styleSheet, {});
  const { tokenAmountValue, tokenAmountDisplayValue, fiatDisplayValue } = useTokenValues();
  const [isModalVisible, setIsModalVisible] = useState(false);

  const displayTokenAmountIsRounded = tokenAmountValue !== tokenAmountDisplayValue;

  const tokenSymbol = 'ETH';

  return (
    <View style={styles.container}>
      <NetworkAndTokenImage tokenSymbol={tokenSymbol} styles={styles} />
      <AssetAmount
        tokenAmountDisplayValue={tokenAmountDisplayValue}
        tokenSymbol={tokenSymbol}
        styles={styles}
        setIsModalVisible={displayTokenAmountIsRounded ? setIsModalVisible : null}
      />
      <AssetFiatConversion
        fiatDisplayValue={fiatDisplayValue}
        styles={styles}
      />
      {displayTokenAmountIsRounded && (
        <TooltipModal
          open={isModalVisible}
          setOpen={setIsModalVisible}
          content={tokenAmountValue}
          title={strings('send.amount')}
          tooltipTestId='token-hero-amount'
        />
      )}
    </View>
  );
};

export default TokenHero;
