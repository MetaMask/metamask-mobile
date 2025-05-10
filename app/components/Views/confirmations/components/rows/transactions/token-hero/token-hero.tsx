import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { strings } from '../../../../../../../../locales/i18n';
import Text, {
  TextVariant,
} from '../../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../../../component-library/hooks';
import { useTokenDetails } from '../../../../hooks/useTokenDetails';
import { useTokenValues } from '../../../../hooks/useTokenValues';
import { useFlatConfirmation } from '../../../../hooks/ui/useFlatConfirmation';
import { TooltipModal } from '../../../UI/Tooltip/Tooltip';
import styleSheet from './token-hero.styles';
import { AvatarTokenWithNetworkBadge } from './avatar-token-with-network-badge';

// todo:
// - add conditional logic to fiat value. e.g. should hide if testnet
// - fix inconsistent fiat value. can be off by pennies
// - tokenlist sometimes only has 0x0000000000000000000000000000000000000000
// - style: confirm if we'd like to add the symbol in the modal precise token amount text
// - style: confirm fallback avatar - non-bold + background color

const AssetAmount = ({
  tokenAmountDisplayValue,
  tokenSymbol,
  styles,
  setIsModalVisible,
}: {
  tokenAmountDisplayValue?: string;
  tokenSymbol?: string;
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
  fiatDisplayValue?: string;
  styles: StyleSheet.NamedStyles<Record<string, unknown>>;
}) => fiatDisplayValue ? (
    <Text style={styles.assetFiatConversionText} variant={TextVariant.BodyMD}>
      {fiatDisplayValue}
    </Text>
  ) : null;

const TokenHero = ({ amountWei }: { amountWei?: string }) => {
  const { isFlatConfirmation } = useFlatConfirmation();
  const { styles } = useStyles(styleSheet, {
    isFlatConfirmation,
  });
  const [isModalVisible, setIsModalVisible] = useState(false);

  const tokenDetails = useTokenDetails();
  const { symbol } = tokenDetails;
  const { tokenAmountValue, tokenAmountDisplayValue, fiatDisplayValue } =
    useTokenValues({ amountWei });

  const isRoundedTokenAmount = tokenAmountValue !== tokenAmountDisplayValue;

  return (
    <View style={styles.container}>
      <View style={styles.containerAvatarTokenNetworkWithBadge}>
        <AvatarTokenWithNetworkBadge />
      </View>
      <AssetAmount
        tokenAmountDisplayValue={tokenAmountDisplayValue}
        tokenSymbol={symbol}
        styles={styles}
        setIsModalVisible={isRoundedTokenAmount ? setIsModalVisible : null}
      />
      <AssetFiatConversion
        fiatDisplayValue={fiatDisplayValue}
        styles={styles}
      />
      {isRoundedTokenAmount && (
        <TooltipModal
          open={isModalVisible}
          setOpen={setIsModalVisible}
          content={tokenAmountValue}
          title={strings('send.amount')}
          tooltipTestId="token-hero-amount"
        />
      )}
    </View>
  );
};

export default TokenHero;
