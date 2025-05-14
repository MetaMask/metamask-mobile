import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { strings } from '../../../../../../../../locales/i18n';
import Text, {
  TextVariant,
} from '../../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../../../component-library/hooks';
import { useFlatConfirmation } from '../../../../hooks/ui/useFlatConfirmation';
import { TooltipModal } from '../../../UI/Tooltip/Tooltip';
import styleSheet from './token-hero.styles';
import { AvatarTokenWithNetworkBadge } from './avatar-token-with-network-badge';
import { useTokenValuesByType } from '../../../../hooks/useTokenValuesByType';
import { useTokenAssetByType } from '../../../../hooks/useTokenAssetByType';

// todo:
// - add conditional logic to fiat value. e.g. should hide if testnet
// - tokenlist sometimes only has 0x0000000000000000000000000000000000000000
// - style: confirm if we'd like to add the symbol in the modal precise token amount text
// - style: confirm fallback avatar - non-bold + background color
const AssetAmount = ({
  amountDisplay,
  tokenSymbol,
  styles,
  setIsModalVisible,
}: {
  amountDisplay?: string;
  tokenSymbol?: string;
  styles: StyleSheet.NamedStyles<Record<string, unknown>>;
  setIsModalVisible: ((isModalVisible: boolean) => void) | null;
}) => (
  <View style={styles.assetAmountContainer}>
    {setIsModalVisible ? (
      <TouchableOpacity onPress={() => setIsModalVisible(true)}>
        <Text style={styles.assetAmountText} variant={TextVariant.HeadingLG}>
          {amountDisplay} {tokenSymbol}
        </Text>
      </TouchableOpacity>
    ) : (
      <Text style={styles.assetAmountText} variant={TextVariant.HeadingLG}>
        {amountDisplay} {tokenSymbol}
      </Text>
    )}
  </View>
);

const AssetFiatConversion = ({
  fiatDisplay,
  styles,
}: {
  fiatDisplay?: string;
  styles: StyleSheet.NamedStyles<Record<string, unknown>>;
}) => fiatDisplay ? (
    <Text style={styles.assetFiatConversionText} variant={TextVariant.BodyMD}>
      {fiatDisplay}
    </Text>
  ) : null;

const TokenHero = ({ amountWei }: { amountWei?: string }) => {
  const [isModalVisible, setIsModalVisible] = useState(false);

  const { isFlatConfirmation } = useFlatConfirmation();
  const { styles } = useStyles(styleSheet, {
    isFlatConfirmation,
  });

  const { amountPreciseDisplay, amountDisplay, fiatDisplay } = useTokenValuesByType({ amountWei });
  const { tokenSymbol } = useTokenAssetByType();

  const isRoundedAmount = amountPreciseDisplay !== amountDisplay;

  return (
    <View style={styles.container}>
      <View style={styles.containerAvatarTokenNetworkWithBadge}>
        <AvatarTokenWithNetworkBadge />
      </View>
      <AssetAmount
        amountDisplay={amountDisplay}
        tokenSymbol={tokenSymbol}
        styles={styles}
        setIsModalVisible={isRoundedAmount ? setIsModalVisible : null}
      />
      <AssetFiatConversion
        fiatDisplay={fiatDisplay ?? ''}
        styles={styles}
      />
      {isRoundedAmount && (
        <TooltipModal
          open={isModalVisible}
          setOpen={setIsModalVisible}
          content={amountPreciseDisplay}
          title={strings('send.amount')}
          tooltipTestId="token-hero-amount"
        />
      )}
    </View>
  );
};

export default TokenHero;
