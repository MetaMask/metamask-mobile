import React from 'react';
import {
  Button,
  ButtonSize,
  Text,
  TextVariant,
  TextColor,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import ButtonHero from '../../../../../component-library/components-temp/Buttons/ButtonHero';
import { PredictClaimButtonProps } from './PredictActionButtons.types';

const PredictClaimButton: React.FC<PredictClaimButtonProps> = ({
  amount,
  onPress,
  disabled = false,
  testID = 'predict-claim-button',
}) => {
  const tw = useTailwind();

  if (amount === undefined) {
    return (
      <Button
        size={ButtonSize.Lg}
        onPress={onPress}
        isDisabled={disabled}
        testID={testID}
        style={tw.style('w-full')}
      >
        {strings('predict.claim_winnings_text')}
      </Button>
    );
  }

  return (
    <ButtonHero
      size={ButtonSize.Lg}
      onPress={onPress}
      isDisabled={disabled}
      testID={testID}
      style={tw.style('w-full')}
    >
      <Text variant={TextVariant.BodyMd} color={TextColor.PrimaryInverse}>
        {strings('predict.claim_amount_text', {
          amount: amount.toFixed(2),
        })}
      </Text>
    </ButtonHero>
  );
};

export default PredictClaimButton;
