import '../../../../../../tests/component-view/mocks';
import React from 'react';
import { useStore } from 'react-redux';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import {
  CHAIN_IDS,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import {
  PaymentOverride,
  TransactionPayStrategy,
} from '@metamask/transaction-pay-controller';
import { renderScreenWithRoutes } from '../../../../../../tests/component-view/render';
import { initialStateVba } from '../../../../../../tests/component-view/presets/vba';
import Engine from '../../../../../core/Engine';
import { updateBgState } from '../../../../../core/redux/slices/engine';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import type { RootState } from '../../../../../reducers';
import type { DeepPartial } from '../../../../../util/test/renderWithProvider';
import { MUSD_TOKEN_ADDRESS } from '../../../Earn/constants/musd';
import { MoneyAccountBalanceServiceQueryKeys } from '../../../Money/queryKeys';
import { PerpsAmountDisplaySelectorsIDs } from '../../../Perps/Perps.testIds';
import { KeypadTestIds } from '../../../../Base/Keypad/Keypad.testIds';
import PayWithBottomSheet from '../../../../Views/confirmations/components/modals/pay-with-bottom-sheet/pay-with-bottom-sheet';
import { PayWithBottomSheetIDs } from '../../../../Views/confirmations/ConfirmationView.testIds';
import { POLYGON_PUSD } from '../../../../Views/confirmations/constants/predict';
import { PredictBuyPreviewSelectorsIDs } from '../../Predict.testIds';
import {
  ActiveOrderState,
  Side,
  type OrderPreview,
  type PredictMarket,
  type PredictOutcome,
  type PredictOutcomeToken,
} from '../../types';
import { PredictEventValues } from '../../constants/eventNames';
import { HardwareWalletProvider } from '../../../../../core/HardwareWallet';
import PredictBuyWithAnyToken from './PredictBuyWithAnyToken';

/**
 * Test layer placement: Component-view.
 * Exercises PredictBuyWithAnyToken through real Redux state and real hooks
 * (useMoneyAccountDepositAndOrder, useAutomaticMoneyAccountPayToken,
 * useDefaultPaySelectedSection, usePayWithMoneyAccountSection via
 * PayWithBottomSheet, usePredictBuyActions, usePredictBuyConditions,
 * usePredictBuyError, usePredictDefaultPaymentToken, PredictKeypad).
 * Only Engine controller boundaries are driven into Redux. Appium is not
 * justified because no native/device boundary is required for the controller
 * state transition, payment-method derivation, or keypad toggle logic.
 */

const ACCOUNT_ADDRESS = '0x0000000000000000000000000000000000000001';
const ORDER_TX_ID = 'predict-money-account-tx-1';
// Exceeds PAYMENT_SELECTOR_NAVIGATION_UNLOCK_DELAY_MS after PayWithBottomSheet returns focus.
const PAYMENT_SELECTOR_UNLOCK_TIMEOUT_MS = 3000;
const MUSD_MONAD_ASSET_ID = `eip155:143/erc20:${MUSD_TOKEN_ADDRESS}` as const;
const PUSD_POLYGON_ASSET_ID =
  `eip155:137/erc20:${POLYGON_PUSD.address}` as const;

const ERC20_TRANSFER_ZERO_DATA =
  '0xa9059cbb00000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000';

const MOCK_MARKET: PredictMarket = {
  id: 'market-1',
  question: 'Will it rain tomorrow?',
  title: 'Will it rain tomorrow?',
  category: 'Weather',
  outcomes: [],
  active: true,
  closed: false,
} as unknown as PredictMarket;

const MOCK_OUTCOME: PredictOutcome = {
  id: 'outcome-1',
  title: 'Yes',
} as unknown as PredictOutcome;

const MOCK_OUTCOME_TOKEN: PredictOutcomeToken = {
  id: 'token-yes-1',
  title: 'Yes',
  price: 0.45,
} as unknown as PredictOutcomeToken;

const buildOrderPreview = (amount: number): OrderPreview =>
  ({
    marketId: MOCK_MARKET.id,
    outcomeId: MOCK_OUTCOME.id,
    outcomeTokenId: MOCK_OUTCOME_TOKEN.id,
    side: Side.BUY,
    sharePrice: 0.45,
    maxAmountSpent: amount > 0 ? Number((amount * 1.07).toFixed(2)) : 0,
    minAmountReceived: amount > 0 ? Number((amount / 0.45).toFixed(2)) : 0,
    slippage: 0.005,
    tickSize: 0.01,
    minOrderSize: 1,
    negRisk: false,
    timestamp: 1234567890,
    fees:
      amount > 0
        ? {
            metamaskFee: Number((amount * 0.05).toFixed(2)),
            providerFee: Number((amount * 0.02).toFixed(2)),
            marketFee: 0,
            totalFee: Number((amount * 0.07).toFixed(2)),
            totalFeePercentage: 7,
            collector: '0x0000000000000000000000000000000000000002',
          }
        : undefined,
  }) as unknown as OrderPreview;

interface MutableEngine {
  state: Record<string, unknown>;
  context: Record<string, Record<string, unknown>>;
  controllerMessenger: { call: jest.Mock };
  acceptPendingApproval: jest.Mock;
  rejectPendingApproval: jest.Mock;
}

const engine = Engine as unknown as MutableEngine;

const originalEngineState = engine.state;
const originalPredictController = { ...engine.context.PredictController };
const originalTransactionController = {
  ...engine.context.TransactionController,
};
const originalTransactionPayController = engine.context.TransactionPayController
  ? { ...engine.context.TransactionPayController }
  : undefined;
const originalApprovalController = engine.context.ApprovalController
  ? { ...engine.context.ApprovalController }
  : undefined;
const originalAssetsController = { ...engine.context.AssetsController };
const originalGasFeeController = { ...engine.context.GasFeeController };

interface RenderScenarioOptions {
  predictBalance: number;
  moneyAccountBalanceRaw?: string;
  enableMoneyAccountForPredictOrder?: boolean;
  defaultMoneyAccountFlag?: boolean;
  initialActiveOrder?: {
    state: ActiveOrderState;
    error?: string;
    errorStage?: 'order' | 'payment';
  };
}

function renderPredictBuyScenario({
  predictBalance,
  moneyAccountBalanceRaw = '50000000',
  enableMoneyAccountForPredictOrder = true,
  defaultMoneyAccountFlag = false,
  initialActiveOrder = { state: ActiveOrderState.PREVIEW },
}: RenderScenarioOptions) {
  let storeRef: ReturnType<typeof useStore<RootState>> | null = null;

  const syncBgSlice = (
    key: 'PredictController' | 'TransactionPayController',
    nextSlice: Record<string, unknown>,
  ) => {
    engine.state = {
      ...engine.state,
      [key]: nextSlice,
    };
    storeRef?.dispatch(updateBgState({ key }));
  };

  let predictState: {
    activeBuyOrders: Record<
      string,
      {
        state: ActiveOrderState;
        error?: string;
        errorStage?: 'order' | 'payment';
        transactionId?: string;
      }
    >;
    selectedPaymentToken: {
      address: string;
      chainId: string;
      symbol?: string;
    } | null;
    balances: Record<string, { balance: number; lastUpdated: number }>;
    pendingDeposits: Record<string, unknown>;
    claimablePositions: Record<string, unknown>;
    accountMeta: Record<string, unknown>;
    withdrawTransaction: null;
    eligibility: { status: string; country: string };
  } = {
    activeBuyOrders: {
      [ACCOUNT_ADDRESS]: { ...initialActiveOrder },
    },
    selectedPaymentToken: null,
    balances: {
      [ACCOUNT_ADDRESS]: { balance: predictBalance, lastUpdated: Date.now() },
    },
    pendingDeposits: {},
    claimablePositions: {},
    accountMeta: {},
    withdrawTransaction: null,
    eligibility: { status: 'eligible', country: 'BR' },
  };

  let transactionPayData: Record<string, Record<string, unknown>> = {
    [ORDER_TX_ID]: {
      fiatPayment: {},
      isLoading: false,
      tokens: [
        {
          address: POLYGON_PUSD.address,
          chainId: CHAIN_IDS.POLYGON,
          decimals: POLYGON_PUSD.decimals,
          symbol: POLYGON_PUSD.symbol,
          amountHuman: '3.21',
          amountRaw: '3210000',
          amountUsd: '3.21',
          amountFiat: '3.21',
          balanceHuman: '0',
          balanceRaw: '0',
          balanceUsd: '0',
          balanceFiat: '0',
          skipIfBalance: false,
          allowUnderMinimum: false,
        },
      ],
      quotes: [
        {
          strategy: TransactionPayStrategy.Relay,
          request: {
            sourceAssetId: MUSD_MONAD_ASSET_ID,
            targetChainId: CHAIN_IDS.POLYGON,
            targetTokenAddress: POLYGON_PUSD.address,
            targetAmountMinimum: '3210000',
          },
          fees: {
            provider: { usd: '0.04', fiat: '0.04' },
            sourceNetwork: {
              estimate: { usd: '0', fiat: '0' },
              max: { usd: '0', fiat: '0' },
            },
            targetNetwork: { usd: '0', fiat: '0' },
            metaMask: { usd: '0', fiat: '0' },
          },
          sourceAmount: {
            human: '3.25',
            raw: '3250000',
            usd: '3.25',
            fiat: '3.25',
          },
          targetAmount: {
            human: '3.21',
            raw: '3210000',
            usd: '3.21',
            fiat: '3.21',
          },
        },
      ],
      totals: {
        total: { usd: '3.25', fiat: '3.25' },
        sourceAmount: {
          human: '3.25',
          raw: '3250000',
          usd: '3.25',
          fiat: '3.25',
        },
        targetAmount: { usd: '3.21', fiat: '3.21' },
        fees: {
          provider: { usd: '0.04', fiat: '0.04' },
          sourceNetwork: {
            estimate: { usd: '0', fiat: '0', raw: '0', human: '0' },
            max: { usd: '0', fiat: '0', raw: '0', human: '0' },
          },
          targetNetwork: { usd: '0', fiat: '0' },
          metaMask: { usd: '0', fiat: '0' },
        },
      },
    },
  };

  const enterPayWithAnyToken = jest.fn(
    ({ clearError = true }: { clearError?: boolean } = {}) => {
      const currentOrder = predictState.activeBuyOrders[ACCOUNT_ADDRESS];
      const shouldClearToken = predictState.selectedPaymentToken !== null;
      const shouldTransition = currentOrder?.state === ActiveOrderState.PREVIEW;
      if (!shouldClearToken && !shouldTransition) {
        return;
      }

      predictState = {
        ...predictState,
        selectedPaymentToken: null,
        activeBuyOrders: currentOrder
          ? {
              ...predictState.activeBuyOrders,
              [ACCOUNT_ADDRESS]: {
                ...currentOrder,
                ...(clearError
                  ? { error: undefined, errorStage: undefined }
                  : {}),
                state: shouldTransition
                  ? ActiveOrderState.PAY_WITH_ANY_TOKEN
                  : currentOrder.state,
              },
            }
          : predictState.activeBuyOrders,
      };
      syncBgSlice('PredictController', predictState);
    },
  );

  const selectPaymentToken = jest.fn(
    (token: { address: string; chainId?: string; symbol?: string } | null) => {
      const currentOrder = predictState.activeBuyOrders[ACCOUNT_ADDRESS];
      const nextState =
        token === null &&
        currentOrder?.state === ActiveOrderState.PAY_WITH_ANY_TOKEN
          ? ActiveOrderState.PREVIEW
          : token !== null && currentOrder?.state === ActiveOrderState.PREVIEW
            ? ActiveOrderState.PAY_WITH_ANY_TOKEN
            : currentOrder?.state;

      predictState = {
        ...predictState,
        selectedPaymentToken: token
          ? {
              address: token.address,
              chainId: token.chainId ?? '',
              symbol: token.symbol,
            }
          : null,
        activeBuyOrders:
          currentOrder && nextState
            ? {
                ...predictState.activeBuyOrders,
                [ACCOUNT_ADDRESS]: {
                  ...currentOrder,
                  error: undefined,
                  errorStage: undefined,
                  state: nextState,
                },
              }
            : predictState.activeBuyOrders,
      };
      syncBgSlice('PredictController', predictState);
    },
  );

  const clearOrderError = jest.fn(() => {
    const currentOrder = predictState.activeBuyOrders[ACCOUNT_ADDRESS];
    if (!currentOrder) return;
    predictState = {
      ...predictState,
      activeBuyOrders: {
        ...predictState.activeBuyOrders,
        [ACCOUNT_ADDRESS]: {
          ...currentOrder,
          error: undefined,
          errorStage: undefined,
        },
      },
    };
    syncBgSlice('PredictController', predictState);
  });

  const startPredictBuyAttempt = jest.fn(
    ({
      amountUsd,
      paymentMethod,
    }: {
      amountUsd: number;
      paymentMethod: string;
    }) => ({
      attemptId: 'attempt-cv-1',
      amountUsd,
      paymentMethod,
    }),
  );

  const placeOrder = jest.fn().mockResolvedValue({
    success: false,
    response: { status: 'deposit_in_progress' },
  });

  const initPayWithAnyToken = jest.fn().mockResolvedValue({
    success: true,
    response: { batchId: ORDER_TX_ID },
  });

  const setTransactionConfig = jest.fn(
    (
      transactionId: string,
      callback: (config: Record<string, unknown>) => void,
    ) => {
      const existing = transactionPayData[transactionId] ?? {
        fiatPayment: {},
        isLoading: false,
        tokens: [],
      };
      const config: Record<string, unknown> = {
        accountOverride: existing.accountOverride,
        atomic: existing.atomic,
        paymentOverride: existing.paymentOverride,
        refundTo: existing.refundTo,
      };
      callback(config);
      transactionPayData = {
        ...transactionPayData,
        [transactionId]: {
          ...existing,
          ...config,
        },
      };
      syncBgSlice('TransactionPayController', {
        transactionData: transactionPayData,
      });
    },
  );

  const updatePaymentToken = jest.fn(
    ({
      transactionId,
      assetId,
    }: {
      transactionId: string;
      assetId: string;
    }) => {
      const existing = transactionPayData[transactionId] ?? {
        fiatPayment: {},
        isLoading: false,
        tokens: [],
      };
      transactionPayData = {
        ...transactionPayData,
        [transactionId]: {
          ...existing,
          paymentToken: {
            assetId,
            symbol: 'MUSD',
            decimals: 6,
            balanceRaw: '0',
            balanceHuman: '0',
            balanceUsd: '0',
            balanceFiat: '0',
          },
        },
      };
      syncBgSlice('TransactionPayController', {
        transactionData: transactionPayData,
      });
    },
  );

  const updateFiatPayment = jest.fn();

  engine.context.PredictController = {
    ...originalPredictController,
    getBalance: jest.fn().mockResolvedValue(predictBalance),
    previewOrder: jest
      .fn()
      .mockImplementation(async ({ size }: { size: number }) =>
        buildOrderPreview(size),
      ),
    initPayWithAnyToken,
    enterPayWithAnyToken,
    selectPaymentToken,
    clearOrderError,
    clearActiveOrderTransactionId: jest.fn(),
    trackTradeConsidered: jest.fn(),
    trackPredictOrderEvent: jest.fn(),
    trackBetslipDismissed: jest.fn(),
    startPredictBuyAttempt,
    getRetryablePredictBuyAttempt: jest.fn().mockReturnValue(undefined),
    cancelRetryablePredictBuyAttempt: jest.fn(),
    onPlaceOrderSuccess: jest.fn(),
    placeOrder,
    depositWithConfirmation: jest.fn().mockResolvedValue({ success: true }),
  };

  engine.context.TransactionPayController = {
    ...(originalTransactionPayController ?? {}),
    setTransactionConfig,
    updatePaymentToken,
    updateFiatPayment,
  };

  engine.context.AssetsController = {
    ...originalAssetsController,
    addCustomAsset: jest.fn().mockResolvedValue(undefined),
  };

  engine.context.GasFeeController = {
    ...originalGasFeeController,
    fetchGasFeeEstimates: jest.fn().mockResolvedValue(undefined),
  };

  engine.context.TransactionController = {
    ...originalTransactionController,
    updateTransaction: jest.fn(),
    state: {
      transactions: [
        {
          id: ORDER_TX_ID,
          status: TransactionStatus.unapproved,
          chainId: CHAIN_IDS.POLYGON,
          time: 1,
          txParams: {
            from: ACCOUNT_ADDRESS,
            to: POLYGON_PUSD.address,
            data: ERC20_TRANSFER_ZERO_DATA,
          },
          type: TransactionType.predictDepositAndOrder,
        },
      ],
    },
  };

  engine.context.ApprovalController = {
    ...(originalApprovalController ?? {}),
    rejectRequest: jest.fn(),
  };

  engine.acceptPendingApproval.mockReset().mockResolvedValue(undefined);
  engine.rejectPendingApproval.mockReset().mockResolvedValue(undefined);

  engine.controllerMessenger.call.mockImplementation(async (method: string) => {
    if (
      method === MoneyAccountBalanceServiceQueryKeys.FETCH_BALANCE_WITH_FALLBACK
    ) {
      return {
        totalBalance: moneyAccountBalanceRaw,
        vmusdValueInMusd: moneyAccountBalanceRaw,
        musdBalance: '0',
        source: 'api',
        usedFallback: false,
      };
    }
    return undefined;
  });

  const state = initialStateVba()
    .withRemoteFeatureFlags({
      predictTradingEnabled: {
        enabled: true,
        featureVersion: '1.0.0',
        minimumVersion: '0.0.1',
      },
      predictWithAnyToken: {
        enabled: true,
        featureVersion: '1.0.0',
        minimumVersion: '0.0.1',
      },
      predictBottomSheet: {
        enabled: true,
        featureVersion: '1.0.0',
        minimumVersion: '0.0.1',
      },
      predictConfig: {
        enabled: false,
        venues: { polymarket: { enabled: true }, kalshi: { enabled: false } },
        venueSelection: { enabled: false },
      },
      confirmations_pay_extended: {
        enableMoneyAccountTransactions: {
          [TransactionType.predictDepositAndOrder]:
            enableMoneyAccountForPredictOrder,
        },
        ...(defaultMoneyAccountFlag
          ? {
              defaultPaySelectedSection: {
                [TransactionType.predictDepositAndOrder]: 'money-account',
              },
            }
          : {}),
      },
      confirmations_pay_tokens: {
        minimumRequiredTokenBalance: 10,
      },
    })
    .withOverrides({
      engine: {
        backgroundState: {
          PredictController: predictState,
          PredictVenueController: {
            venueSelectionPreference: null,
            lastActiveVenue: null,
            sessionDefault: null,
          },
          TransactionController: {
            transactions: [
              {
                id: ORDER_TX_ID,
                status: TransactionStatus.unapproved,
                chainId: CHAIN_IDS.POLYGON,
                time: 1,
                txParams: {
                  from: ACCOUNT_ADDRESS,
                  to: POLYGON_PUSD.address,
                  data: ERC20_TRANSFER_ZERO_DATA,
                },
                type: TransactionType.predictDepositAndOrder,
              },
            ],
            transactionBatches: [],
          },
          TransactionPayController: {
            transactionData: transactionPayData,
          },
          ApprovalController: {
            pendingApprovals: {
              [ORDER_TX_ID]: {
                id: ORDER_TX_ID,
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
          SignatureController: {
            signatureRequests: {},
          },
          AssetsController: {
            assetsInfo: {
              [MUSD_MONAD_ASSET_ID]: {
                type: 'erc20',
                symbol: 'MUSD',
                name: 'MetaMask USD',
                decimals: 6,
              },
              [PUSD_POLYGON_ASSET_ID]: {
                type: 'erc20',
                symbol: 'pUSD',
                name: 'Polymarket USD',
                decimals: 6,
              },
            },
            assetsBalance: {
              'acc-1': {},
            },
            assetsPrice: {
              [MUSD_MONAD_ASSET_ID]: {
                assetPriceType: 'fungible',
                price: 1,
                usdPrice: 1,
              },
              [PUSD_POLYGON_ASSET_ID]: {
                assetPriceType: 'fungible',
                price: 1,
                usdPrice: 1,
              },
            },
          },
        },
      },
    } as unknown as DeepPartial<RootState>)
    .build();

  engine.state = {
    ...engine.state,
    PredictController: predictState,
    TransactionPayController: { transactionData: transactionPayData },
  };

  const BuySheetScreen = () => {
    storeRef = useStore<RootState>();
    return (
      <HardwareWalletProvider>
        <PredictBuyWithAnyToken
          mode="sheet"
          market={MOCK_MARKET}
          outcome={MOCK_OUTCOME}
          outcomeToken={MOCK_OUTCOME_TOKEN}
          entryPoint={PredictEventValues.ENTRY_POINT.PREDICT_MARKET_DETAILS}
          onClose={jest.fn()}
        />
      </HardwareWalletProvider>
    );
  };

  const PayWithBottomSheetScreen = () => (
    <HardwareWalletProvider>
      <PayWithBottomSheet />
    </HardwareWalletProvider>
  );

  const view = renderScreenWithRoutes(
    BuySheetScreen,
    { name: Routes.PREDICT.MODALS.BUY_PREVIEW },
    [
      {
        name: Routes.CONFIRMATION_PAY_WITH_BOTTOM_SHEET,
        Component: PayWithBottomSheetScreen as unknown as React.ComponentType,
      },
    ],
    { state },
  );

  storeRef = view.store;

  const setActiveOrderState = async (next: {
    state: ActiveOrderState;
    error?: string;
    errorStage?: 'order' | 'payment';
  }) => {
    predictState = {
      ...predictState,
      activeBuyOrders: {
        ...predictState.activeBuyOrders,
        [ACCOUNT_ADDRESS]: next,
      },
    };
    await act(async () => {
      syncBgSlice('PredictController', predictState);
    });
  };

  return {
    ...view,
    spies: {
      enterPayWithAnyToken,
      startPredictBuyAttempt,
      placeOrder,
      setTransactionConfig,
    },
    setActiveOrderState,
    getPaymentOverride: () =>
      (
        view.store.getState().engine.backgroundState
          .TransactionPayController as unknown as {
          transactionData: Record<
            string,
            { paymentOverride?: PaymentOverride }
          >;
        }
      ).transactionData[ORDER_TX_ID]?.paymentOverride,
    getActiveOrderState: () =>
      (
        view.store.getState().engine.backgroundState
          .PredictController as unknown as {
          activeBuyOrders: Record<string, { state?: ActiveOrderState }>;
        }
      ).activeBuyOrders[ACCOUNT_ADDRESS]?.state,
  };
}

describe('PredictBuyWithAnyToken — Money Account selection and confirmation', () => {
  afterEach(() => {
    engine.state = originalEngineState;
    engine.context.PredictController = { ...originalPredictController };
    engine.context.TransactionController = { ...originalTransactionController };
    if (originalTransactionPayController) {
      engine.context.TransactionPayController = {
        ...originalTransactionPayController,
      };
    } else {
      delete engine.context.TransactionPayController;
    }
    if (originalApprovalController) {
      engine.context.ApprovalController = { ...originalApprovalController };
    } else {
      delete engine.context.ApprovalController;
    }
    engine.context.AssetsController = { ...originalAssetsController };
    engine.context.GasFeeController = { ...originalGasFeeController };
    engine.controllerMessenger.call.mockReset();
  });

  it('transitions to PAY_WITH_ANY_TOKEN and confirms deposit-and-order on the automatic Money Account path', async () => {
    const view = renderPredictBuyScenario({
      predictBalance: 0,
      moneyAccountBalanceRaw: '50000000',
      enableMoneyAccountForPredictOrder: true,
      defaultMoneyAccountFlag: false,
    });

    await waitFor(() => {
      expect(view.getPaymentOverride()).toBe(PaymentOverride.MoneyAccount);
      expect(view.getActiveOrderState()).toBe(
        ActiveOrderState.PAY_WITH_ANY_TOKEN,
      );
    });

    fireEvent.press(
      await view.findByTestId(PerpsAmountDisplaySelectorsIDs.AMOUNT_LABEL),
    );
    fireEvent.press(await view.findByTestId(KeypadTestIds.KEY_3));

    await waitFor(() => {
      const confirmButton = view.getByTestId(
        PredictBuyPreviewSelectorsIDs.PLACE_BET_BUTTON,
      );
      expect(confirmButton.props.accessibilityState?.disabled).toBe(false);
    });

    fireEvent.press(
      view.getByTestId(PredictBuyPreviewSelectorsIDs.PLACE_BET_BUTTON),
    );

    await waitFor(() => {
      expect(engine.acceptPendingApproval).toHaveBeenCalledWith(
        ORDER_TX_ID,
        expect.anything(),
        {
          deleteAfterResult: true,
          waitForResult: true,
          handleErrors: false,
        },
      );
      expect(view.spies.startPredictBuyAttempt).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentMethod: 'money_account',
        }),
      );
      expect(view.spies.placeOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          transactionId: ORDER_TX_ID,
          attempt: expect.objectContaining({
            paymentMethod: 'money_account',
          }),
        }),
      );
    });
  });

  it('keeps paymentOverride empty at sheet open when Predict balance covers minimum bet, then transitions and confirms after manual Money Account selection', async () => {
    const view = renderPredictBuyScenario({
      predictBalance: 2.33,
      moneyAccountBalanceRaw: '5000000',
      enableMoneyAccountForPredictOrder: true,
      defaultMoneyAccountFlag: false,
    });

    expect(
      await view.findByText(strings('confirm.label.pay_with')),
    ).toBeOnTheScreen();

    // Assert paymentOverride is empty at sheet open (never assume).
    expect(view.getPaymentOverride()).toBeUndefined();
    expect(view.getActiveOrderState()).toBe(ActiveOrderState.PREVIEW);

    fireEvent.press(view.getByText(strings('confirm.label.pay_with')));

    const moneyAccountRow = await view.findByTestId(
      PayWithBottomSheetIDs.MONEY_ACCOUNT_ROW,
    );
    fireEvent.press(moneyAccountRow);

    await waitFor(() => {
      expect(view.getPaymentOverride()).toBe(PaymentOverride.MoneyAccount);
      expect(view.getActiveOrderState()).toBe(
        ActiveOrderState.PAY_WITH_ANY_TOKEN,
      );
    });

    fireEvent.press(
      await view.findByTestId(PerpsAmountDisplaySelectorsIDs.AMOUNT_LABEL),
    );
    fireEvent.press(await view.findByTestId(KeypadTestIds.KEY_3));

    await waitFor(() => {
      const confirmButton = view.getByTestId(
        PredictBuyPreviewSelectorsIDs.PLACE_BET_BUTTON,
      );
      expect(confirmButton.props.accessibilityState?.disabled).toBe(false);
    });

    fireEvent.press(
      view.getByTestId(PredictBuyPreviewSelectorsIDs.PLACE_BET_BUTTON),
    );

    await waitFor(() => {
      expect(engine.acceptPendingApproval).toHaveBeenCalledWith(
        ORDER_TX_ID,
        expect.anything(),
        {
          deleteAfterResult: true,
          waitForResult: true,
          handleErrors: false,
        },
      );
      expect(view.spies.startPredictBuyAttempt).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentMethod: 'money_account',
        }),
      );
      expect(view.spies.placeOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          transactionId: ORDER_TX_ID,
        }),
      );
    });
  });

  it('transitions to PAY_WITH_ANY_TOKEN and confirms deposit-and-order on the remote-flag default path', async () => {
    const view = renderPredictBuyScenario({
      predictBalance: 0,
      moneyAccountBalanceRaw: '50000000',
      enableMoneyAccountForPredictOrder: false,
      defaultMoneyAccountFlag: true,
    });

    await waitFor(() => {
      expect(view.getPaymentOverride()).toBe(PaymentOverride.MoneyAccount);
      expect(view.getActiveOrderState()).toBe(
        ActiveOrderState.PAY_WITH_ANY_TOKEN,
      );
    });

    fireEvent.press(
      await view.findByTestId(PerpsAmountDisplaySelectorsIDs.AMOUNT_LABEL),
    );
    fireEvent.press(await view.findByTestId(KeypadTestIds.KEY_3));

    await waitFor(() => {
      const confirmButton = view.getByTestId(
        PredictBuyPreviewSelectorsIDs.PLACE_BET_BUTTON,
      );
      expect(confirmButton.props.accessibilityState?.disabled).toBe(false);
    });

    fireEvent.press(
      view.getByTestId(PredictBuyPreviewSelectorsIDs.PLACE_BET_BUTTON),
    );

    await waitFor(() => {
      expect(engine.acceptPendingApproval).toHaveBeenCalledWith(
        ORDER_TX_ID,
        expect.anything(),
        {
          deleteAfterResult: true,
          waitForResult: true,
          handleErrors: false,
        },
      );
      expect(view.spies.startPredictBuyAttempt).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentMethod: 'money_account',
        }),
      );
      expect(view.spies.placeOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          transactionId: ORDER_TX_ID,
        }),
      );
    });
  });

  it('does not auto-select Money Account when Predict balance already covers the order', async () => {
    const view = renderPredictBuyScenario({
      predictBalance: 10,
      moneyAccountBalanceRaw: '50000000',
      enableMoneyAccountForPredictOrder: true,
      defaultMoneyAccountFlag: true,
    });

    expect(
      await view.findByText(strings('confirm.label.pay_with')),
    ).toBeOnTheScreen();

    expect(view.getPaymentOverride()).toBeUndefined();
    expect(view.getActiveOrderState()).toBe(ActiveOrderState.PREVIEW);

    fireEvent.press(
      await view.findByTestId(PerpsAmountDisplaySelectorsIDs.AMOUNT_LABEL),
    );
    fireEvent.press(await view.findByTestId(KeypadTestIds.KEY_3));

    await waitFor(() => {
      const confirmButton = view.getByTestId(
        PredictBuyPreviewSelectorsIDs.PLACE_BET_BUTTON,
      );
      expect(confirmButton.props.accessibilityState?.disabled).toBe(false);
    });

    expect(view.getPaymentOverride()).toBeUndefined();
    expect(view.getActiveOrderState()).toBe(ActiveOrderState.PREVIEW);

    fireEvent.press(
      view.getByTestId(PredictBuyPreviewSelectorsIDs.PLACE_BET_BUTTON),
    );

    await waitFor(() => {
      expect(view.spies.startPredictBuyAttempt).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentMethod: 'predict_balance',
        }),
      );
      expect(view.spies.placeOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          transactionId: undefined,
        }),
      );
    });
    expect(engine.acceptPendingApproval).not.toHaveBeenCalled();
  });

  it('returns to PREVIEW and clears paymentOverride when switching from Money Account back to Predict balance', async () => {
    const view = renderPredictBuyScenario({
      predictBalance: 10,
      moneyAccountBalanceRaw: '50000000',
      enableMoneyAccountForPredictOrder: true,
      defaultMoneyAccountFlag: false,
    });

    fireEvent.press(await view.findByText(strings('confirm.label.pay_with')));
    fireEvent.press(
      await view.findByTestId(PayWithBottomSheetIDs.MONEY_ACCOUNT_ROW),
    );

    await waitFor(() => {
      expect(view.getPaymentOverride()).toBe(PaymentOverride.MoneyAccount);
      expect(view.getActiveOrderState()).toBe(
        ActiveOrderState.PAY_WITH_ANY_TOKEN,
      );
    });

    await waitFor(
      () => {
        const payWithRow = view.getByText(strings('confirm.label.pay_with'));
        fireEvent.press(payWithRow);
        expect(
          view.getByTestId(PayWithBottomSheetIDs.PREDICT_BALANCE_ROW),
        ).toBeOnTheScreen();
      },
      { timeout: PAYMENT_SELECTOR_UNLOCK_TIMEOUT_MS },
    );
    fireEvent.press(
      view.getByTestId(PayWithBottomSheetIDs.PREDICT_BALANCE_ROW),
    );

    await waitFor(() => {
      expect(view.getPaymentOverride()).toBeUndefined();
      expect(view.getActiveOrderState()).toBe(ActiveOrderState.PREVIEW);
    });
  });

  it('keeps the amount field editable after an order-failed banner closes the keypad', async () => {
    const view = renderPredictBuyScenario({
      predictBalance: 10,
      moneyAccountBalanceRaw: '50000000',
      enableMoneyAccountForPredictOrder: false,
      defaultMoneyAccountFlag: false,
    });

    fireEvent.press(
      await view.findByTestId(PerpsAmountDisplaySelectorsIDs.AMOUNT_LABEL),
    );
    fireEvent.press(await view.findByTestId(KeypadTestIds.KEY_3));

    await waitFor(() => {
      expect(
        view.getByTestId(PerpsAmountDisplaySelectorsIDs.AMOUNT_LABEL),
      ).toHaveTextContent('3');
    });

    await view.setActiveOrderState({
      state: ActiveOrderState.PREVIEW,
      error: 'Failed to place order',
      errorStage: 'order',
    });

    expect(
      await view.findByTestId(
        PredictBuyPreviewSelectorsIDs.ORDER_FAILED_BANNER,
      ),
    ).toBeOnTheScreen();

    // Banner appearance closes the keypad once.
    await waitFor(() => {
      expect(view.queryByTestId(KeypadTestIds.KEY_5)).not.toBeOnTheScreen();
    });

    // Tapping the amount field re-opens the keypad so the user can edit it.
    fireEvent.press(
      view.getByTestId(PerpsAmountDisplaySelectorsIDs.AMOUNT_LABEL),
    );

    const key5 = await view.findByTestId(KeypadTestIds.KEY_5);
    expect(key5).toBeOnTheScreen();

    fireEvent.press(key5);

    await waitFor(() => {
      expect(
        view.getByTestId(PerpsAmountDisplaySelectorsIDs.AMOUNT_LABEL),
      ).toHaveTextContent('35');
      expect(
        view.queryByTestId(PredictBuyPreviewSelectorsIDs.ORDER_FAILED_BANNER),
      ).not.toBeOnTheScreen();
    });
  });
});
