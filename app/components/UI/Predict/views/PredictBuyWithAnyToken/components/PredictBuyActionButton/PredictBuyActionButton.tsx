import React from 'react';
import {
  Box,
  Button,
  ButtonSize,
  ButtonSize as ButtonSizeHero,
  ButtonVariant,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { ActivityIndicator } from 'react-native';
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
  testID,
}: PredictBuyActionButtonProps) => {
  const tw = useTailwind();

  if (isLoading) {
    return (
      <Button
        variant={ButtonVariant.Primary}
        onPress={onPress}
        size={ButtonSize.Lg}
        isFullWidth
        style={tw.style('opacity-50')}
        isDisabled
      >
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
      </Button>
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
        {isSheetMode
          ? strings('predict.order.confirm')
          : `${outcomeTokenTitle} · ${formatCents(sharePrice)}`}
      </Text>
    </ButtonHero>
  );
};

export default PredictBuyActionButton;
