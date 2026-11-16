import React, { useState } from 'react';
import { fireEvent } from '@testing-library/react-native';
import { TransactionType } from '@metamask/transaction-controller';

import { strings } from '../../../../../../../locales/i18n';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { PerpsReceiveToSelectorsIDs } from '../../../ConfirmationView.testIds';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import {
  DEFAULT_PERPS_RECEIVE_DESTINATION,
  PerpsReceiveToRow,
  type PerpsReceiveDestination,
} from './perps-receive-to-row';

/**
 * Unit coverage, not a component-view test. The row is local UI on the deposit
 * confirmation: choosing a destination does not write Redux, call a controller,
 * or navigate. A view test would have to boot the pay-quote confirmation screen
 * for behavior this component does not own.
 */

jest.mock('react-native-device-info', () => ({
  getVersion: () => '99.0.0',
}));

jest.mock('../../../hooks/transactions/useTransactionMetadataRequest');

const mockUseTransactionMetadataRequest = jest.mocked(
  useTransactionMetadataRequest,
);

const ORIGINAL_CONFIRMATION_ENV =
  process.env.MM_PERPS_LIGHTER_CONFIRMATION_ENABLED;
const ORIGINAL_PROVIDER_ENV = process.env.MM_PERPS_LIGHTER_PROVIDER_ENABLED;

function ControlledRow() {
  const [destination, setDestination] = useState<PerpsReceiveDestination>(
    DEFAULT_PERPS_RECEIVE_DESTINATION,
  );
  return (
    <PerpsReceiveToRow
      destination={destination}
      onDestinationChange={setDestination}
    />
  );
}

function renderRow(
  remoteEnabled: boolean | undefined = true,
  transactionType: TransactionType = TransactionType.perpsDeposit,
) {
  mockUseTransactionMetadataRequest.mockReturnValue({
    id: 'tx-1',
    type: transactionType,
  } as never);

  const remoteFeatureFlags = {
    ...backgroundState.RemoteFeatureFlagController.remoteFeatureFlags,
    ...(remoteEnabled === undefined
      ? {}
      : {
          perpsLighterProviderEnabled: {
            enabled: remoteEnabled,
            minimumVersion: '0.0.0',
          },
        }),
  };

  return renderWithProvider(<ControlledRow />, {
    state: {
      engine: {
        backgroundState: {
          ...backgroundState,
          RemoteFeatureFlagController: {
            ...backgroundState.RemoteFeatureFlagController,
            remoteFeatureFlags,
          },
        },
      },
    },
  });
}

describe('PerpsReceiveToRow', () => {
  beforeEach(() => {
    process.env.MM_PERPS_LIGHTER_CONFIRMATION_ENABLED = 'true';
    process.env.MM_PERPS_LIGHTER_PROVIDER_ENABLED = 'true';
  });

  afterEach(() => {
    process.env.MM_PERPS_LIGHTER_CONFIRMATION_ENABLED =
      ORIGINAL_CONFIRMATION_ENV;
    process.env.MM_PERPS_LIGHTER_PROVIDER_ENABLED = ORIGINAL_PROVIDER_ENV;
  });

  it('selects Lighter in the sheet and updates the row label only', () => {
    const { getByLabelText, getByTestId, getByText, queryByTestId } =
      renderRow();

    expect(getByText(strings('confirm.label.to'))).toBeOnTheScreen();
    expect(
      getByLabelText(
        `${strings('confirm.label.to')}, ${strings(
          'confirm.perps_receive_to.hyperliquid',
        )}, $4,892.06`,
      ),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('confirm.perps_receive_to.hyperliquid')),
    ).toBeOnTheScreen();
    // The visual balance line is accessibility-hidden so VoiceOver does not repeat it.
    expect(
      getByText('($4,892.06)', { includeHiddenElements: true }),
    ).toBeOnTheScreen();

    fireEvent.press(getByTestId(PerpsReceiveToSelectorsIDs.ROW));

    expect(getByTestId(PerpsReceiveToSelectorsIDs.SHEET)).toBeOnTheScreen();
    expect(
      getByText(strings('confirm.perps_receive_to.section')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('confirm.perps_receive_to.default')),
    ).toBeOnTheScreen();
    expect(
      getByText(
        strings('confirm.perps_receive_to.available', { amount: '$4,892.06' }),
      ),
    ).toBeOnTheScreen();
    expect(
      getByText(
        strings('confirm.perps_receive_to.available', { amount: '$4,718.18' }),
      ),
    ).toBeOnTheScreen();

    fireEvent.press(
      getByTestId(`${PerpsReceiveToSelectorsIDs.OPTION}-lighter`),
    );

    expect(queryByTestId(PerpsReceiveToSelectorsIDs.SHEET)).toBeNull();
    expect(
      getByText(strings('confirm.perps_receive_to.lighter')),
    ).toBeOnTheScreen();
    expect(
      getByText('($4,718.18)', { includeHiddenElements: true }),
    ).toBeOnTheScreen();
    expect(
      getByLabelText(
        `${strings('confirm.label.to')}, ${strings(
          'confirm.perps_receive_to.lighter',
        )}, $4,718.18`,
      ),
    ).toBeOnTheScreen();
  });

  it('renders nothing when the confirmation env is off', () => {
    process.env.MM_PERPS_LIGHTER_CONFIRMATION_ENABLED = 'false';

    const { queryByTestId } = renderRow();

    expect(queryByTestId(PerpsReceiveToSelectorsIDs.ROW)).toBeNull();
  });

  it('renders nothing when the provider env is off', () => {
    process.env.MM_PERPS_LIGHTER_PROVIDER_ENABLED = 'false';

    const { queryByTestId } = renderRow();

    expect(queryByTestId(PerpsReceiveToSelectorsIDs.ROW)).toBeNull();
  });

  it('renders nothing when the provider feature flag is off', () => {
    const { queryByTestId } = renderRow(false);

    expect(queryByTestId(PerpsReceiveToSelectorsIDs.ROW)).toBeNull();
  });

  it('renders nothing when the transaction is not a perps deposit', () => {
    const { queryByTestId } = renderRow(true, TransactionType.simpleSend);

    expect(queryByTestId(PerpsReceiveToSelectorsIDs.ROW)).toBeNull();
  });
});
