import React from 'react';
import {
  Card,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

import { strings } from '../../../../../../../locales/i18n';
import type {
  AccountReadinessProblem,
  AccountSetupIntent,
} from '../../../onboarding/accountReadiness.types';
import { PredictHomeTestIds } from '../PredictHome.testIds';

const COPY_GROUP: Record<
  AccountReadinessProblem,
  | 'activation_required'
  | 'verification_failed'
  | 'cancelled'
  | 'status_unavailable'
> = {
  activation_required: 'activation_required',
  verification_failed: 'verification_failed',
  cancelled: 'cancelled',
  status_unsupported: 'status_unavailable',
  status_inconsistent: 'status_unavailable',
  setup_unavailable: 'status_unavailable',
};

interface AccountSetupActionRequiredBannerProps {
  reason: AccountReadinessProblem;
  /** The setup action Kalshi's state asks for. */
  intent: AccountSetupIntent;
  onPress: () => void;
  /** Intrinsically unavailable while a setup flow is already opening. */
  isDisabled?: boolean;
}

/**
 * Whole-card action for an account that needs the user. There is no visible
 * CTA or close; the accessible label carries the action in reading order.
 */
export const AccountSetupActionRequiredBanner = ({
  reason,
  onPress,
  isDisabled = false,
}: AccountSetupActionRequiredBannerProps) => {
  const group = COPY_GROUP[reason];
  const title = strings(`predict_next.account_readiness.${group}.title`);
  const body = strings(`predict_next.account_readiness.${group}.body`);
  const action = strings(`predict_next.account_readiness.${group}.action`);

  return (
    <Card
      accessibilityLabel={`${title}. ${body} ${action}.`}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      disabled={isDisabled}
      isInteractive
      onPress={onPress}
      testID={PredictHomeTestIds.ACCOUNT_SETUP_ACTION_REQUIRED_BANNER}
      twClassName="gap-1 rounded-xl px-4 py-3"
    >
      <Text
        accessibilityRole="header"
        fontWeight={FontWeight.Medium}
        variant={TextVariant.BodyMd}
      >
        {title}
      </Text>
      <Text color={TextColor.TextAlternative} variant={TextVariant.BodySm}>
        {body}
      </Text>
    </Card>
  );
};
