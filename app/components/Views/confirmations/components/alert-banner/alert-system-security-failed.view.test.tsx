import '../../../../../../tests/component-view/mocks';
import React from 'react';
import { merge } from 'lodash';

import { renderComponentViewScreen } from '../../../../../../tests/component-view/render';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import { typedSignV1ConfirmationState } from '../../../../../util/test/confirm-data-helpers';
import {
  ConfirmationTopSheetSelectorsIDs,
  ConfirmationTopSheetSelectorsText,
} from '../../ConfirmationView.testIds';
import { AlertsContextProvider } from '../../context/alert-system-context';
import useBlockaidAlerts from '../../hooks/alerts/useBlockaidAlerts';
import AlertBanner from './alert-banner';
import { Reason, ResultType } from '../blockaid-banner/BlockaidBanner.types';

/** Matches `messageParams.requestId` on the typed-sign fixture (ppom / security alert key). */
const TYPED_SIGN_SECURITY_ALERT_KEY = '2453610887';

/** No `req`/`chainId` so `BlockaidAlertContent` skips gzip (view env has no native gzip). */
const securityValidationFailedResponse = {
  result_type: ResultType.Failed,
  reason: Reason.failed,
  features: [] as string[],
};

/**
 * Blockaid alerts only (same source as the first slice of `useConfirmationAlerts` for this state).
 * Skips transaction-alert hooks that need QueryClient, hardware wallet, etc.
 */
function BlockaidAlertBannerHarness() {
  const alerts = useBlockaidAlerts();
  return (
    <AlertsContextProvider alerts={alerts}>
      <AlertBanner />
    </AlertsContextProvider>
  );
}

describeForPlatforms('Alert system (signatures)', () => {
  /**
   * Smoke `alert-system`: security validation API error shows the redesigned banner
   * and failed-state copy (no signing success path).
   */
  it('shows security alert when validation request fails', () => {
    const state = merge({}, typedSignV1ConfirmationState, {
      securityAlerts: {
        alerts: {
          [TYPED_SIGN_SECURITY_ALERT_KEY]: securityValidationFailedResponse,
        },
      },
      engine: {
        backgroundState: {
          PreferencesController: {
            securityAlertsEnabled: true,
          },
        },
      },
    });

    const { getByTestId, getByText } = renderComponentViewScreen(
      BlockaidAlertBannerHarness,
      { name: 'SecurityValidationFailed' },
      { state },
    );

    expect(
      getByTestId(
        ConfirmationTopSheetSelectorsIDs.SECURITY_ALERT_BANNER_REDESIGNED,
      ),
    ).toBeOnTheScreen();
    expect(
      getByText(ConfirmationTopSheetSelectorsText.BANNER_FAILED_TITLE),
    ).toBeOnTheScreen();
    expect(
      getByText(ConfirmationTopSheetSelectorsText.BANNER_FAILED_DESCRIPTION),
    ).toBeOnTheScreen();
  });
});
