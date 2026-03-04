import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
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
import { TooltipModal } from '../UI/Tooltip/Tooltip';
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
    <Text
      // @ts-expect-error - React Native style type mismatch due to outdated @types/react-native
      // See: https://github.com/MetaMask/metamask-mobile/pull/18956#discussion_r2316407382
      style={styles.assetAmountText}
      variant={TextVariant.HeadingLG}
    >
      {amount}{' '}
      <Text
        // @ts-expect-error - React Native style type mismatch due to outdated @types/react-native
        // See: https://github.com/MetaMask/metamask-mobile/pull/18956#discussion_r2316407382
        style={isUnknownToken && styles.assetTextUnknown}
        variant={TextVariant.HeadingLG}
      >
        {displayName}
      </Text>
    </Text>
  );
};

const HeroTokenHorizontal = ({ amountWei }: { amountWei?: string }) => {
  const { isTransactionValueUpdating } = useConfirmationContext();
  const { styles } = useStyles(styleSheet, {
    isFullScreenConfirmation: false,
    layout: 'horizontal',
  });
  const { maxValueMode } = useMaxValueMode();
  const [isModalVisible, setIsModalVisible] = useState(false);

  const { amountPrecise, amount, fiat, isNative } = useTokenAmount({
    amountWei,
  });
  const isRoundedAmount = amountPrecise !== amount;

  return (
    <AnimatedPulse
      isPulsing={isTransactionValueUpdating}
      preventPulse={!maxValueMode || !isNative}
    >
      <View style={styles.horizontalContainer}>
        <View style={styles.textContainer}>
          <Text style={styles.label} variant={TextVariant.BodyMD}>
            {strings('confirm.label.sending')}
          </Text>
          {isRoundedAmount ? (
            <TouchableOpacity onPress={() => setIsModalVisible(true)}>
              <AssetAmount
                amount={amount}
                styles={{ ...styles, assetAmountText: styles.amountTextLeft }}
              />
            </TouchableOpacity>
          ) : (
            <AssetAmount
              amount={amount}
              styles={{ ...styles, assetAmountText: styles.amountTextLeft }}
            />
          )}
          {fiat && (
            <Text style={styles.fiatTextLeft} variant={TextVariant.BodyMD}>
              {fiat}
            </Text>
          )}
        </View>
        <View style={styles.iconContainer}>
          <AvatarTokenWithNetworkBadge />
        </View>
      </View>
      {isRoundedAmount && (
        <TooltipModal
          open={isModalVisible}
          setOpen={setIsModalVisible}
          content={amountPrecise}
          title={strings('send.amount')}
          tooltipTestId="token-hero-amount"
        />
      )}
    </AnimatedPulse>
  );
};

interface HeroTokenProps {
  amountWei?: string;
  layout?: 'default' | 'horizontal';
}

export const HeroToken = ({
  amountWei,
  layout = 'default',
}: HeroTokenProps) => {
  const { isTransactionValueUpdating } = useConfirmationContext();
  const { isFullScreenConfirmation } = useFullScreenConfirmation();
  const { styles } = useStyles(styleSheet, {
    isFullScreenConfirmation,
    layout,
  });
  const { maxValueMode } = useMaxValueMode();

  const { amountPrecise, amount, fiat, isNative } = useTokenAmount({
    amountWei,
  });
  const isRoundedAmount = amountPrecise !== amount;

  if (layout === 'horizontal') {
    return <HeroTokenHorizontal amountWei={amountWei} />;
  }

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
