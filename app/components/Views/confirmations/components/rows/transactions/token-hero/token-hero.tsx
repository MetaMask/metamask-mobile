import React from 'react';
import { StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../../../locales/i18n';
import Text, {
  TextVariant,
} from '../../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../../../component-library/hooks';
import { selectTransactionState } from '../../../../../../../reducers/transaction';
import { selectShowFiatInTestnets } from '../../../../../../../selectors/settings';
import { useConfirmationContext } from '../../../../context/confirmation-context';
import { useFlatConfirmation } from '../../../../hooks/ui/useFlatConfirmation';
import { useTokenAsset } from '../../../../hooks/useTokenAsset';
import { useTokenAmount } from '../../../../hooks/useTokenAmount';
import { Hero } from '../../../hero';
import AnimatedPulse from '../../../UI/animated-pulse';
import { AvatarTokenWithNetworkBadge } from './avatar-token-with-network-badge';
import styleSheet from './token-hero.styles';

const AssetAmount = ({
  amount,
  styles,
}: {
  amount?: string;
  styles: StyleSheet.NamedStyles<Record<string, unknown>>;
}) => {
  const { displayName } = useTokenAsset();
  const isUnknownToken = displayName === strings('token.unknown');

  return (
    <Text style={styles.assetAmountText} variant={TextVariant.HeadingLG}>
      {amount}{' '}
      <Text
        style={isUnknownToken && styles.assetTextUnknown}
        variant={TextVariant.HeadingLG}
      >
        {displayName}
      </Text>
    </Text>
  );
};

const TokenHero = ({ amountWei }: { amountWei?: string }) => {
  const { isTransactionValueUpdating } = useConfirmationContext();
  const { isFlatConfirmation } = useFlatConfirmation();
  const { styles } = useStyles(styleSheet, {
    isFlatConfirmation,
  });

  const { maxValueMode } = useSelector(selectTransactionState);
  const showFiatOnTestnets = useSelector(selectShowFiatInTestnets);

  const { amountPrecise, amount, fiat } = useTokenAmount({ amountWei });
  const isRoundedAmount = amountPrecise !== amount;

  return (
    <AnimatedPulse
      isPulsing={isTransactionValueUpdating}
      preventPulse={!maxValueMode}
    >
      <Hero
        componentAsset={<AvatarTokenWithNetworkBadge />}
        title={<AssetAmount amount={amount} styles={styles} />}
        subtitle={showFiatOnTestnets ? fiat : undefined}
        tooltipModalProps={{
          content: amountPrecise,
          isEnabled: isRoundedAmount,
          hasTooltip: true,
          testId: 'token-hero-amount',
          title: strings('send.amount'),
        }}
      />
    </AnimatedPulse>
  );
};

export default TokenHero;
