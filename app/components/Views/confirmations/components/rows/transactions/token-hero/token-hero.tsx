import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../../../locales/i18n';
import Text, {
  TextVariant,
} from '../../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../../../component-library/hooks';
import { selectTransactionState } from '../../../../../../../reducers/transaction';
import useHideFiatForTestnet from '../../../../../../hooks/useHideFiatForTestnet';
import { useConfirmationContext } from '../../../../context/confirmation-context';
import { useFlatConfirmation } from '../../../../hooks/ui/useFlatConfirmation';
import { useTokenAsset } from '../../../../hooks/useTokenAsset';
import { useTokenAmount } from '../../../../hooks/useTokenAmount';
import AnimatedPulse from '../../../UI/animated-pulse';
import { TooltipModal } from '../../../UI/Tooltip/Tooltip';
import { AvatarTokenWithNetworkBadge } from './avatar-token-with-network-badge';
import styleSheet from './token-hero.styles';

const AssetAmount = ({
  amount,
  setIsModalVisible,
  styles,
}: {
  amount?: string;
  setIsModalVisible: ((isModalVisible: boolean) => void) | null;
  styles: StyleSheet.NamedStyles<Record<string, unknown>>;
}) => {
  const { displayName } = useTokenAsset();
  const isUnknownToken = displayName === strings('token.unknown');

  return (
    <View style={styles.assetAmountContainer}>
      {setIsModalVisible ? (
        <TouchableOpacity onPress={() => setIsModalVisible(true)}>
          <Text style={styles.assetAmountText} variant={TextVariant.HeadingLG}>
            {amount}{' '}
            <Text
              style={isUnknownToken && styles.assetTextUnknown}
              variant={TextVariant.HeadingLG}
            >
              {displayName}
            </Text>
          </Text>
        </TouchableOpacity>
      ) : (
        <Text style={styles.assetAmountText} variant={TextVariant.HeadingLG}>
          {amount}{' '}
          <Text
            style={isUnknownToken && styles.assetTextUnknown}
            variant={TextVariant.HeadingLG}
          >
            {displayName}
          </Text>
        </Text>
      )}
    </View>
  );
};

const AssetFiatConversion = ({
  fiat,
  styles,
}: {
  fiat?: string;
  styles: StyleSheet.NamedStyles<Record<string, unknown>>;
}) => {
  const hideFiatForTestnet = useHideFiatForTestnet();
  if (hideFiatForTestnet || !fiat) {
    return null;
  }

  return (
    <Text style={styles.assetFiatConversionText} variant={TextVariant.BodyMD}>
      {fiat}
    </Text>
  );
};

const TokenHero = ({ amountWei }: { amountWei?: string }) => {
  const [isModalVisible, setIsModalVisible] = useState(false);

  const { isTransactionValueUpdating } = useConfirmationContext();
  const { isFlatConfirmation } = useFlatConfirmation();
  const { maxValueMode } = useSelector(selectTransactionState);
  const { styles } = useStyles(styleSheet, {
    isFlatConfirmation,
  });

  const { amountPrecise, amount, fiat } = useTokenAmount({ amountWei });

  const isRoundedAmount = amountPrecise !== amount;

  return (
    <AnimatedPulse
      isPulsing={isTransactionValueUpdating}
      preventPulse={!maxValueMode}
    >
      <View style={styles.container}>
        <AvatarTokenWithNetworkBadge />
        <AssetAmount
          amount={amount}
          styles={styles}
          setIsModalVisible={isRoundedAmount ? setIsModalVisible : null}
        />
        <AssetFiatConversion fiat={fiat} styles={styles} />
        {isRoundedAmount && (
          <TooltipModal
            open={isModalVisible}
            setOpen={setIsModalVisible}
            content={amountPrecise}
            title={strings('send.amount')}
            tooltipTestId="token-hero-amount"
          />
        )}
      </View>
    </AnimatedPulse>
  );
};

export default TokenHero;
