import React from 'react';
import {
  Box,
  Button,
  ButtonBaseSize,
  ButtonVariant,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

import { strings } from '../../../../../../locales/i18n';

export interface CheckoutLimitErrorViewProps {
  providerName: string;
  onContinuePress: () => void;
  isPending: boolean;
}

/** Checkout sheet body for a per-user limit error with a hosted-widget fallback. */
const CheckoutLimitErrorView = ({
  providerName,
  onContinuePress,
  isPending,
}: CheckoutLimitErrorViewProps) => (
  <Box twClassName="items-center px-4">
    <Text
      variant={TextVariant.BodyMd}
      color={TextColor.TextAlternative}
      twClassName="text-center mb-6"
    >
      {strings(
        'fiat_on_ramp_aggregator.checkout_guest_limit_reached_description',
        { provider: providerName },
      )}
    </Text>
    <Button
      variant={ButtonVariant.Primary}
      size={ButtonBaseSize.Lg}
      onPress={onContinuePress}
      isLoading={isPending}
      isFullWidth
    >
      {strings(
        'fiat_on_ramp_aggregator.checkout_continue_with_provider_account',
        { provider: providerName },
      )}
    </Button>
  </Box>
);

export default CheckoutLimitErrorView;
