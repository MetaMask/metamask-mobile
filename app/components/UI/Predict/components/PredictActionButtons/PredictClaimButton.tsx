import React from 'react';
import { ActivityIndicator } from 'react-native';
import {
  Button,
  ButtonVariant,
  ButtonSize,
  Text,
  TextVariant,
  TextColor,
  Box,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { useTheme } from '../../../../../util/theme';
import BoxGlass from '../../../../../component-library/components-temp/BoxGlass';

import SensitiveText, {
  SensitiveTextLength,
} from '../../../../../component-library/components/Texts/SensitiveText';
import {
  TextVariant as ComponentTextVariant,
  TextColor as ComponentTextColor,
} from '../../../../../component-library/components/Texts/Text/Text.types';
import { PredictClaimButtonProps } from './PredictActionButtons.types';
import { PREDICT_CLAIM_BUTTON_TEST_IDS } from './PredictClaimButton.testIds';

const LoadingContent = () => (
  <Box twClassName="flex-row items-center gap-1">
    <ActivityIndicator color={useTheme().colors.primary.inverse} size="small" />
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
        color={ComponentTextColor.Inverse}
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
  isGlass = false,
  testID = PREDICT_CLAIM_BUTTON_TEST_IDS.PREDICT_CLAIM_BUTTON,
}) => {
  const isDisabled = disabled || isLoading;

  const withGlass = (button: React.ReactElement) =>
    isGlass ? (
      <BoxGlass radiusClassName="rounded-full" isInteractive={!isDisabled}>
        {button}
      </BoxGlass>
    ) : (
      button
    );

  if (amount === undefined) {
    return withGlass(
      <Button
        variant={ButtonVariant.Primary}
        size={ButtonSize.Lg}
        onPress={onPress}
        isDisabled={isDisabled}
        testID={testID}
        isFullWidth
      >
        {isLoading ? (
          <LoadingContent />
        ) : (
          strings('predict.claim_winnings_text')
        )}
      </Button>,
    );
  }

  const amountLabel = strings('predict.claim_amount_text', {
    amount: amount.toFixed(2),
  });

  return withGlass(
    <Button
      variant={ButtonVariant.Primary}
      size={ButtonSize.Lg}
      onPress={onPress}
      isDisabled={isDisabled}
      testID={testID}
      isFullWidth
    >
      {isLoading ? (
        <LoadingContent />
      ) : (
        <AmountLabel label={amountLabel} isHidden={isHidden} />
      )}
    </Button>,
  );
};

export default PredictClaimButton;
