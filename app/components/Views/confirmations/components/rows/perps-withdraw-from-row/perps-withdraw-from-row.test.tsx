import React, { useState } from 'react';
import { fireEvent } from '@testing-library/react-native';
import { TransactionType } from '@metamask/transaction-controller';

import { strings } from '../../../../../../../locales/i18n';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { PerpsWithdrawFromSelectorsIDs } from '../../../ConfirmationView.testIds';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import {
  DEFAULT_PERPS_WITHDRAW_SOURCE,
  PerpsWithdrawFromRow,
  type PerpsWithdrawSource,
} from './perps-withdraw-from-row';

/**
 * Unit coverage, not a component-view test. The row is local UI on the
 * withdraw confirmation: choosing a source does not write Redux, call a
 * controller, or navigate. A view test would have to boot the pay-quote
 * confirmation screen for behavior this component does not own.
 */

jest.mock('react-native-device-info', () => ({
  getVersion: () => '99.0.0',
}));

jest.mock('../../../hooks/transactions/useTransactionMetadataRequest');
const mockUsePerpsLiveAccount = jest.fn();
jest.mock('../../../../../UI/Perps/hooks/stream/usePerpsLiveAccount', () => ({
  usePerpsLiveAccount: () => mockUsePerpsLiveAccount(),
}));

const mockUseTransactionMetadataRequest = jest.mocked(
  useTransactionMetadataRequest,
);

const ORIGINAL_CONFIRMATION_ENV =
  process.env.MM_PERPS_LIGHTER_CONFIRMATION_ENABLED;
const ORIGINAL_PROVIDER_ENV = process.env.MM_PERPS_LIGHTER_PROVIDER_ENABLED;

function ControlledRow() {
  const [source, setSource] = useState<PerpsWithdrawSource>(
    DEFAULT_PERPS_WITHDRAW_SOURCE,
  );
  return <PerpsWithdrawFromRow source={source} onSourceChange={setSource} />;
}

function renderRow(
  remoteEnabled: boolean | undefined = true,
  transactionType: TransactionType = TransactionType.perpsWithdraw,
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
          PerpsController: {
            ...backgroundState.PerpsController,
            perpsBalances: {
              lighter: {
                totalBalance: '12.349',
                unrealizedPnl: '0',
                lastUpdated: 1,
              },
            },
          },
          RemoteFeatureFlagController: {
            ...backgroundState.RemoteFeatureFlagController,
            remoteFeatureFlags,
          },
        },
      },
    },
  });
}

describe('PerpsWithdrawFromRow', () => {
  beforeEach(() => {
    process.env.MM_PERPS_LIGHTER_CONFIRMATION_ENABLED = 'true';
    process.env.MM_PERPS_LIGHTER_PROVIDER_ENABLED = 'true';
    mockUsePerpsLiveAccount.mockReturnValue({
      account: { totalBalance: '50.389' },
      isInitialLoading: false,
    });
  });

  afterEach(() => {
    process.env.MM_PERPS_LIGHTER_CONFIRMATION_ENABLED =
      ORIGINAL_CONFIRMATION_ENV;
    process.env.MM_PERPS_LIGHTER_PROVIDER_ENABLED = ORIGINAL_PROVIDER_ENV;
  });

  it('selects Lighter in the sheet and updates the row label only', () => {
    const { getByLabelText, getByTestId, getByText, queryByTestId } =
      renderRow();

    expect(getByText(strings('confirm.label.from'))).toBeOnTheScreen();
    expect(
      getByLabelText(
        `${strings('confirm.label.from')}, ${strings(
          'confirm.perps_withdraw_from.hyperliquid',
        )}, $50.38`,
      ),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('confirm.perps_withdraw_from.hyperliquid')),
    ).toBeOnTheScreen();
    // The visual balance line is accessibility-hidden so VoiceOver does not repeat it.
    expect(
      getByText('($50.38)', { includeHiddenElements: true }),
    ).toBeOnTheScreen();

    fireEvent.press(getByTestId(PerpsWithdrawFromSelectorsIDs.ROW));

    expect(getByTestId(PerpsWithdrawFromSelectorsIDs.SHEET)).toBeOnTheScreen();
    expect(
      getByText(strings('confirm.perps_withdraw_from.section')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('confirm.perps_withdraw_from.default')),
    ).toBeOnTheScreen();
    expect(
      getByText(
        strings('confirm.perps_withdraw_from.available', {
          amount: '$50.38',
        }),
      ),
    ).toBeOnTheScreen();
    expect(
      getByText(
        strings('confirm.perps_withdraw_from.available', {
          amount: '$12.34',
        }),
      ),
    ).toBeOnTheScreen();

    fireEvent.press(
      getByTestId(`${PerpsWithdrawFromSelectorsIDs.OPTION}-lighter`),
    );

    expect(queryByTestId(PerpsWithdrawFromSelectorsIDs.SHEET)).toBeNull();
    expect(
      getByText(strings('confirm.perps_withdraw_from.lighter')),
    ).toBeOnTheScreen();
    expect(
      getByText('($12.34)', { includeHiddenElements: true }),
    ).toBeOnTheScreen();
    expect(
      getByLabelText(
        `${strings('confirm.label.from')}, ${strings(
          'confirm.perps_withdraw_from.lighter',
        )}, $12.34`,
      ),
    ).toBeOnTheScreen();
  });

  it('renders nothing when the confirmation env is off', () => {
    process.env.MM_PERPS_LIGHTER_CONFIRMATION_ENABLED = 'false';

    const { queryByTestId } = renderRow();

    expect(queryByTestId(PerpsWithdrawFromSelectorsIDs.ROW)).toBeNull();
  });

  it('renders nothing when the provider env is off', () => {
    process.env.MM_PERPS_LIGHTER_PROVIDER_ENABLED = 'false';

    const { queryByTestId } = renderRow();

    expect(queryByTestId(PerpsWithdrawFromSelectorsIDs.ROW)).toBeNull();
  });

  it('renders nothing when the provider feature flag is off', () => {
    const { queryByTestId } = renderRow(false);

    expect(queryByTestId(PerpsWithdrawFromSelectorsIDs.ROW)).toBeNull();
  });

  it('stays on screen after the withdraw type switches to Lighter', () => {
    const { getByTestId } = renderRow(
      true,
      TransactionType.perpsLighterWithdraw,
    );

    expect(getByTestId(PerpsWithdrawFromSelectorsIDs.ROW)).toBeOnTheScreen();
  });

  it('renders nothing when the transaction is not a perps withdraw', () => {
    const { queryByTestId } = renderRow(true, TransactionType.perpsDeposit);

    expect(queryByTestId(PerpsWithdrawFromSelectorsIDs.ROW)).toBeNull();
  });

  it('renders nothing on a money account withdraw without PerpsStreamProvider', () => {
    const { usePerpsLiveAccount } = jest.requireActual(
      '../../../../../UI/Perps/hooks/stream/usePerpsLiveAccount',
    );
    mockUsePerpsLiveAccount.mockImplementation(usePerpsLiveAccount);

    const { queryByTestId } = renderRow(
      true,
      TransactionType.moneyAccountWithdraw,
    );

    expect(queryByTestId(PerpsWithdrawFromSelectorsIDs.ROW)).toBeNull();
  });
});
