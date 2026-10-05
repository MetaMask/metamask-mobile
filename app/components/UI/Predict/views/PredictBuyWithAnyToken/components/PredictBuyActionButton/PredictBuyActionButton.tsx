import React from 'react';
import {
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import ButtonHero from '../../../../../../../component-library/components-temp/Buttons/ButtonHero';
import { strings } from '../../../../../../../../locales/i18n';
import { formatCents } from '../../../../utils/format';

interface PredictBuyActionButtonProps {
  isLoading: boolean;
  onPress: () => void;
  disabled: boolean;
  showReducedOpacity: boolean;
  outcomeTokenTitle: string;
  sharePrice: number;
  isSheetMode?: boolean;
  isRetry?: boolean;
  isChangePaymentMode?: boolean;
  isAddFundsMode?: boolean;
  testID?: string;
}

const PredictBuyActionButton = ({
  isLoading,
  onPress,
  disabled,
  showReducedOpacity,
  outcomeTokenTitle,
  sharePrice,
  isSheetMode = false,
  isRetry = false,
  isChangePaymentMode = false,
  isAddFundsMode = false,
  testID,
}: PredictBuyActionButtonProps) => {
  const tw = useTailwind();

  if (isChangePaymentMode) {
    return (
      <ButtonHero
        testID={testID}
        onPress={onPress}
        size={ButtonSize.Lg}
        twClassName="w-full"
      >
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          color={TextColor.PrimaryInverse}
        >
          {strings('predict.payment.change_payment_method')}
        </Text>
      </ButtonHero>
    );
  }

  if (isAddFundsMode) {
    return (
      <ButtonHero
        testID={testID}
        onPress={onPress}
        size={ButtonSize.Lg}
        style={tw.style('w-full bg-muted')}
      >
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.ErrorDefault}
          fontWeight={FontWeight.Medium}
        >
          {strings('predict.payment.add_funds')}
        </Text>
      </ButtonHero>
    );
  }

  const actionLabel = isRetry
    ? strings('predict.order.retry')
    : isSheetMode
      ? strings('predict.order.confirm')
      : `${outcomeTokenTitle} · ${formatCents(sharePrice)}`;

  return (
    <Button
      testID={testID}
      variant={ButtonVariant.Primary}
      size={ButtonSize.Lg}
      isFullWidth
      isDisabled={disabled || isLoading}
      isLoading={isLoading}
      loadingText={`${strings('predict.order.placing_prediction')}...`}
      onPress={onPress}
      style={showReducedOpacity ? tw.style('opacity-50') : undefined}
    >
      {actionLabel}
    </Button>
  );
};

export default PredictBuyActionButton;
