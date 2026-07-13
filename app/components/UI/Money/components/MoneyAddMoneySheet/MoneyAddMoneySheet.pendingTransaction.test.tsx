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
import { updateBgState } from '../../../../../core/redux/slices/engine';
import { addTransactionBatch } from '../../../../../util/transaction-controller';
import { useMusdBalance } from '../../../Earn/hooks/useMusdBalance';
import { useMMPayFiatConfig } from '../../../../Views/confirmations/hooks/pay/useMMPayFiatConfig';
import { useRegionHasFiatProvider } from '../../../Ramp/hooks/useRegionHasFiatProvider';
import { selectHasAnyNonZeroTokenBalance } from '../../../../../selectors/tokenBalancesController';
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

// Stable reference so react-redux's useSelector doesn't warn on every render.
const mockPrimaryMoneyAccount = {
  address: '0x1111111111111111111111111111111111111111',
};

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

// Keep the real `useMoneyAccountDeposit` + `useConfirmNavigation`; stub only the
// heavy deposit-building internals so `initiateDeposit` reaches navigation.
jest.mock('../../utils/moneyAccountTransactions', () => ({
  buildMoneyAccountDepositBatch: jest.fn().mockResolvedValue({
    approveTx: { to: '0xapprove', data: '0x', value: '0x0' },
    depositTx: { to: '0xdeposit', data: '0x', value: '0x0' },
  }),
  getMoneyAccountDepositAssetAddress: jest.fn(() => '0xasset'),
  getMoneyAccountDepositAssetId: jest.fn(
    () => 'eip155:143/erc20:0xacA92E438df0B2401fF60dA7E4337B687a2435DA',
  ),
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

// Sheet UI dependencies (mirrors MoneyAddMoneySheet.test.tsx setup).
jest.mock('../../../Earn/hooks/useMusdBalance', () => ({
  useMusdBalance: jest.fn(),
}));
jest.mock(
  '../../../../Views/confirmations/hooks/pay/useMMPayFiatConfig',
  () => ({ useMMPayFiatConfig: jest.fn() }),
);
jest.mock('../../../Ramp/hooks/useRegionHasFiatProvider', () => ({
  useRegionHasFiatProvider: jest.fn(),
}));
jest.mock('../../../../../selectors/tokenBalancesController', () => ({
  ...jest.requireActual('../../../../../selectors/tokenBalancesController'),
  selectHasAnyNonZeroTokenBalance: jest.fn(),
}));
jest.mock('../../hooks/useMoneyAnalytics', () => ({
  useMoneyAnalytics: jest.fn(),
}));
jest.mock('../../../../../selectors/preferencesController', () => ({
  ...jest.requireActual('../../../../../selectors/preferencesController'),
  selectPrivacyMode: jest.fn(() => false),
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

/**
 * Regression test for the Money-home "Add funds" bug where tapping "Add"
 * landed the user back on money home, with an empty 'Deposited activity'.
 */
describe('MoneyAddMoneySheet — Add funds with a pending transaction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEngineState.TransactionController = { transactions: [] };
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
    (useRegionHasFiatProvider as jest.Mock).mockReturnValue(true);
    (useMoneyAnalytics as jest.Mock).mockReturnValue({
      trackBottomSheetViewed: jest.fn(),
      trackSurfaceClicked: jest.fn(),
    });
  });

  it('navigates to the Add funds flow even when an unconfirmed transaction is already pending', async () => {
    const pendingTx = {
      id: PENDING_TX_ID,
      status: TransactionStatus.unapproved,
    } as TransactionMeta;

    const { getByTestId, store } = renderHarness([pendingTx]);

    fireEvent.press(
      getByTestId(MoneyAddMoneySheetTestIds.DEPOSIT_FUNDS_OPTION),
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
    // deposit flow runs in one step — the user reaches the Add funds
    // confirmation instead of being stranded on Money home.
    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(addTransactionBatch).toHaveBeenCalledTimes(1);
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
