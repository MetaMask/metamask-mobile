/**
 * Integration test reproducing the Money-home "Add funds" bug.
 *
 * Bug report: tapping "Add" on Money home "did not take me to Add funds flow,
 * but instead landed me back on Money home, with a new activity titled
 * 'Deposited'." — and it only happens when there is an unconfirmed transaction
 * pending elsewhere in the app.
 *
 * Root cause: `useConfirmNavigation` (used by `initiateDeposit`) defers its
 * navigation when an unapproved transaction exists — it rejects the pending
 * transaction first and only navigates later, from a `useEffect`. But the Money
 * "Add" sheet calls `closeAndNavigate`, which closes the bottom sheet. Closing
 * runs the sheet's `goBack` (popping/unmounting the modal) *before* finishing
 * the deposit. The hook that owns the deferred navigation unmounts, so the
 * effect never fires — navigation is lost — yet the deposit transaction is
 * still created and shows up as "Deposited".
 *
 * Unlike the unit test in `useConfirmNavigation.test.ts`, this test does NOT
 * call `unmount()` manually: the unmount is a genuine consequence of the
 * sheet's own close behaviour (`goBack`) when the user presses "Add".
 */
import React, { useEffect, useState } from 'react';
import { act, fireEvent } from '@testing-library/react-native';
import {
  TransactionType,
  TransactionStatus,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import MoneyAddMoneySheet from './MoneyAddMoneySheet';
import { MoneyAddMoneySheetTestIds } from './MoneyAddMoneySheet.testIds';
import Routes from '../../../../../constants/navigation/Routes';
import Engine from '../../../../../core/Engine';
import { addTransactionBatch } from '../../../../../util/transaction-controller';
import { useMusdBalance } from '../../../Earn/hooks/useMusdBalance';
import { useMMPayFiatConfig } from '../../../../Views/confirmations/hooks/pay/useMMPayFiatConfig';
import { selectHasAnyNonZeroTokenBalance } from '../../../../../selectors/tokenBalancesController';
import { getRampRoutingDecision } from '../../../../../reducers/fiatOrders';

const PENDING_TX_ID = 'pending-tx-from-elsewhere';

const mockNavigate = jest.fn();
// goBack mirrors production: closing the sheet pops the modal, unmounting it.
let unmountSheet: () => void = () => undefined;
const mockGoBack = jest.fn(() => unmountSheet());

const mockVaultConfig = {
  chainId: '0x8f',
  boringVault: '0xb4563bcD3B7764CCBf497f515585f70B6C3EA5Ae',
  tellerAddress: '0x2D49EA58A4C70b62c8B56DE971310d9e999c8117',
  accountantAddress: '0x7382c5b8B51B8C4f127B3123C1039581BAA5A06B',
  lensAddress: '0xA816ECd922de94c6879AD23B9A884dB257F20947',
};

// Stable reference so react-redux's useSelector doesn't warn on every render.
const mockPrimaryMoneyAccount = {
  address: '0x1111111111111111111111111111111111111111',
};

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
  };
});

// Faithful BottomSheet stub: onCloseBottomSheet runs `goBack()` (which unmounts
// the sheet here, as navigation would in production) and then the post-close
// callback — exactly the order the real BottomSheet uses.
jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const { forwardRef, useImperativeHandle } = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const MockBottomSheet = forwardRef(
    (
      {
        children,
        testID,
        goBack,
      }: {
        children: React.ReactNode;
        testID?: string;
        goBack?: () => void;
      },
      ref: React.Ref<{ onCloseBottomSheet: (cb?: () => void) => void }>,
    ) => {
      useImperativeHandle(
        ref,
        () => ({
          onCloseBottomSheet: (cb?: () => void) => {
            goBack?.();
            cb?.();
          },
          onOpenBottomSheet: jest.fn(),
        }),
        [goBack],
      );
      return <View testID={testID}>{children}</View>;
    },
  );
  const MockBottomSheetHeader = ({
    children,
  }: {
    children: React.ReactNode;
  }) => <View>{children}</View>;
  return {
    ...actual,
    BottomSheet: MockBottomSheet,
    BottomSheetHeader: MockBottomSheetHeader,
  };
});

// Keep the real `useMoneyAccountDeposit` + `useConfirmNavigation`; stub only the
// heavy deposit-building internals so `initiateDeposit` reaches navigation.
jest.mock('../../utils/moneyAccountTransactions', () => ({
  buildMoneyAccountDepositBatch: jest.fn().mockResolvedValue({
    approveTx: { to: '0xapprove', data: '0x', value: '0x0' },
    depositTx: { to: '0xdeposit', data: '0x', value: '0x0' },
  }),
  getMoneyAccountDepositAssetAddress: jest.fn(() => '0xasset'),
}));

jest.mock('../../../../../util/notifications/methods/common', () => ({
  getProviderByChainId: jest.fn(() => ({})),
}));

jest.mock('../../../../../util/transaction-controller', () => ({
  addTransactionBatch: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../../../core/Engine', () => ({
  context: {
    NetworkController: {
      findNetworkClientIdByChainId: jest.fn(() => 'network-client-1'),
    },
    ApprovalController: { rejectRequest: jest.fn() },
  },
}));

