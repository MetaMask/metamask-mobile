import React from 'react';
import { ActivityIndicator } from 'react-native';
import {
  Button,
  ButtonSize,
  Text,
  TextVariant,
  TextColor,
  Box,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import SensitiveText, {
  SensitiveTextLength,
} from '../../../../../component-library/components/Texts/SensitiveText';
import { TextVariant as ComponentTextVariant } from '../../../../../component-library/components/Texts/Text/Text.types';
import ButtonHero from '../../../../../component-library/components-temp/Buttons/ButtonHero';
import { PredictClaimButtonProps } from './PredictActionButtons.types';

const LoadingContent = () => (
  <Box twClassName="flex-row items-center gap-1">
    <ActivityIndicator color="white" size="small" />
    <Text variant={TextVariant.BodyMd} color={TextColor.PrimaryInverse}>
      {strings('predict.claiming_text')}
    </Text>
  </Box>
);

const PredictClaimButton: React.FC<PredictClaimButtonProps> = ({
  amount,
  onPress,
  disabled = false,
  isLoading = false,
  isHidden = false,
  testID = 'predict-claim-button',
}) => {
  const tw = useTailwind();

  if (amount === undefined) {
    return (
      <Button
        size={ButtonSize.Lg}
        onPress={onPress}
        isDisabled={disabled || isLoading}
        testID={testID}
        style={tw.style('w-full')}
      >
        {isLoading ? (
          <LoadingContent />
        ) : (
          strings('predict.claim_winnings_text')
        )}
      </Button>
    );
  }

  const amountLabel = strings('predict.claim_amount_text', {
    amount: amount.toFixed(2),
  });

  return (
    <ButtonHero
      size={ButtonSize.Lg}
      onPress={onPress}
      isDisabled={disabled || isLoading}
      testID={testID}
      style={tw.style('w-full')}
    >
      {isLoading ? (
        <LoadingContent />
      ) : isHidden ? (
        <SensitiveText
          variant={ComponentTextVariant.BodyMD}
          color="white"
          isHidden={isHidden}
          length={SensitiveTextLength.Medium}
        >
          {amountLabel}
        </SensitiveText>
      ) : (
        <Text variant={TextVariant.BodyMd} color={TextColor.PrimaryInverse}>
          {amountLabel}
        </Text>
      )}
    </ButtonHero>
  );
};

export default PredictClaimButton;
