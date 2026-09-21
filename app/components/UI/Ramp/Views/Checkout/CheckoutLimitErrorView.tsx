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
  /** Starts the hosted-widget hand-off. */
  onContinuePress: () => void;
  /** True while the hand-off is in flight; disables the action. */
  isPending: boolean;
}

/**
 * Body of the Checkout sheet when the Coinbase embedded checkout reports a
 * guest-checkout limit and the API attached a hosted-widget fallback: offers
 * to continue with the user's Coinbase account instead of a fixed error.
 */
const CheckoutLimitErrorView = ({
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
        'fiat_on_ramp_aggregator.checkout_continue_with_coinbase_account',
      )}
    </Button>
  </Box>
);

export default CheckoutLimitErrorView;
