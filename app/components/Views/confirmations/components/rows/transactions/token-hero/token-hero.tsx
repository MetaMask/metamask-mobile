import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../../../locales/i18n';
import Text, {
  TextVariant,
} from '../../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../../../component-library/hooks';
import { selectTransactionState } from '../../../../../../../reducers/transaction';
import { useConfirmationContext } from '../../../../context/confirmation-context';
import { useFlatConfirmation } from '../../../../hooks/ui/useFlatConfirmation';
import { useTokenAssetByType } from '../../../../hooks/useTokenAssetByType';
import { useTokenValuesByType } from '../../../../hooks/useTokenValuesByType';
import AnimatedPulse from '../../../UI/animated-pulse';
import { TooltipModal } from '../../../UI/Tooltip/Tooltip';
import { AvatarTokenWithNetworkBadge } from './avatar-token-with-network-badge';
import styleSheet from './token-hero.styles';

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
}) =>
  fiatDisplay ? (
    <Text style={styles.assetFiatConversionText} variant={TextVariant.BodyMD}>
      {fiatDisplay}
    </Text>
  ) : null;

const TokenHero = ({ amountWei }: { amountWei?: string }) => {
  const [isModalVisible, setIsModalVisible] = useState(false);

  const { isTransactionValueUpdating } = useConfirmationContext();
  const { isFlatConfirmation } = useFlatConfirmation();
  const { maxValueMode } = useSelector(selectTransactionState);
  const { styles } = useStyles(styleSheet, {
    isFlatConfirmation,
  });

  const { amountPreciseDisplay, amountDisplay, fiatDisplay } =
    useTokenValuesByType({ amountWei });
  const { asset: { ticker } } = useTokenAssetByType();

  const isRoundedAmount = amountPreciseDisplay !== amountDisplay;

  return (
    <AnimatedPulse
      isPulsing={isTransactionValueUpdating}
      preventPulse={!maxValueMode}
    >
      <View style={styles.container}>
        <View style={styles.containerAvatarTokenNetworkWithBadge}>
          <AvatarTokenWithNetworkBadge />
        </View>
        <AssetAmount
          amountDisplay={amountDisplay}
          tokenSymbol={ticker}
          styles={styles}
          setIsModalVisible={isRoundedAmount ? setIsModalVisible : null}
        />
        <AssetFiatConversion fiatDisplay={fiatDisplay} styles={styles} />
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
    </AnimatedPulse>
  );
};

export default TokenHero;
