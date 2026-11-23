import '../mocks';
import React from 'react';
import { Pressable, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  TransactionStatus,
  TransactionType,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import { act } from '@testing-library/react-native';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import type { AppNavigationProp } from '../../../app/core/NavigationService/types';
import Engine from '../../../app/core/Engine';
import { updateBgState } from '../../../app/core/redux/slices/engine';
import Routes from '../../../app/constants/navigation/Routes';
import MoneyTransferSheet from '../../../app/components/UI/Money/components/MoneyTransferSheet';
import PayWithBottomSheet from '../../../app/components/Views/confirmations/components/modals/pay-with-bottom-sheet/pay-with-bottom-sheet';
import { renderScreenWithRoutes } from '../render';
import { initialStateVba, VBA_TEST_MONEY_ADDRESS } from '../presets/vba';

/**
 * Which Predict implementation serves the Active Venue. `polymarket` is the
 * production default (legacy lane); `kalshi` rolls Predict out to Kalshi only,
 * which makes Kalshi the Active Venue (PredictNext lane).
 */
export type PredictFundingVenue = 'polymarket' | 'kalshi';

const PREDICT_CONFIG: Record<PredictFundingVenue, unknown> = {
  polymarket: {
    enabled: false,
    venues: { polymarket: { enabled: true }, kalshi: { enabled: false } },
    venueSelection: { enabled: false },
  },
  kalshi: {
    enabled: true,
    venues: { polymarket: { enabled: false }, kalshi: { enabled: true } },
    venueSelection: { enabled: false },
  },
};

export const PredictFundingRendererTestIds = {
  OPEN_SHEET: 'predict-funding-renderer-open-sheet',
} as const;

export const PREDICT_FUNDING_PENDING_TX_ID = 'predict-funding-pending-tx';
export const PREDICT_FUNDING_ORDER_TX_ID = 'predict-funding-order-tx';

interface PredictFundingStateOptions {
  venue: PredictFundingVenue;
  /** `predictTradingEnabled`, the legacy lane's switch. Defaults to on. */
  predictTradingEnabled?: boolean;
  transactions?: Partial<TransactionMeta>[];
  overrides?: DeepPartial<RootState>;
}

/**
 * A Money user who may transfer to the Predictions account: Money enabled and
 * geo-eligible, the Predict deposit Money flag on, Polymarket eligible, and
 * Predict rolled out to `venue`.
 */
const buildPredictFundingState = ({
  venue,
  predictTradingEnabled = true,
  transactions = [],
  overrides,
}: PredictFundingStateOptions) => {
  const builder = initialStateVba()
    .withRemoteFeatureFlags({
      predictTradingEnabled: {
        enabled: predictTradingEnabled,
        featureVersion: '1.0.0',
        minimumVersion: '0.0.1',
      },
      predictConfig: PREDICT_CONFIG[venue],
      confirmations_pay_extended: {
        enableMoneyAccountTransactions: {
          [TransactionType.predictDeposit]: true,
        },
      },
    })
    .withOverrides({
      engine: {
        backgroundState: {
          PredictController: {
            eligibility: { status: 'eligible', country: 'BR' },
            balances: {},
            pendingDeposits: {},
            claimablePositions: {},
            accountMeta: {},
            activeBuyOrders: {},
            withdrawTransaction: null,
          },
          PredictVenueController: {
            venueSelectionPreference: null,
            lastActiveVenue: null,
            sessionDefault: null,
          },
          TransactionController: { transactions, transactionBatches: [] },
        },
      },
    } as unknown as DeepPartial<RootState>);
  if (overrides) {
    builder.withOverrides(overrides);
  }
  return builder.build();
};

/** An unapproved transaction left over from elsewhere in the app. */
export const pendingTransaction = (): Partial<TransactionMeta> => ({
  id: PREDICT_FUNDING_PENDING_TX_ID,
  status: TransactionStatus.unapproved,
  chainId: '0x1',
  time: 1,
  txParams: { from: VBA_TEST_MONEY_ADDRESS },
  type: TransactionType.simpleSend,
});

const MoneyTransferCaller = () => {
  const navigation = useNavigation<AppNavigationProp>();
  return (
    <Pressable
      testID={PredictFundingRendererTestIds.OPEN_SHEET}
      onPress={() =>
        navigation.navigate(Routes.MONEY.MODALS.TRANSFER_MONEY_SHEET)
      }
    >
      <Text>Open transfer</Text>
    </Pressable>
  );
};

/**
 * Money's transfer sheet, opened from a caller screen so closing it pops back
 * the way the Money modal stack does. The Predict deposit confirmation lands
 * on the `Predict` route probe.
 */
export const renderMoneyTransferSheetView = (
  options: PredictFundingStateOptions,
) =>
  renderScreenWithRoutes(
    MoneyTransferCaller,
    { name: 'MoneyTransferCaller' },
    [
      {
        name: Routes.MONEY.MODALS.TRANSFER_MONEY_SHEET,
        Component: MoneyTransferSheet as unknown as React.ComponentType,
      },
      { name: Routes.PREDICT.ROOT },
      { name: Routes.PREDICT.MODALS.ROOT },
      { name: Routes.MONEY.CONFIRMATIONS_ROOT },
    ],
    { state: buildPredictFundingState(options) },
  );

/** A Predict buy paid through MetaMask Pay, awaiting approval. */
export const predictDepositAndOrderTransaction =
  (): Partial<TransactionMeta> => ({
    id: PREDICT_FUNDING_ORDER_TX_ID,
    status: TransactionStatus.unapproved,
    chainId: '0x89',
    time: 1,
    txParams: { from: VBA_TEST_MONEY_ADDRESS },
    type: TransactionType.predictDepositAndOrder,
  });

/** The pay-with sheet for a pending `predictDepositAndOrder` confirmation. */
export const renderPayWithBottomSheetView = ({
  venue,
  predictTradingEnabled,
}: Pick<PredictFundingStateOptions, 'venue' | 'predictTradingEnabled'>) =>
  renderScreenWithRoutes(
    PayWithBottomSheet as unknown as React.ComponentType,
    { name: Routes.CONFIRMATION_PAY_WITH_BOTTOM_SHEET },
    [{ name: Routes.PREDICT.MODALS.ROOT }],
    {
      state: buildPredictFundingState({
        venue,
        predictTradingEnabled,
        transactions: [predictDepositAndOrderTransaction()],
        overrides: {
          engine: {
            backgroundState: {
              ApprovalController: {
                pendingApprovals: {
                  [PREDICT_FUNDING_ORDER_TX_ID]: {
                    id: PREDICT_FUNDING_ORDER_TX_ID,
                    origin: 'metamask',
                    type: 'transaction',
                    time: 1,
                    requestData: {},
                    requestState: null,
                    expectsResult: false,
                  },
                },
                pendingApprovalCount: 1,
                approvalFlows: [],
              },
            },
          },
        } as unknown as DeepPartial<RootState>,
      }),
    },
  );

interface EngineStateView {
  store: { dispatch: (action: unknown) => unknown; getState: () => RootState };
}

const engine = Engine as unknown as {
  state: Record<string, unknown>;
  context: Record<string, Record<string, unknown>>;
};

/** Publishes a controller's new state to Redux, as the Engine does. */
const publishEngineState = (
  view: EngineStateView,
  key: 'RemoteFeatureFlagController' | 'TransactionController',
  state: Record<string, unknown>,
) => {
  engine.state = { ...engine.state, [key]: state };
  view.store.dispatch(updateBgState({ key }));
};

/** Moves the Active Venue mid-session, as a remote flag refresh does. */
export const switchPredictVenue = async (
  view: EngineStateView,
  venue: PredictFundingVenue,
) => {
  const current = view.store.getState().engine.backgroundState
    .RemoteFeatureFlagController as unknown as Record<string, unknown>;
  await act(async () => {
    publishEngineState(view, 'RemoteFeatureFlagController', {
      ...current,
      remoteFeatureFlags: {
        ...(current.remoteFeatureFlags as Record<string, unknown>),
        predictConfig: PREDICT_CONFIG[venue],
      },
    });
  });
};

/**
 * Seeds the Engine's TransactionController with `transactions` (what
 * `rejectPendingTransactions` scans) and returns a stub for the approval
 * rejection it performs.
 */
export const seedEngineTransactions = (
  transactions: Partial<TransactionMeta>[],
) => {
  const rejectRequest = jest.fn();
  engine.context.TransactionController.state = { transactions };
  engine.context.ApprovalController = {
    ...(engine.context.ApprovalController ?? {}),
    rejectRequest,
  };
  return rejectRequest;
};

/** The TransactionController drops the rejected transaction. */
export const clearPendingTransactions = async (view: EngineStateView) => {
  engine.context.TransactionController.state = { transactions: [] };
  await act(async () => {
    publishEngineState(view, 'TransactionController', {
      transactions: [],
      transactionBatches: [],
    });
  });
};

const originalEngineState = engine.state;
const originalTransactionControllerState =
  engine.context.TransactionController?.state;
const originalApprovalController = engine.context.ApprovalController;

/** Undoes `switchPredictVenue` and `seedEngineTransactions`. */
export const restorePredictFundingEngine = () => {
  engine.state = originalEngineState;
  engine.context.TransactionController.state =
    originalTransactionControllerState;
  if (originalApprovalController) {
    engine.context.ApprovalController = originalApprovalController;
  } else {
    delete engine.context.ApprovalController;
  }
};
