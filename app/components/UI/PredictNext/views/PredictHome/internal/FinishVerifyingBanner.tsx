import React from 'react';
import {
  Card,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

import { strings } from '../../../../../../../locales/i18n';
import { PredictHomeTestIds } from '../PredictHome.testIds';

interface FinishVerifyingBannerProps {
  /** Resumes the existing Account Setup flow. */
  onPress: () => void;
  /** Intrinsically unavailable while a setup flow is already opening. */
  isDisabled?: boolean;
}

/** Whole-card resume for an identity that has started Kalshi verification. */
export const FinishVerifyingBanner = ({
  onPress,
  isDisabled = false,
}: FinishVerifyingBannerProps) => {
  const title = strings(
    'predict_next.account_readiness.finish_verifying.title',
  );
  const body = strings('predict_next.account_readiness.finish_verifying.body');
  const action = strings(
    'predict_next.account_readiness.finish_verifying.action',
  );

  return (
    <Card
      accessibilityLabel={`${title}. ${body} ${action}.`}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      disabled={isDisabled}
      isInteractive
      onPress={onPress}
      testID={PredictHomeTestIds.FINISH_VERIFYING_BANNER}
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
