import React from 'react';
import { ActivityIndicator } from 'react-native';
import {
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
import { PREDICT_CLAIM_BUTTON_TEST_IDS } from './PredictClaimButton.testIds';

const LoadingContent = () => (
  <Box twClassName="flex-row items-center gap-1">
    <ActivityIndicator color="white" size="small" />
    <Text variant={TextVariant.BodyMd} color={TextColor.PrimaryInverse}>
      {strings('predict.claiming_text')}
    </Text>
  </Box>
);

const AmountLabel = ({
  label,
  isHidden,
}: {
  label: string;
  isHidden: boolean;
}) => {
  if (isHidden) {
    return (
      <SensitiveText
        variant={ComponentTextVariant.BodyMD}
        color="white"
        isHidden={isHidden}
        length={SensitiveTextLength.Medium}
      >
        {label}
      </SensitiveText>
    );
  }

  return (
    <Text variant={TextVariant.BodyMd} color={TextColor.PrimaryInverse}>
      {label}
    </Text>
  );
};

const PredictClaimButton: React.FC<PredictClaimButtonProps> = ({
  amount,
  onPress,
  disabled = false,
  isLoading = false,
  isHidden = false,
  testID = PREDICT_CLAIM_BUTTON_TEST_IDS.PREDICT_CLAIM_BUTTON,
}) => {
  const tw = useTailwind();

  if (amount === undefined) {
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
        ) : (
          strings('predict.claim_winnings_text')
        )}
      </ButtonHero>
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
      ) : (
        <AmountLabel label={amountLabel} isHidden={isHidden} />
      )}
    </ButtonHero>
  );
};

export default PredictClaimButton;
