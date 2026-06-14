import React from 'react';
import {
  Box,
  ButtonSize as ButtonSizeHero,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { ActivityIndicator } from 'react-native';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../../../component-library/components/Buttons/Button';
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
        size={ButtonSizeHero.Lg}
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
        size={ButtonSizeHero.Lg}
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

  if (isLoading) {
    return (
      <Button
        label={
          <Box twClassName="flex-row items-center gap-1">
            <ActivityIndicator size="small" />
            <Text
              variant={TextVariant.BodyLg}
              twClassName="font-medium"
              color={TextColor.PrimaryInverse}
            >
              {`${strings('predict.order.placing_prediction')}...`}
            </Text>
          </Box>
        }
        variant={ButtonVariants.Primary}
        onPress={onPress}
        size={ButtonSize.Lg}
        width={ButtonWidthTypes.Full}
        style={tw.style('opacity-50')}
        disabled
      />
    );
  }

  return (
    <ButtonHero
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      isLoading={isLoading}
      size={ButtonSizeHero.Lg}
      style={tw.style('w-full', showReducedOpacity && 'opacity-50')}
    >
      <Text
        variant={TextVariant.BodyMd}
        style={tw.style('text-white font-medium')}
      >
        {isRetry
          ? strings('predict.order.retry')
          : isSheetMode
            ? strings('predict.order.confirm')
            : `${outcomeTokenTitle} · ${formatCents(sharePrice)}`}
      </Text>
    </ButtonHero>
  );
};

export default PredictBuyActionButton;
