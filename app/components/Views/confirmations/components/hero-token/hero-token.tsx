import React from 'react';
import { StyleSheet } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks';
import { useConfirmationContext } from '../../context/confirmation-context';
import { useFullScreenConfirmation } from '../../hooks/ui/useFullScreenConfirmation';
import { useMaxValueMode } from '../../hooks/useMaxValueMode';
import { useTokenAsset } from '../../hooks/useTokenAsset';
import { useTokenAmount } from '../../hooks/useTokenAmount';
import { Hero } from '../UI/hero';
import AnimatedPulse from '../UI/animated-pulse';
import { AvatarTokenWithNetworkBadge } from './avatar-token-with-network-badge';
import styleSheet from './hero-token.styles';

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

export const HeroToken = ({ amountWei }: { amountWei?: string }) => {
  const { isTransactionValueUpdating } = useConfirmationContext();
  const { isFullScreenConfirmation } = useFullScreenConfirmation();
  const { styles } = useStyles(styleSheet, {
    isFullScreenConfirmation,
  });
  const { maxValueMode } = useMaxValueMode();

  const { amountPrecise, amount, fiat, isNative } = useTokenAmount({
    amountWei,
  });
  const isRoundedAmount = amountPrecise !== amount;

  return (
    <AnimatedPulse
      isPulsing={isTransactionValueUpdating}
      preventPulse={!maxValueMode || !isNative}
    >
      <Hero
        componentAsset={<AvatarTokenWithNetworkBadge />}
        hasPaddingTop={isFullScreenConfirmation}
        title={<AssetAmount amount={amount} styles={styles} />}
        subtitle={fiat}
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
