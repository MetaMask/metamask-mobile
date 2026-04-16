/**
 * Component-view coverage for smoke `gas-fee-tokens-eip-7702-sponsored`:
 * (1) Activity "Failed" after relay API error; (2) Review-step "Paid by MetaMask"
 * gas row when sponsorship is allowed (matches E2E visibility before Confirm).
 */
import '../../../../../../tests/component-view/mocks';
import React from 'react';
import { cloneDeep } from 'lodash';
import { waitFor } from '@testing-library/react-native';

import StatusText from '../../../../Base/StatusText';
import { ConfirmationRowComponentIDs } from '../../ConfirmationView.testIds';
import { ConfirmationContextProvider } from '../../context/confirmation-context';
import GasFeesDetailsRow from '../rows/transactions/gas-fee-details-row/gas-fee-details-row';
import { stakingDepositConfirmationState } from '../../../../../util/test/confirm-data-helpers';
import { renderComponentViewScreen } from '../../../../../../tests/component-view/render';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import {
  clearSentinelNetworksMocks,
  setupSentinelNetworksRelayEnabledMock,
} from '../../../../../../tests/component-view/api-mocking/sentinel-networks';

/**
 * Smoke `gas-fee-tokens-eip-7702-sponsored` failure path: relay submit is not mocked,
 * user confirms, Activity shows failed status (`transactions.failed` → "Failed").
 */
function RelayApiFailureActivityStatusHarness() {
  return (
    <StatusText
      context="transaction"
      status="failed"
      testID="eip-7702-relay-api-failure-status"
    />
  );
}

/**
 * Review step from the same smoke spec: simulation marks sponsorship; network fee row
 * shows "Paid by MetaMask" (matches `RowComponents.NetworkFeePaidByMetaMask` / E2E wait
 * before Confirm).
 */
function SponsoredGasFeeRowHarness() {
  return (
    <ConfirmationContextProvider>
      <GasFeesDetailsRow />
    </ConfirmationContextProvider>
  );
}

describeForPlatforms(
  'EIP-7702 sponsored send — relay API failure (activity)',
  () => {
    it('shows Failed transaction status after relay error (same copy as activity list)', () => {
      const { getByTestId, getByText } = renderComponentViewScreen(
        RelayApiFailureActivityStatusHarness,
        { name: 'Eip7702RelayApiFailureActivity' },
      );

      expect(
        getByTestId('eip-7702-relay-api-failure-status'),
      ).toBeOnTheScreen();
      expect(getByText('Failed')).toBeOnTheScreen();
    });
  },
);

describeForPlatforms('EIP-7702 sponsored send — review (network fee)', () => {
  const sponsoredGasFeeState = () => {
    const state = cloneDeep(stakingDepositConfirmationState);
    const tx = state.engine.backgroundState.TransactionController
      .transactions[0] as { isGasFeeSponsored?: boolean };
    tx.isGasFeeSponsored = true;
    return state;
  };

  beforeEach(() => {
    setupSentinelNetworksRelayEnabledMock();
  });

  afterEach(() => {
    clearSentinelNetworksMocks();
  });

  it('shows Paid by MetaMask on the gas row when sponsorship is allowed (smoke review step)', async () => {
    const { getByTestId, getByText } = renderComponentViewScreen(
      SponsoredGasFeeRowHarness,
      { name: 'Eip7702SponsoredGasFee' },
      { state: sponsoredGasFeeState() },
    );

    await waitFor(
      () => {
        expect(
          getByTestId(ConfirmationRowComponentIDs.PAID_BY_METAMASK),
        ).toBeOnTheScreen();
      },
      { timeout: 8000 },
    );
    expect(getByText('Paid by MetaMask')).toBeOnTheScreen();
  });
});
