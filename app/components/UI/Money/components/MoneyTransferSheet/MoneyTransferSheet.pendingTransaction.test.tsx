import React, { useEffect, useState } from 'react';
import { act, fireEvent } from '@testing-library/react-native';
import {
  TransactionStatus,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import MoneyTransferSheet from './MoneyTransferSheet';
import { MoneyTransferSheetTestIds } from './MoneyTransferSheet.testIds';
import Routes from '../../../../../constants/navigation/Routes';
import Engine from '../../../../../core/Engine';
import { updateBgState } from '../../../../../core/redux/slices/engine';
import { addTransactionBatch } from '../../../../../util/transaction-controller';
import { useMoneyPerpsDeposit } from '../../../../Views/confirmations/hooks/pay/useMoneyPerpsDeposit';
import { useMoneyPredictDeposit } from '../../../../Views/confirmations/hooks/pay/useMoneyPredictDeposit';
import { useMoneyAnalytics } from '../../hooks/useMoneyAnalytics';

const PENDING_TX_ID = 'pending-tx-from-elsewhere';

const mockNavigate = jest.fn();
let unmountSheet: () => void = () => undefined;
const mockGoBack = jest.fn(() => unmountSheet());

const mockVaultConfig = {
  chainId: '0x8f',
  boringVault: '0xb4563bcD3B7764CCBf497f515585f70B6C3EA5Ae',
  tellerAddress: '0x2D49EA58A4C70b62c8B56DE971310d9e999c8117',
  accountantAddress: '0x7382c5b8B51B8C4f127B3123C1039581BAA5A06B',
  lensAddress: '0xA816ECd922de94c6879AD23B9A884dB257F20947',
};

// Stable references so react-redux's useSelector doesn't warn on every render.
const mockPrimaryMoneyAccount = {
  address: '0x1111111111111111111111111111111111111111',
};
const mockRecipient = '0x2222222222222222222222222222222222222222';

// Mutable mock of Engine.state.TransactionController so the test can simulate
// the TransactionController removing a transaction after it is rejected.
const mockEngineState: {
  TransactionController: { transactions: TransactionMeta[] };
} = {
  TransactionController: { transactions: [] },
};

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
  };
});

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

// Keep the real `useMoneyAccountWithdrawal` + `useConfirmNavigation`; stub only
// the heavy withdrawal-building internals so `initiateWithdrawal` reaches
// navigation.
jest.mock('../../utils/moneyAccountTransactions', () => ({
  buildMoneyAccountWithdrawBatch: jest.fn().mockResolvedValue({
    withdrawTx: { to: '0xwithdraw', data: '0x', value: '0x0' },
    transferTx: { to: '0xtransfer', data: '0x', value: '0x0' },
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

  get state() {
    return mockEngineState;
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

jest.mock('../../../../../selectors/accountsController', () => ({
  ...jest.requireActual('../../../../../selectors/accountsController'),
  selectEvmAddress: jest.fn(() => mockRecipient),
}));

// Other transfer options are out of scope here; disable them.
jest.mock(
  '../../../../Views/confirmations/hooks/pay/useMoneyPerpsDeposit',
  () => ({ useMoneyPerpsDeposit: jest.fn() }),
);
jest.mock(
  '../../../../Views/confirmations/hooks/pay/useMoneyPredictDeposit',
  () => ({ useMoneyPredictDeposit: jest.fn() }),
);
jest.mock('../../hooks/useMoneyAnalytics', () => ({
  useMoneyAnalytics: jest.fn(),
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
  return open ? <MoneyTransferSheet /> : null;
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

/**
 * Regression test for MUSD-975: tapping "Another account" (Between accounts)
 * while a stale unapproved transaction was pending created a second stuck
 * pending transaction and never showed the Send flow, because closing the sheet
 * unmounted the component before the deferred navigation could run.
 */
describe('MoneyTransferSheet — Between accounts with a pending transaction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEngineState.TransactionController = { transactions: [] };
    (useMoneyPerpsDeposit as jest.Mock).mockReturnValue({
      isEnabled: false,
      initiatePerpsDeposit: jest.fn(),
    });
    (useMoneyPredictDeposit as jest.Mock).mockReturnValue({
      isEnabled: false,
      initiatePredictDeposit: jest.fn(),
    });
    (useMoneyAnalytics as jest.Mock).mockReturnValue({
      trackBottomSheetViewed: jest.fn(),
      trackSurfaceClicked: jest.fn(),
    });
  });

  it('navigates to the Send flow even when an unconfirmed transaction is already pending', async () => {
    const pendingTx = {
      id: PENDING_TX_ID,
      status: TransactionStatus.unapproved,
    } as TransactionMeta;

    const { getByTestId, store } = renderHarness([pendingTx]);

    fireEvent.press(
      getByTestId(MoneyTransferSheetTestIds.BETWEEN_ACCOUNTS_OPTION),
    );
    await flushAsync();

    // The pre-existing pending transaction is rejected straight away.
    expect(
      jest.mocked(Engine.context.ApprovalController.rejectRequest),
    ).toHaveBeenCalledWith(PENDING_TX_ID, expect.anything());

    // Closing + navigating is deferred until the rejection clears from state,
    // so the sheet stays mounted: it has not been closed and nothing has
    // navigated yet. This is what keeps the navigation alive.
    expect(mockGoBack).not.toHaveBeenCalled();
    expect(addTransactionBatch).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();

    // Simulate the TransactionController removing the rejected transaction.
    mockEngineState.TransactionController = { transactions: [] };
    await act(async () => {
      store.dispatch(updateBgState({ key: 'TransactionController' }));
    });
    await flushAsync();

    // Now that nothing is pending, the sheet closes (modal popped) and the
    // withdrawal flow runs in one step — the user reaches the Send
    // confirmation instead of being stranded with a stuck pending transaction.
    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(addTransactionBatch).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.MONEY.CONFIRMATIONS_ROOT,
      expect.objectContaining({
        screen: Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
      }),
    );
  });

  it('navigates to the Send flow when no transaction is pending (control)', async () => {
    const { getByTestId } = renderHarness([]);

    fireEvent.press(
      getByTestId(MoneyTransferSheetTestIds.BETWEEN_ACCOUNTS_OPTION),
    );
    await flushAsync();

    // Nothing to reject, so the sheet closes and navigates immediately.
    expect(
      jest.mocked(Engine.context.ApprovalController.rejectRequest),
    ).not.toHaveBeenCalled();
    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(addTransactionBatch).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.MONEY.CONFIRMATIONS_ROOT,
      expect.objectContaining({
        screen: Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
      }),
    );
  });
});
