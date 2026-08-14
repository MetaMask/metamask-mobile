import React, { useEffect } from 'react';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { CustomAmountInfo } from '../custom-amount-info';
import { strings } from '../../../../../../../locales/i18n';
import useNavbar from '../../../hooks/ui/useNavbar';
import { useParams } from '../../../../../../util/navigation/navUtils';
import { ConfirmationParams } from '../../confirm/confirm-component';
import { MUSD_TOKEN_ASSET_ID_BY_CHAIN } from '../../../../../UI/Earn/constants/musd';
import { useEnsureCompatibleProvider } from '../../../../../UI/Ramp/hooks/useEnsureCompatibleProvider';
import { useABTest } from '../../../../../../hooks/useABTest';
import { useAnalytics } from '../../../../../hooks/useAnalytics/useAnalytics';
import { CONFIRMATION_EVENTS } from '../../../../../../core/Analytics/events/confirmations';
import {
  MONEY_ACCOUNT_DEPOSIT_CONFIRMATION_LOCATION,
  MONEY_ACCOUNT_DEPOSIT_PREFILL_AB_KEY,
  MONEY_ACCOUNT_DEPOSIT_PREFILL_AB_TEST_EXPOSURE_OPTIONS,
  MONEY_ACCOUNT_DEPOSIT_PREFILL_VARIANTS,
} from '../../../hooks/transactions/abTestConfig';

export const MONEY_ACCOUNT_CURRENCY = 'usd';

export function MoneyAccountDepositInfo() {
  useNavbar(strings('confirm.title.money_account_add_money'), true);
  useEnsureCompatibleProvider(MUSD_TOKEN_ASSET_ID_BY_CHAIN[CHAIN_IDS.MONAD]);
  const { preferredPaymentToken } = useParams<ConfirmationParams>({});

  const params = useParams<ConfirmationParams>();
  const autoFiat = params?.autoSelectFiatPayment;

  // Experiment exposure for deposit prefill — fire when this Info confirmation mounts.
  useABTest(
    MONEY_ACCOUNT_DEPOSIT_PREFILL_AB_KEY,
    MONEY_ACCOUNT_DEPOSIT_PREFILL_VARIANTS,
    MONEY_ACCOUNT_DEPOSIT_PREFILL_AB_TEST_EXPOSURE_OPTIONS,
  );

  const { createEventBuilder, trackEvent } = useAnalytics();
  useEffect(() => {
    trackEvent(
      createEventBuilder(CONFIRMATION_EVENTS.SCREEN_VIEWED)
        .addProperties({
          location: MONEY_ACCOUNT_DEPOSIT_CONFIRMATION_LOCATION,
        })
        .build(),
    );
  }, [createEventBuilder, trackEvent]);

  return (
    <CustomAmountInfo
      autoSelectFiatPayment={autoFiat}
      currency={MONEY_ACCOUNT_CURRENCY}
      hideAccountSelector={autoFiat}
      supportAccountSelection
      preferredToken={preferredPaymentToken}
      hasMax
    />
  );
}