jest.mock(
  '../../../../../selectors/featureFlagController/moneyAccount',
  () => ({
    ...jest.requireActual(
      '../../../../../selectors/featureFlagController/moneyAccount',
    ),
    selectMoneyAccountVaultConfig: jest.fn(() => mockVaultConfig),
  }),
);

jest.mock('../../../../../selectors/moneyAccountController', () => ({
  ...jest.requireActual('../../../../../selectors/moneyAccountController'),
  selectPrimaryMoneyAccount: jest.fn(() => mockPrimaryMoneyAccount),
}));

// Sheet UI dependencies (mirrors MoneyAddMoneySheet.test.tsx setup).
jest.mock('../../../Earn/hooks/useMusdBalance', () => ({
  useMusdBalance: jest.fn(),
}));
jest.mock(
  '../../../../Views/confirmations/hooks/pay/useMMPayFiatConfig',
  () => ({ useMMPayFiatConfig: jest.fn() }),
);
jest.mock('../../../../../selectors/tokenBalancesController', () => ({
  ...jest.requireActual('../../../../../selectors/tokenBalancesController'),
  selectHasAnyNonZeroTokenBalance: jest.fn(),
}));
jest.mock('../../../../../reducers/fiatOrders', () => ({
  ...jest.requireActual('../../../../../reducers/fiatOrders'),
  getRampRoutingDecision: jest.fn(),
}));

// Wrapper that unmounts the sheet when `goBack` runs — modelling the modal
// being popped on close, which is what tears the hook down in production.
const SheetHarness = () => {
  const [open, setOpen] = useState(true);
  useEffect(() => {
    unmountSheet = () => setOpen(false);
    return () => {
      unmountSheet = () => undefined;
    };
  }, []);
  return open ? <MoneyAddMoneySheet /> : null;
};

function renderHarness(pendingTransactions: TransactionMeta[]) {
  return renderWithProvider(<SheetHarness />, {
    state: {
      engine: {
        backgroundState: {
          TransactionController: { transactions: pendingTransactions },
        },
      },
    },
  });
}

const flushAsync = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};

describe('MoneyAddMoneySheet — Add funds with a pending transaction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useMusdBalance as jest.Mock).mockReturnValue({
      fiatBalanceAggregated: '0',
      fiatBalanceAggregatedFormatted: '$0.00',
      hasMusdBalanceOnAnyChain: false,
      tokenBalanceAggregated: '0',
      tokenBalanceByChain: {},
    });
    (useMMPayFiatConfig as jest.Mock).mockReturnValue({
      enabledTransactionTypes: [TransactionType.moneyAccountDeposit],
      maxDelayMinutesForPaymentMethods: 10,
    });
    (selectHasAnyNonZeroTokenBalance as unknown as jest.Mock).mockReturnValue(
      true,
    );
    (getRampRoutingDecision as jest.Mock).mockReturnValue(null);
  });

  // Failing test (until the bug is fixed): pressing "Add" must take the user to
  // the Add funds confirmation flow even when an unconfirmed transaction is
  // already pending. Today it does not — the deferred navigation dies with the
  // unmounted sheet, dropping the user back on Money home with only a
  // "Deposited" activity to show for it.
  it('navigates to the Add funds flow even when an unconfirmed transaction is already pending', async () => {
    const pendingTx = {
      id: PENDING_TX_ID,
      status: TransactionStatus.unapproved,
    } as TransactionMeta;

    const { getByTestId } = renderHarness([pendingTx]);

    fireEvent.press(
      getByTestId(MoneyAddMoneySheetTestIds.DEPOSIT_FUNDS_OPTION),
    );
    await flushAsync();

    // The sheet closed (goBack ran, modal popped → hook unmounted).
    expect(mockGoBack).toHaveBeenCalledTimes(1);

    // The deposit batch is created (this is the "Deposited" activity that shows
    // up on Money home).
    expect(addTransactionBatch).toHaveBeenCalledTimes(1);

    // The user must still land on the Add funds confirmation flow. This is the
    // assertion that currently fails: the pre-existing pending transaction
    // forces a deferred navigation that never fires once the sheet unmounts.
    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.MONEY.CONFIRMATIONS_ROOT,
      expect.objectContaining({
        screen: Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
      }),
    );
  });

  it('navigates to the Add funds flow when no transaction is pending (control)', async () => {
    const { getByTestId } = renderHarness([]);

    fireEvent.press(
      getByTestId(MoneyAddMoneySheetTestIds.DEPOSIT_FUNDS_OPTION),
    );
    await flushAsync();

    expect(mockGoBack).toHaveBeenCalledTimes(1);
    // Nothing to reject, so navigation happens synchronously and survives the
    // unmount — the user reaches the Add funds confirmation flow.
    expect(
      jest.mocked(Engine.context.ApprovalController.rejectRequest),
    ).not.toHaveBeenCalled();
    expect(addTransactionBatch).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.MONEY.CONFIRMATIONS_ROOT,
      expect.objectContaining({
        screen: Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
      }),
    );
  });
});
