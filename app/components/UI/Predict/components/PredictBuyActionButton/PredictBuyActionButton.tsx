import React from 'react';
import {
  Box,
  ButtonSize as ButtonSizeHero,
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
} from '../../../../../component-library/components/Buttons/Button';
import ButtonHero from '../../../../../component-library/components-temp/Buttons/ButtonHero';
import { strings } from '../../../../../../locales/i18n';
import { formatCents } from '../../utils/format';

interface PredictBuyActionButtonProps {
  isLoading: boolean;
  onPress: () => void;
  disabled: boolean;
  showReducedOpacity: boolean;
  outcomeTokenTitle: string;
  sharePrice: number;
  testID?: string;
}

const PredictBuyActionButton = ({
  isLoading,
  onPress,
  disabled,
  showReducedOpacity,
  outcomeTokenTitle,
  sharePrice,
  testID,
}: PredictBuyActionButtonProps) => {
  const tw = useTailwind();

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
        {outcomeTokenTitle} · {formatCents(sharePrice)}
      </Text>
    </ButtonHero>
  );
};

export default PredictBuyActionButton;
