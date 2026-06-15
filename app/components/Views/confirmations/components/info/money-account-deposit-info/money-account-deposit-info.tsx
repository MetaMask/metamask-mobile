import React, { useEffect, useRef } from 'react';
import { CustomAmountInfo } from '../custom-amount-info';
import { strings } from '../../../../../../../locales/i18n';
import useNavbar from '../../../hooks/ui/useNavbar';
import { useParams } from '../../../../../../util/navigation/navUtils';
import { ConfirmationParams } from '../../confirm/confirm-component';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';
import { useAnalytics } from '../../../../../hooks/useAnalytics/useAnalytics';
import { useRampsUserRegion } from '../../../../../UI/Ramp/hooks/useRampsUserRegion';

export const MONEY_ACCOUNT_CURRENCY = 'usd';

export function MoneyAccountDepositInfo() {
  useNavbar(strings('confirm.title.money_account_add_money'), true);
  const { preferredPaymentToken } = useParams<ConfirmationParams>({});

  const params = useParams<ConfirmationParams>();
  const autoFiat = params?.autoSelectFiatPayment;

  // TRAM-3623 funnel: the amount screen was viewed. This wrapper is
  // money-account-deposit only, so the event is unconditionally tagged with the
  // headless money_account surface (the deposit always leads to the headless
  // buy). Fired once on mount.
  const { trackEvent, createEventBuilder } = useAnalytics();
  const { userRegion } = useRampsUserRegion();
  const region = userRegion?.regionCode ?? '';
  const hasTrackedScreenViewRef = useRef(false);
  useEffect(() => {
    if (hasTrackedScreenViewRef.current) {
      return;
    }
    hasTrackedScreenViewRef.current = true;
    trackEvent(
      createEventBuilder(MetaMetricsEvents.RAMPS_SCREEN_VIEWED)
        .addProperties({
          location: 'Amount Input',
          ramp_type: 'HEADLESS',
          ramp_surface: 'money_account',
          region,
        })
        .build(),
    );
  }, [trackEvent, createEventBuilder, region]);

  return (
    <CustomAmountInfo
      autoSelectFiatPayment={autoFiat}
      currency={MONEY_ACCOUNT_CURRENCY}
      hideAccountSelector={autoFiat}
      supportAccountSelection
      preferredToken={preferredPaymentToken}
    />
  );
}
