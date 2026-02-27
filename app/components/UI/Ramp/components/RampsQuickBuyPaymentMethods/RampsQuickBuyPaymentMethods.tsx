import React, { useCallback } from 'react';
import { ActivityIndicator } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import useRampsQuickBuy, {
  type RampsQuickBuyOption,
} from '../../hooks/useRampsQuickBuy';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';

export interface RampsQuickBuyPaymentMethodsProps {
  assetId: string;
  amount: string;
  onError?: (errorMessage: string) => void;
  onOptionPress?: (option: RampsQuickBuyOption) => void;
  testID?: string;
}

function RampsQuickBuyPaymentMethods({
  assetId,
  amount,
  onError,
  onOptionPress,
  testID = 'ramps-quick-buy',
}: RampsQuickBuyPaymentMethodsProps) {
  const { paymentOptions, isLoading, error, hasOptions } = useRampsQuickBuy({
    assetId,
    amount,
    onError,
  });

  const handleOptionPress = useCallback(
    (option: RampsQuickBuyOption) => {
      onOptionPress?.(option);
      option.onPress();
    },
    [onOptionPress],
  );

  if (isLoading) {
    return (
      <Box
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        twClassName="py-4"
      >
        <ActivityIndicator testID={`${testID}-loading`} />
      </Box>
    );
  }

  if (error) {
    return (
      <Text variant={TextVariant.BodyMD} testID={`${testID}-error`}>
        {error}
      </Text>
    );
  }

  if (!hasOptions) {
    return (
      <Text
        variant={TextVariant.BodyMD}
        color={TextColor.Alternative}
        testID={`${testID}-empty`}
      >
        {strings('fiat_on_ramp.no_payment_methods_available')}
      </Text>
    );
  }

  return (
    <Box twClassName="gap-2" testID={testID}>
      {paymentOptions.map((option, index) => (
        <Button
          key={`${option.providerId}-${option.paymentMethodId}`}
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={() => handleOptionPress(option)}
          testID={`${testID}-option-${index}`}
        >
          {`${option.paymentMethodName} · ${option.providerName}`}
        </Button>
      ))}
    </Box>
  );
}

export default RampsQuickBuyPaymentMethods;
