/**
 * Component-view coverage for smoke `gas-fee-tokens-eip-7702-sponsored`:
 * (1) Activity / transaction details show Failed from `TransactionMeta.status` (not a hardcoded StatusText prop);
 * (2) Review-step "Paid by MetaMask" gas row when sponsorship is allowed.
 */
import '../../../../../../tests/component-view/mocks';
import React from 'react';
import { cloneDeep } from 'lodash';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { TransactionStatus } from '@metamask/transaction-controller';
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
import { TransactionDetailsStatusRow } from './transaction-details-status-row/transaction-details-status-row';
import { strings } from '../../../../../../locales/i18n';

const STAKING_TX_ID = '699ca2f0-e459-11ef-b6f6-d182277cf5e1';

function relayFailedActivityState() {
  const state = cloneDeep(stakingDepositConfirmationState);
  const tx = state.engine.backgroundState.TransactionController.transactions[0];
  tx.status = TransactionStatus.failed;
  tx.error = {
    name: 'JsonRpcError',
    message: 'Relay submission failed',
  };
  return state;
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
  'EIP-7702 sponsored send — relay API failure (activity / details status)',
  () => {
    it('maps failed transaction in state to Failed label and error tooltip (transaction details)', async () => {
      const { getByText, getByTestId } = renderComponentViewScreen(
        TransactionDetailsStatusRow,
        { name: 'Eip7702RelayApiFailureActivity' },
        { state: relayFailedActivityState() },
        { transactionId: STAKING_TX_ID },
      );

      await waitFor(() =>
        expect(getByText(strings('transaction.failed'))).toBeOnTheScreen(),
      );

      fireEvent.press(getByTestId('status-tooltip-open-btn'));

      expect(getByText('Relay submission failed')).toBeOnTheScreen();
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
