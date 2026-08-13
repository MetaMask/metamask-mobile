import { Box } from '@metamask/design-system-react-native';
import React from 'react';

export interface QuickBuyDisabledSectionProps {
  /** When true, dims the subtree and blocks all touches inside it. */
  isDisabled: boolean;
  children: React.ReactNode;
}

/**
 * Renders a region of the Quick Buy sheet as visibly inert.
 *
 * Used when the account holds nothing to pay with (TSA-984): no quote can be
 * requested, so amount entry, the quick-amount pills and the Pay with picker
 * have nothing to act on. Previously they stayed at full opacity while being
 * internally disabled, which read as a frozen sheet — the user tapped and
 * nothing happened, with no indication why.
 *
 * `pointerEvents="none"` is applied on the wrapper rather than threading a
 * `disabled` prop through every descendant, so a control added to a wrapped
 * region later cannot accidentally stay live. It is deliberately a wrapper and
 * not an absolutely-positioned scrim: a scrim would have to be cut around the
 * still-interactive "Add funds" CTA, which no RN primitive expresses reliably.
 */
const QuickBuyDisabledSection: React.FC<QuickBuyDisabledSectionProps> = ({
  isDisabled,
  children,
}) => {
  if (!isDisabled) {
    return <>{children}</>;
  }

  // The subtree is deliberately left in the accessibility tree: it still
  // carries readable information (Pay with, Total), and hiding it wholesale
  // would leave a screen-reader user with a sheet that reads as empty. The
  // individual controls inside opt out via their own `disabled` props, so they
  // announce as unavailable rather than as live buttons that do nothing.
  return (
    <Box
      twClassName="opacity-50"
      pointerEvents="none"
      testID="quick-buy-disabled-section"
    >
      {children}
    </Box>
  );
};

export default QuickBuyDisabledSection;
