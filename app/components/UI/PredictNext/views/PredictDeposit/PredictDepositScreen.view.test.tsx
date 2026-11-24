import '../../../../../../tests/component-view/mocks';
import { AccessibilityInfo } from 'react-native';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { providerErrors } from '@metamask/rpc-errors';
import {
  TransactionStatus,
  TransactionType,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import Clipboard from '@react-native-clipboard/clipboard';
import NetInfo from '@react-native-community/netinfo';
import type NetInfoMock from '../../../../../__mocks__/@react-native-community/netinfo';
import {
  createComponentViewQueryClient,
  getRouteProbeTestId,
} from '../../../../../../tests/component-view/render';
import { renderPredictDepositScreen } from '../../../../../../tests/component-view/renderers/predictNext';
import {
  configurePredictNextCatalog,
  messengerCall,
  mockPredictNextMessenger,
  resetPredictNextCatalog,
} from '../../../../../../tests/component-view/fixtures/predictNext';
import Engine from '../../../../../core/Engine';
import { strings } from '../../../../../../locales/i18n';
import { KALSHI_VENUE_ID } from '../../adapters/remote/KalshiRemoteAdapter';
import {
  BASE_DEPOSIT_NETWORK,
  BASE_SEPOLIA_DEPOSIT_NETWORK,
} from '../../config/depositEnvironment';
import { KALSHI_STATIC_VENUE_CATALOG } from '../../contracts/v1/fixtures/kalshiVenueCatalog';
import { PredictError, PredictErrorCode } from '../../errors';
import {
  clearAllSessionDepositTransfers,
  depositTransferRequestId,
} from '../../funding';
import { makeDepositTransferTx } from '../../funding/deposit/testUtils';
import { PredictNextRoutes } from '../../navigation/routes';
import { marketDataQueries } from '../../queries/marketDataQueries';
import type {
  PredictAmount,
  PredictDepositOperation,
  PredictEntityId,
  PredictHex,
  PredictTimestamp,
} from '../../types';
import { PredictDepositScreenTestIds as TestIds } from './PredictDepositScreen.testIds';

const USDC = BASE_DEPOSIT_NETWORK.usdc.address;
const DEPOSIT_ADDRESS: PredictHex =
  '0x1111111111111111111111111111111111111111';
const TX_HASH: PredictHex = `0x${'ab'.repeat(32)}`;
/** `transfer(DEPOSIT_ADDRESS, 25000000)`: $25.00 in USDC base units. */
const TRANSFER_25_USDC = `0xa9059cbb${DEPOSIT_ADDRESS.slice(2).padStart(
  64,
  '0',
)}${(25_000_000).toString(16).padStart(64, '0')}`;

const netInfoMock = NetInfo as unknown as typeof NetInfoMock;

const minutesFromNow = (minutes: number): PredictTimestamp =>
  new Date(Date.now() + minutes * 60_000).toISOString() as PredictTimestamp;

const makeDeposit = ({
  operationId = 'op-1',
  amount = '25.00',
  planAmount = amount,
  planExpiresAt = minutesFromNow(10),
  createdAt = new Date().toISOString() as PredictTimestamp,
  status = 'awaiting_transfer',
  withPlan = true,
  network = BASE_DEPOSIT_NETWORK,
}: {
  operationId?: string;
  amount?: string;
  planAmount?: string;
  planExpiresAt?: PredictTimestamp;
  createdAt?: PredictTimestamp;
  status?: PredictDepositOperation['status'];
  withPlan?: boolean;
  network?: typeof BASE_DEPOSIT_NETWORK;
} = {}): PredictDepositOperation => ({
  operationId: operationId as PredictEntityId,
  status,
  amount: amount as PredictAmount,
  chainId: network.chainId,
  tokenContract: network.usdc.address,
  depositAddress: DEPOSIT_ADDRESS,
  planExpiresAt,
  txHash: null,
  createdAt,
  next: withPlan
    ? {
        kind: 'wallet_transfer',
        chainId: network.chainId,
        tokenContract: network.usdc.address,
        amount: planAmount as PredictAmount,
        depositAddress: DEPOSIT_ADDRESS,
        planExpiresAt,
      }
    : { kind: 'wait' },
});

type Handler = (...params: never[]) => unknown;

/** Answers the funding routes; every other action resolves to nothing. */
const mockFunding = (handlers: Record<string, Handler>): void => {
  mockPredictNextMessenger((action, ...params) =>
    handlers[action] ? handlers[action](...params) : Promise.resolve(undefined),
  );
};

const mockUsdcBalance = (baseUnits: string): void => {
  jest
    .spyOn(Engine.context.NetworkController, 'findNetworkClientIdByChainId')
    .mockReturnValue('base-mainnet' as never);
  jest
    .mocked(Engine.context.AssetsContractController.getERC20BalanceOf)
    .mockResolvedValue({ toString: () => baseUnits } as never);
};

/** The wallet submits the transfer it was given and answers `result`. */
const mockWallet = (result: () => Promise<string>): void => {
  jest
    .mocked(Engine.context.TransactionController.addTransaction)
    .mockImplementation(
      async (txParams, options) =>
        ({
          result: result(),
          transactionMeta: {
            id: 'tx-1',
            chainId: '0x2105',
            txParams,
            requestId: options?.requestId,
          },
        }) as never,
    );
};

const typeAmount = async (
  view: ReturnType<typeof renderPredictDepositScreen>,
  keys: string,
  readyTestId: string = TestIds.BALANCE,
): Promise<void> => {
  await view.findByTestId(readyTestId);
  for (const key of keys) {
    fireEvent.press(view.getByTestId(TestIds.KEYPAD_KEY(key)));
  }
};

const addFunds = async (
  view: ReturnType<typeof renderPredictDepositScreen>,
): Promise<void> => {
  fireEvent.press(view.getByTestId(TestIds.CONTINUE));
  await act(async () => {
    fireEvent.press(view.getByTestId(TestIds.ADD_FUNDS));
  });
};

const calledActions = (): unknown[] =>
  jest
    .mocked(Engine.controllerMessenger.call)
    .mock.calls.map(([action]) => action);

describe('PredictDepositScreen', () => {
  let announceForAccessibility: jest.SpyInstance;
  const originalApprovalController = Engine.context.ApprovalController;

  beforeEach(() => {
    jest.clearAllMocks();
    resetPredictNextCatalog();
    clearAllSessionDepositTransfers();
    Engine.context.TransactionController.state.transactions = [];
    Engine.context.ApprovalController = {
      ...(originalApprovalController ?? {}),
      rejectRequest: jest.fn(),
    } as never;
    announceForAccessibility = jest
      .spyOn(AccessibilityInfo, 'announceForAccessibility')
      .mockImplementation(() => undefined);
    netInfoMock.__setMockNetInfo({ type: 'wifi', isInternetReachable: true });
    mockUsdcBalance('100000000');
  });

  afterEach(() => {
    resetPredictNextCatalog();
    clearAllSessionDepositTransfers();
    Engine.context.TransactionController.state.transactions = [];
    if (originalApprovalController) {
      Engine.context.ApprovalController = originalApprovalController;
    } else {
      delete (Engine.context as Record<string, unknown>).ApprovalController;
    }
    announceForAccessibility.mockRestore();
    netInfoMock.__resetMockNetInfo();
    jest.restoreAllMocks();
  });

  it('pays the checked Funding Plan with a USDC transfer and reports its hash', async () => {
    const prepareDeposit = jest.fn(async () => makeDeposit());
    const reportDepositTransfer = jest.fn(async () =>
      makeDeposit({ status: 'processing' }),
    );
    mockFunding({
      'PredictFundingService:prepareDeposit': prepareDeposit,
      'PredictFundingService:reportDepositTransfer': reportDepositTransfer,
    });
    mockWallet(async () => TX_HASH);
    const view = renderPredictDepositScreen({ venueId: KALSHI_VENUE_ID });

    expect(await view.findByTestId(TestIds.BALANCE)).toHaveTextContent(
      strings('predict_next.deposit.available', { amount: '100.00' }),
    );
    expect(view.getByTestId(TestIds.PAY_WITH)).toHaveTextContent(
      /USDC on Base/u,
    );
    await typeAmount(view, '25');
    expect(view.getByTestId(TestIds.AMOUNT)).toHaveTextContent('$25');
    await addFunds(view);

    expect(await view.findByTestId(TestIds.PROCESSING)).toBeOnTheScreen();
    expect(
      view.getByText(
        strings('predict_next.deposit.processing_description', {
          amount: '$25.00',
        }),
      ),
    ).toBeOnTheScreen();
    expect(prepareDeposit).toHaveBeenCalledWith(
      KALSHI_VENUE_ID,
      {
        amount: '25.00',
        clientOperationId: expect.stringMatching(
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u,
        ),
      },
      { kind: 'user-approved' },
    );
    expect(
      Engine.context.TransactionController.addTransaction,
    ).toHaveBeenCalledWith(
      {
        from: '0x0000000000000000000000000000000000000001',
        to: USDC,
        data: TRANSFER_25_USDC,
        value: '0x0',
      },
      expect.objectContaining({
        networkClientId: 'base-mainnet',
        type: TransactionType.tokenMethodTransfer,
      }),
    );
    expect(reportDepositTransfer).toHaveBeenCalledWith(
      KALSHI_VENUE_ID,
      'op-1',
      { txHash: TX_HASH, chainId: BASE_DEPOSIT_NETWORK.chainId },
    );

    fireEvent.press(view.getByTestId(TestIds.DONE));
    expect(
      await view.findByTestId(getRouteProbeTestId(PredictNextRoutes.HOME)),
    ).toBeOnTheScreen();
  });

  describe('catalog environment resolution', () => {
    it('uses Base Sepolia and simulated transfer in sandbox without checking USDC balance', async () => {
      mockUsdcBalance('0');
      configurePredictNextCatalog({
        ...KALSHI_STATIC_VENUE_CATALOG,
        environment: 'sandbox',
      });
      const reportDepositTransfer = jest.fn(async () =>
        makeDeposit({
          status: 'processing',
          network: BASE_SEPOLIA_DEPOSIT_NETWORK,
        }),
      );
      mockFunding({
        'PredictFundingService:prepareDeposit': async () =>
          makeDeposit({ network: BASE_SEPOLIA_DEPOSIT_NETWORK }),
        'PredictFundingService:reportDepositTransfer': reportDepositTransfer,
      });

      const view = renderPredictDepositScreen({ venueId: KALSHI_VENUE_ID });

      expect(
        await view.findByTestId(TestIds.SIMULATED_CAPTION),
      ).toHaveTextContent(strings('predict_next.deposit.simulated_sandbox'));
      expect(view.getByTestId(TestIds.PAY_WITH)).toHaveTextContent(
        /USDC on Base Sepolia/u,
      );
      expect(
        Engine.context.AssetsContractController.getERC20BalanceOf,
      ).not.toHaveBeenCalled();

      await typeAmount(view, '25', TestIds.SIMULATED_CAPTION);
      expect(view.queryByTestId(TestIds.ALERT)).not.toBeOnTheScreen();
      expect(view.getByTestId(TestIds.CONTINUE)).toBeEnabled();

      await addFunds(view);

      expect(await view.findByTestId(TestIds.PROCESSING)).toBeOnTheScreen();
      expect(
        Engine.context.TransactionController.addTransaction,
      ).not.toHaveBeenCalled();
      expect(reportDepositTransfer).toHaveBeenCalledWith(
        KALSHI_VENUE_ID,
        'op-1',
        {
          txHash: expect.stringMatching(/^0x[0-9a-f]{64}$/u),
          chainId: BASE_SEPOLIA_DEPOSIT_NETWORK.chainId,
        },
      );
    });

    it('uses Base mainnet and wallet transfer in production', async () => {
      configurePredictNextCatalog({
        ...KALSHI_STATIC_VENUE_CATALOG,
        environment: 'production',
      });
      const reportDepositTransfer = jest.fn(async () =>
        makeDeposit({ status: 'processing' }),
      );
      mockFunding({
        'PredictFundingService:prepareDeposit': async () => makeDeposit(),
        'PredictFundingService:reportDepositTransfer': reportDepositTransfer,
      });
      mockWallet(async () => TX_HASH);

      const view = renderPredictDepositScreen({ venueId: KALSHI_VENUE_ID });

      expect(await view.findByTestId(TestIds.BALANCE)).toHaveTextContent(
        strings('predict_next.deposit.available', { amount: '100.00' }),
      );
      expect(view.getByTestId(TestIds.PAY_WITH)).toHaveTextContent(
        /USDC on Base$/u,
      );

      await typeAmount(view, '25');
      await addFunds(view);

      expect(await view.findByTestId(TestIds.PROCESSING)).toBeOnTheScreen();
      expect(
        Engine.context.TransactionController.addTransaction,
      ).toHaveBeenCalledTimes(1);
      expect(reportDepositTransfer).toHaveBeenCalledWith(
        KALSHI_VENUE_ID,
        'op-1',
        { txHash: TX_HASH, chainId: BASE_DEPOSIT_NETWORK.chainId },
      );
    });

    it('disables Continue and hides Pay with while catalog is loading', async () => {
      configurePredictNextCatalog('pending');
      mockFunding({});

      const view = renderPredictDepositScreen({ venueId: KALSHI_VENUE_ID });

      expect(
        await view.findByTestId(TestIds.BALANCE_LOADING),
      ).toBeOnTheScreen();
      expect(view.queryByTestId(TestIds.PAY_WITH)).not.toBeOnTheScreen();

      fireEvent.press(view.getByTestId(TestIds.KEYPAD_KEY('2')));
      fireEvent.press(view.getByTestId(TestIds.KEYPAD_KEY('5')));
      expect(view.getByTestId(TestIds.CONTINUE)).toBeDisabled();
      expect(
        Engine.context.AssetsContractController.getERC20BalanceOf,
      ).not.toHaveBeenCalled();
    });

    it('never flashes balance unavailable when catalog resolves from loading to production', async () => {
      let resolveCatalog: (value: unknown) => void = () => undefined;
      messengerCall.mockImplementation((action: string): unknown => {
        if (action === 'PredictMarketDataService:getVenueCatalog') {
          return new Promise((resolve) => {
            resolveCatalog = resolve;
          });
        }
        if (action === 'PredictOrderService:getRecovery') {
          return [];
        }
        return Promise.resolve(undefined);
      });
      let resolveBalance: (value: unknown) => void = () => undefined;
      jest
        .mocked(Engine.context.AssetsContractController.getERC20BalanceOf)
        .mockImplementation(
          () =>
            new Promise((resolve) => {
              resolveBalance = resolve;
            }) as never,
        );

      const view = renderPredictDepositScreen({ venueId: KALSHI_VENUE_ID });

      expect(
        await view.findByTestId(TestIds.BALANCE_LOADING),
      ).toBeOnTheScreen();

      await act(async () => {
        resolveCatalog({
          ...KALSHI_STATIC_VENUE_CATALOG,
          environment: 'production',
        });
      });

      await waitFor(() => {
        expect(
          view.queryByText(strings('predict_next.deposit.balance_unavailable')),
        ).not.toBeOnTheScreen();
        expect(
          Engine.context.AssetsContractController.getERC20BalanceOf,
        ).toHaveBeenCalledTimes(1);
      });
      expect(view.getByTestId(TestIds.BALANCE_LOADING)).toBeOnTheScreen();

      await act(async () => {
        resolveBalance({ toString: () => '100000000' });
      });

      expect(await view.findByTestId(TestIds.BALANCE)).toHaveTextContent(
        strings('predict_next.deposit.available', { amount: '100.00' }),
      );
    });

    it('shows retryable alert on catalog error and recovers when retried', async () => {
      configurePredictNextCatalog(new Error('catalog failed'));
      mockFunding({});

      const view = renderPredictDepositScreen({ venueId: KALSHI_VENUE_ID });

      expect(await view.findByTestId(TestIds.ALERT)).toHaveTextContent(
        strings('predict_next.deposit.unavailable_error'),
      );
      expect(view.queryByTestId(TestIds.PAY_WITH)).not.toBeOnTheScreen();

      fireEvent.press(view.getByTestId(TestIds.KEYPAD_KEY('2')));
      fireEvent.press(view.getByTestId(TestIds.KEYPAD_KEY('5')));
      expect(view.getByTestId(TestIds.CONTINUE)).toBeDisabled();

      configurePredictNextCatalog({
        ...KALSHI_STATIC_VENUE_CATALOG,
        environment: 'production',
      });
      await act(async () => {
        fireEvent.press(view.getByTestId(TestIds.RETRY));
      });

      expect(await view.findByTestId(TestIds.BALANCE)).toHaveTextContent(
        strings('predict_next.deposit.available', { amount: '100.00' }),
      );
      expect(view.getByTestId(TestIds.CONTINUE)).toBeEnabled();
    });

    it('shows unavailable alert without retry when catalog is invalid', async () => {
      configurePredictNextCatalog({
        ...KALSHI_STATIC_VENUE_CATALOG,
        environment: 'staging',
      });
      mockFunding({});

      const view = renderPredictDepositScreen({ venueId: KALSHI_VENUE_ID });

      expect(await view.findByTestId(TestIds.ALERT)).toHaveTextContent(
        strings('predict_next.deposit.unavailable'),
      );
      expect(view.queryByTestId(TestIds.RETRY)).not.toBeOnTheScreen();
      expect(view.queryByTestId(TestIds.PAY_WITH)).not.toBeOnTheScreen();
    });

    it('keeps a legacy catalog omitting environment unavailable so it cannot prepare a deposit', async () => {
      const { environment: _omitted, ...legacyCatalog } =
        KALSHI_STATIC_VENUE_CATALOG;
      configurePredictNextCatalog(legacyCatalog);
      const prepareDeposit = jest.fn(async () => makeDeposit());
      mockFunding({
        'PredictFundingService:prepareDeposit': prepareDeposit,
      });

      const view = renderPredictDepositScreen({ venueId: KALSHI_VENUE_ID });

      expect(await view.findByTestId(TestIds.ALERT)).toHaveTextContent(
        strings('predict_next.deposit.unavailable'),
      );
      expect(view.queryByTestId(TestIds.RETRY)).not.toBeOnTheScreen();
      expect(view.queryByTestId(TestIds.PAY_WITH)).not.toBeOnTheScreen();
      expect(
        Engine.context.AssetsContractController.getERC20BalanceOf,
      ).not.toHaveBeenCalled();

      fireEvent.press(view.getByTestId(TestIds.KEYPAD_KEY('2')));
      fireEvent.press(view.getByTestId(TestIds.KEYPAD_KEY('5')));
      expect(view.getByTestId(TestIds.CONTINUE)).toBeDisabled();
      expect(prepareDeposit).not.toHaveBeenCalled();
    });

    it('reconciles a lost Base transfer report on Continue without cancelling when the catalog switches to sandbox', async () => {
      const queryClient = createComponentViewQueryClient();
      const openDeposit = makeDeposit({ amount: '25.00' });
      const prepareDeposit = jest
        .fn()
        .mockResolvedValueOnce(openDeposit)
        .mockRejectedValueOnce(
          PredictError.from(PredictErrorCode.DEPOSIT_IN_PROGRESS, {
            metadata: { depositOperationId: openDeposit.operationId },
          }),
        );
      const cancelDeposit = jest.fn(async () => ({
        ...openDeposit,
        status: 'cancelled',
        next: null,
      }));
      const reportDepositTransfer = jest
        .fn()
        .mockRejectedValueOnce(
          PredictError.from(PredictErrorCode.NETWORK_ERROR),
        )
        .mockResolvedValueOnce({ ...openDeposit, status: 'processing' });
      configurePredictNextCatalog({
        ...KALSHI_STATIC_VENUE_CATALOG,
        environment: 'production',
      });
      mockFunding({
        'PredictFundingService:prepareDeposit': prepareDeposit,
        'PredictFundingService:getDeposit': async () => openDeposit,
        'PredictFundingService:listOpenDeposits': async () => [openDeposit],
        'PredictFundingService:reportDepositTransfer': reportDepositTransfer,
        'PredictFundingService:cancelDeposit': cancelDeposit,
      });
      jest
        .mocked(Engine.context.TransactionController.addTransaction)
        .mockImplementation(async (txParams, options) => {
          const meta = {
            id: 'tx-1',
            chainId: '0x2105',
            networkClientId: 'base-mainnet',
            status: TransactionStatus.submitted,
            hash: TX_HASH,
            time: Date.now(),
            type: TransactionType.tokenMethodTransfer,
            requestId: options?.requestId,
            txParams,
          } as TransactionMeta;
          Engine.context.TransactionController.state.transactions = [meta];
          return {
            result: Promise.resolve(TX_HASH),
            transactionMeta: meta,
          };
        });

      const firstView = renderPredictDepositScreen(
        { venueId: KALSHI_VENUE_ID },
        { queryClient },
      );
      await typeAmount(firstView, '25');
      await addFunds(firstView);
      expect(
        await firstView.findByTestId(TestIds.PROCESSING),
      ).toBeOnTheScreen();
      firstView.unmount();

      // Drop the in-session cache and switch the catalog to sandbox.
      clearAllSessionDepositTransfers();
      configurePredictNextCatalog({
        ...KALSHI_STATIC_VENUE_CATALOG,
        environment: 'sandbox',
      });
      queryClient.clear();

      const secondView = renderPredictDepositScreen(
        { venueId: KALSHI_VENUE_ID },
        { queryClient },
      );
      await typeAmount(secondView, '10', TestIds.SIMULATED_CAPTION);
      await addFunds(secondView);
      await secondView.findByTestId(TestIds.IN_PROGRESS);
      expect(
        secondView.getByText(
          strings('predict_next.deposit.in_progress.processing', {
            amount: '$25.00',
          }),
        ),
      ).toBeOnTheScreen();
      expect(
        secondView.queryByTestId(TestIds.IN_PROGRESS_CANCEL),
      ).not.toBeOnTheScreen();

      await act(async () => {
        fireEvent.press(secondView.getByTestId(TestIds.IN_PROGRESS_CONTINUE));
      });

      expect(
        await secondView.findByTestId(TestIds.PROCESSING),
      ).toBeOnTheScreen();
      expect(cancelDeposit).not.toHaveBeenCalled();
      expect(
        Engine.context.TransactionController.addTransaction,
      ).toHaveBeenCalledTimes(1);
      expect(reportDepositTransfer).toHaveBeenCalledTimes(2);
      expect(reportDepositTransfer).toHaveBeenLastCalledWith(
        KALSHI_VENUE_ID,
        'op-1',
        { txHash: TX_HASH, chainId: BASE_DEPOSIT_NETWORK.chainId },
      );
      queryClient.clear();
    });

    it('switches an open sheet from sandbox to production when the catalog updates', async () => {
      const queryClient = createComponentViewQueryClient();
      const openDeposit = makeDeposit({ amount: '40.00' });
      const reportDepositTransfer = jest.fn(async () => ({
        ...openDeposit,
        status: 'processing',
      }));
      configurePredictNextCatalog({
        ...KALSHI_STATIC_VENUE_CATALOG,
        environment: 'sandbox',
      });
      mockFunding({
        'PredictFundingService:prepareDeposit': async () => {
          throw PredictError.from(PredictErrorCode.DEPOSIT_IN_PROGRESS);
        },
        'PredictFundingService:getDeposit': async () => openDeposit,
        'PredictFundingService:listOpenDeposits': async () => [openDeposit],
        'PredictFundingService:reportDepositTransfer': reportDepositTransfer,
      });
      mockWallet(async () => TX_HASH);

      const view = renderPredictDepositScreen(
        { venueId: KALSHI_VENUE_ID },
        { queryClient },
      );

      await typeAmount(view, '25', TestIds.SIMULATED_CAPTION);
      await addFunds(view);
      await view.findByTestId(TestIds.IN_PROGRESS);

      configurePredictNextCatalog({
        ...KALSHI_STATIC_VENUE_CATALOG,
        environment: 'production',
      });
      await act(async () => {
        await queryClient.invalidateQueries({
          queryKey: marketDataQueries.getVenueCatalog(KALSHI_VENUE_ID).queryKey,
        });
      });

      await waitFor(() =>
        expect(view.getByTestId(TestIds.PAY_WITH)).toHaveTextContent(
          /USDC on Base$/u,
        ),
      );

      await act(async () => {
        fireEvent.press(view.getByTestId(TestIds.IN_PROGRESS_CONTINUE));
      });

      expect(await view.findByTestId(TestIds.PROCESSING)).toBeOnTheScreen();
      expect(
        Engine.context.TransactionController.addTransaction,
      ).toHaveBeenCalledTimes(1);
      expect(reportDepositTransfer).toHaveBeenCalledWith(
        KALSHI_VENUE_ID,
        'op-1',
        { txHash: TX_HASH, chainId: BASE_DEPOSIT_NETWORK.chainId },
      );
      queryClient.clear();
    });

    it('keeps Continue enabled and reconciles a submitted transfer when the catalog updates to omit environment', async () => {
      const queryClient = createComponentViewQueryClient();
      const openDeposit = makeDeposit({ amount: '25.00' });
      const cancelDeposit = jest.fn(async () => ({
        ...openDeposit,
        status: 'cancelled',
        next: null,
      }));
      const reportDepositTransfer = jest.fn(async () => ({
        ...openDeposit,
        status: 'processing',
      }));
      Engine.context.TransactionController.state.transactions = [
        makeDepositTransferTx(openDeposit, {
          id: 'tx-submitted-legacy',
          txParams: {
            from: '0x0000000000000000000000000000000000000001',
            to: USDC,
            data: TRANSFER_25_USDC,
            value: '0x0',
          },
        }),
      ];
      configurePredictNextCatalog({
        ...KALSHI_STATIC_VENUE_CATALOG,
        environment: 'production',
      });
      mockFunding({
        'PredictFundingService:prepareDeposit': async () => {
          throw PredictError.from(PredictErrorCode.DEPOSIT_IN_PROGRESS);
        },
        'PredictFundingService:getDeposit': async () => openDeposit,
        'PredictFundingService:listOpenDeposits': async () => [openDeposit],
        'PredictFundingService:reportDepositTransfer': reportDepositTransfer,
        'PredictFundingService:cancelDeposit': cancelDeposit,
      });

      const view = renderPredictDepositScreen(
        { venueId: KALSHI_VENUE_ID },
        { queryClient },
      );

      await typeAmount(view, '10');
      await addFunds(view);
      await view.findByTestId(TestIds.IN_PROGRESS);

      const { environment: _omitted, ...legacyCatalog } =
        KALSHI_STATIC_VENUE_CATALOG;
      configurePredictNextCatalog(legacyCatalog);
      await act(async () => {
        await queryClient.invalidateQueries({
          queryKey: marketDataQueries.getVenueCatalog(KALSHI_VENUE_ID).queryKey,
        });
      });

      await waitFor(() =>
        expect(view.getByTestId(TestIds.ALERT)).toHaveTextContent(
          strings('predict_next.deposit.unavailable'),
        ),
      );

      expect(view.getByTestId(TestIds.IN_PROGRESS_CONTINUE)).toBeEnabled();
      expect(
        view.queryByTestId(TestIds.IN_PROGRESS_ALERT),
      ).not.toBeOnTheScreen();
      expect(
        view.queryByTestId(TestIds.IN_PROGRESS_CANCEL),
      ).not.toBeOnTheScreen();

      await act(async () => {
        fireEvent.press(view.getByTestId(TestIds.IN_PROGRESS_CONTINUE));
      });

      expect(await view.findByTestId(TestIds.PROCESSING)).toBeOnTheScreen();
      expect(cancelDeposit).not.toHaveBeenCalled();
      expect(
        Engine.context.TransactionController.addTransaction,
      ).not.toHaveBeenCalled();
      expect(reportDepositTransfer).toHaveBeenCalledWith(
        KALSHI_VENUE_ID,
        'op-1',
        { txHash: TX_HASH, chainId: BASE_DEPOSIT_NETWORK.chainId },
      );
      queryClient.clear();
    });
  });

  it('says there is not enough USDC on Base and blocks the deposit', async () => {
    mockUsdcBalance('10000000');
    mockFunding({});
    const view = renderPredictDepositScreen({ venueId: KALSHI_VENUE_ID });

    await typeAmount(view, '25');

    expect(view.getByTestId(TestIds.ALERT)).toHaveTextContent(
      strings('predict_next.deposit.not_enough_usdc', { network: 'Base' }),
    );
    expect(view.getByTestId(TestIds.CONTINUE)).toBeDisabled();
    fireEvent.press(view.getByTestId(TestIds.KEYPAD_KEY('delete')));
    expect(view.queryByTestId(TestIds.ALERT)).not.toBeOnTheScreen();
    expect(view.getByTestId(TestIds.CONTINUE)).toBeEnabled();
  });

  it('reads no balance while offline and never blocks on the unknown balance', async () => {
    netInfoMock.__setMockNetInfo({ type: 'none', isInternetReachable: false });
    mockFunding({});
    const view = renderPredictDepositScreen({ venueId: KALSHI_VENUE_ID });

    expect(await view.findByTestId(TestIds.BALANCE)).toHaveTextContent(
      strings('predict_next.deposit.balance_unavailable'),
    );
    expect(
      Engine.context.AssetsContractController.getERC20BalanceOf,
    ).not.toHaveBeenCalled();
    await typeAmount(view, '25');
    expect(view.getByTestId(TestIds.CONTINUE)).toBeEnabled();
  });

  it('asks for at least 1 USD', async () => {
    mockFunding({});
    const view = renderPredictDepositScreen({ venueId: KALSHI_VENUE_ID });

    await typeAmount(view, '0.5');

    expect(view.getByTestId(TestIds.ALERT)).toHaveTextContent(
      strings('predict_next.deposit.minimum'),
    );
    expect(view.getByTestId(TestIds.CONTINUE)).toBeDisabled();
  });

  it('shows the open deposit instead of starting another, and cancels it on request', async () => {
    const openDeposit = makeDeposit({ amount: '40.00' });
    const cancelDeposit = jest.fn(async () => ({
      ...openDeposit,
      status: 'cancelled',
      next: null,
    }));
    mockFunding({
      'PredictFundingService:prepareDeposit': async () => {
        throw PredictError.from(PredictErrorCode.DEPOSIT_IN_PROGRESS);
      },
      'PredictFundingService:listOpenDeposits': async () => [openDeposit],
      'PredictFundingService:cancelDeposit': cancelDeposit,
    });
    const view = renderPredictDepositScreen({ venueId: KALSHI_VENUE_ID });

    await typeAmount(view, '25');
    await addFunds(view);

    expect(
      await view.findByText(
        strings('predict_next.deposit.in_progress.awaiting_transfer', {
          amount: '$40.00',
        }),
      ),
    ).toBeOnTheScreen();
    expect(
      Engine.context.TransactionController.addTransaction,
    ).not.toHaveBeenCalled();
    await act(async () => {
      fireEvent.press(view.getByTestId(TestIds.IN_PROGRESS_CANCEL));
    });
    expect(cancelDeposit).toHaveBeenCalledWith(KALSHI_VENUE_ID, 'op-1');
    await waitFor(() =>
      expect(view.queryByTestId(TestIds.IN_PROGRESS)).not.toBeOnTheScreen(),
    );
  });

  it('pays an open deposit the user continues, for its own amount', async () => {
    const openDeposit = makeDeposit({ amount: '40.00' });
    const reportDepositTransfer = jest.fn(async () => ({
      ...openDeposit,
      status: 'processing',
    }));
    mockFunding({
      'PredictFundingService:prepareDeposit': async () => {
        throw PredictError.from(PredictErrorCode.DEPOSIT_IN_PROGRESS);
      },
      'PredictFundingService:getDeposit': async () => openDeposit,
      'PredictFundingService:listOpenDeposits': async () => [openDeposit],
      'PredictFundingService:reportDepositTransfer': reportDepositTransfer,
    });
    mockWallet(async () => TX_HASH);
    const view = renderPredictDepositScreen({ venueId: KALSHI_VENUE_ID });

    await typeAmount(view, '25');
    await addFunds(view);
    await view.findByTestId(TestIds.IN_PROGRESS);
    await act(async () => {
      fireEvent.press(view.getByTestId(TestIds.IN_PROGRESS_CONTINUE));
    });

    expect(await view.findByTestId(TestIds.PROCESSING)).toHaveTextContent(
      /\$40\.00/u,
    );
    expect(reportDepositTransfer).toHaveBeenCalledTimes(1);
  });

  it('refuses a Funding Plan that does not pay the typed amount, before any wallet call', async () => {
    const cancelDeposit = jest.fn(async () => undefined);
    mockFunding({
      'PredictFundingService:prepareDeposit': async () =>
        makeDeposit({ planAmount: '250.00' }),
      'PredictFundingService:cancelDeposit': cancelDeposit,
    });
    const view = renderPredictDepositScreen({ venueId: KALSHI_VENUE_ID });

    await typeAmount(view, '25');
    await addFunds(view);

    expect(await view.findByTestId(TestIds.NOTICE)).toHaveTextContent(
      strings('predict_next.deposit.plan_mismatch'),
    );
    expect(
      Engine.context.TransactionController.addTransaction,
    ).not.toHaveBeenCalled();
    expect(cancelDeposit).toHaveBeenCalledWith(KALSHI_VENUE_ID, 'op-1');
    expect(calledActions()).not.toContain(
      'PredictFundingService:reportDepositTransfer',
    );
  });

  it('refuses a Funding Plan with two minutes or less left', async () => {
    const cancelDeposit = jest.fn(async () => undefined);
    mockFunding({
      'PredictFundingService:prepareDeposit': async () =>
        makeDeposit({ planExpiresAt: minutesFromNow(1) }),
      'PredictFundingService:cancelDeposit': cancelDeposit,
    });
    const view = renderPredictDepositScreen({ venueId: KALSHI_VENUE_ID });

    await typeAmount(view, '25');
    await addFunds(view);

    expect(await view.findByTestId(TestIds.NOTICE)).toHaveTextContent(
      strings('predict_next.deposit.plan_mismatch'),
    );
    expect(
      Engine.context.TransactionController.addTransaction,
    ).not.toHaveBeenCalled();
    expect(cancelDeposit).toHaveBeenCalledWith(KALSHI_VENUE_ID, 'op-1');
  });

  it('cancels the deposit when the user rejects the confirmation, and lets them try again', async () => {
    const cancelDeposit = jest.fn(async () => undefined);
    const prepareDeposit = jest.fn(async () => makeDeposit());
    mockFunding({
      'PredictFundingService:prepareDeposit': prepareDeposit,
      'PredictFundingService:cancelDeposit': cancelDeposit,
    });
    mockWallet(async () => {
      throw providerErrors.userRejectedRequest();
    });
    const view = renderPredictDepositScreen({ venueId: KALSHI_VENUE_ID });

    await typeAmount(view, '25');
    await addFunds(view);

    expect(await view.findByTestId(TestIds.NOTICE)).toHaveTextContent(
      strings('predict_next.deposit.rejected'),
    );
    expect(cancelDeposit).toHaveBeenCalledWith(KALSHI_VENUE_ID, 'op-1');
    expect(calledActions()).not.toContain(
      'PredictFundingService:reportDepositTransfer',
    );
    expect(view.getByTestId(TestIds.ADD_FUNDS)).toBeEnabled();

    await act(async () => {
      fireEvent.press(view.getByTestId(TestIds.ADD_FUNDS));
    });
    const [[, firstParams], [, secondParams]] = prepareDeposit.mock
      .calls as unknown as [string, { clientOperationId: string }][];
    expect(secondParams.clientOperationId).not.toBe(
      firstParams.clientOperationId,
    );
  });

  it('announces the minimum amount error as an alert once while the message stays the same', async () => {
    mockFunding({});
    const view = renderPredictDepositScreen({ venueId: KALSHI_VENUE_ID });

    await typeAmount(view, '0.5');

    expect(view.getByTestId(TestIds.ALERT)).toHaveProp(
      'accessibilityRole',
      'alert',
    );
    expect(announceForAccessibility).toHaveBeenLastCalledWith(
      strings('predict_next.deposit.minimum'),
    );

    announceForAccessibility.mockClear();
    fireEvent.press(view.getByTestId(TestIds.KEYPAD_KEY('0')));
    expect(announceForAccessibility).not.toHaveBeenCalled();
  });

  it('announces the not-enough-USDC error as an alert', async () => {
    mockUsdcBalance('10000000');
    mockFunding({});
    const view = renderPredictDepositScreen({ venueId: KALSHI_VENUE_ID });

    await typeAmount(view, '25');

    expect(view.getByTestId(TestIds.ALERT)).toHaveProp(
      'accessibilityRole',
      'alert',
    );
    expect(announceForAccessibility).toHaveBeenCalledTimes(1);
    expect(announceForAccessibility).toHaveBeenCalledWith(
      strings('predict_next.deposit.not_enough_usdc', { network: 'Base' }),
    );
  });

  it('announces a failing deposit notice as an alert', async () => {
    mockFunding({
      'PredictFundingService:prepareDeposit': async () => makeDeposit(),
      'PredictFundingService:cancelDeposit': async () => undefined,
    });
    mockWallet(async () => {
      throw providerErrors.userRejectedRequest();
    });
    const view = renderPredictDepositScreen({ venueId: KALSHI_VENUE_ID });

    await typeAmount(view, '25');
    await addFunds(view);

    const notice = await view.findByTestId(TestIds.NOTICE);
    expect(notice).toHaveProp('accessibilityRole', 'alert');
    expect(announceForAccessibility).toHaveBeenCalledTimes(1);
    expect(announceForAccessibility).toHaveBeenCalledWith(
      strings('predict_next.deposit.rejected'),
    );
  });

  it('announces when cancelling an open deposit fails', async () => {
    const openDeposit = makeDeposit({ amount: '40.00' });
    mockFunding({
      'PredictFundingService:prepareDeposit': async () => {
        throw PredictError.from(PredictErrorCode.DEPOSIT_IN_PROGRESS);
      },
      'PredictFundingService:listOpenDeposits': async () => [openDeposit],
      'PredictFundingService:cancelDeposit': async () => {
        throw new Error('cancel failed');
      },
    });
    const view = renderPredictDepositScreen({ venueId: KALSHI_VENUE_ID });

    await typeAmount(view, '25');
    await addFunds(view);
    await view.findByTestId(TestIds.IN_PROGRESS);

    await act(async () => {
      fireEvent.press(view.getByTestId(TestIds.IN_PROGRESS_CANCEL));
    });

    const cancelFailed = await view.findByText(
      strings('predict_next.deposit.in_progress.cancel_failed'),
    );
    expect(cancelFailed).toHaveProp('accessibilityRole', 'alert');
    expect(announceForAccessibility).toHaveBeenCalledTimes(1);
    expect(announceForAccessibility).toHaveBeenCalledWith(
      strings('predict_next.deposit.in_progress.cancel_failed'),
    );
  });

  it('copies the support reference of an open deposit under review and announces it', async () => {
    const reviewDeposit: PredictDepositOperation = {
      ...makeDeposit({ amount: '40.00', status: 'under_review' }),
      next: { kind: 'review', supportReference: 'REF-12345' },
    };
    mockFunding({
      'PredictFundingService:prepareDeposit': async () => {
        throw PredictError.from(PredictErrorCode.DEPOSIT_IN_PROGRESS);
      },
      'PredictFundingService:listOpenDeposits': async () => [reviewDeposit],
    });
    const view = renderPredictDepositScreen({ venueId: KALSHI_VENUE_ID });

    await typeAmount(view, '25');
    await addFunds(view);
    const copyButton = await view.findByTestId(
      TestIds.IN_PROGRESS_COPY_REFERENCE,
    );

    expect(copyButton).toHaveStyle({ width: 20, height: 20 });
    expect(copyButton).toHaveProp('hitSlop', {
      top: 12,
      bottom: 12,
      left: 12,
      right: 12,
    });
    expect(copyButton).toHaveProp(
      'accessibilityLabel',
      strings('predict_next.deposit.status.copy_reference'),
    );
    fireEvent.press(copyButton);
    expect(Clipboard.setString).toHaveBeenCalledWith('REF-12345');
    expect(announceForAccessibility).toHaveBeenCalledWith(
      strings('predict_next.deposit.status.reference_copied'),
    );
  });

  it('marks the processing title as a heading', async () => {
    mockFunding({
      'PredictFundingService:prepareDeposit': async () => makeDeposit(),
      'PredictFundingService:reportDepositTransfer': async () =>
        makeDeposit({ status: 'processing' }),
    });
    mockWallet(async () => TX_HASH);
    const view = renderPredictDepositScreen({ venueId: KALSHI_VENUE_ID });

    await typeAmount(view, '25');
    await addFunds(view);
    await view.findByTestId(TestIds.PROCESSING);

    expect(
      view.getByText(strings('predict_next.deposit.processing_title')),
    ).toHaveProp('accessibilityRole', 'header');
  });

  it('reconciles a lost transfer report on re-entry and Continue without sending a second wallet transfer', async () => {
    const openDeposit = makeDeposit({ amount: '25.00' });
    const prepareDeposit = jest
      .fn()
      .mockResolvedValueOnce(openDeposit)
      .mockRejectedValueOnce(
        PredictError.from(PredictErrorCode.DEPOSIT_IN_PROGRESS, {
          metadata: { depositOperationId: openDeposit.operationId },
        }),
      );
    const reportDepositTransfer = jest
      .fn()
      .mockRejectedValueOnce(PredictError.from(PredictErrorCode.NETWORK_ERROR))
      .mockResolvedValueOnce({ ...openDeposit, status: 'processing' });
    mockFunding({
      'PredictFundingService:prepareDeposit': prepareDeposit,
      'PredictFundingService:getDeposit': async () => openDeposit,
      'PredictFundingService:listOpenDeposits': async () => [openDeposit],
      'PredictFundingService:reportDepositTransfer': reportDepositTransfer,
    });
    jest
      .mocked(Engine.context.TransactionController.addTransaction)
      .mockImplementation(async (txParams, options) => {
        const meta = {
          id: 'tx-1',
          chainId: '0x2105',
          networkClientId: 'base-mainnet',
          status: TransactionStatus.submitted,
          hash: TX_HASH,
          time: Date.now(),
          type: TransactionType.tokenMethodTransfer,
          requestId: options?.requestId,
          txParams,
        } as TransactionMeta;
        Engine.context.TransactionController.state.transactions = [meta];
        return {
          result: Promise.resolve(TX_HASH),
          transactionMeta: meta,
        } as never;
      });
    const firstView = renderPredictDepositScreen({ venueId: KALSHI_VENUE_ID });

    await typeAmount(firstView, '25');
    await addFunds(firstView);
    expect(await firstView.findByTestId(TestIds.PROCESSING)).toBeOnTheScreen();
    fireEvent.press(firstView.getByTestId(TestIds.DONE));
    expect(
      await firstView.findByTestId(getRouteProbeTestId(PredictNextRoutes.HOME)),
    ).toBeOnTheScreen();
    firstView.unmount();

    const secondView = renderPredictDepositScreen({ venueId: KALSHI_VENUE_ID });
    await typeAmount(secondView, '10');
    await addFunds(secondView);
    await secondView.findByTestId(TestIds.IN_PROGRESS);
    expect(
      secondView.getByText(
        strings('predict_next.deposit.in_progress.processing', {
          amount: '$25.00',
        }),
      ),
    ).toBeOnTheScreen();
    expect(
      secondView.queryByTestId(TestIds.IN_PROGRESS_CANCEL),
    ).not.toBeOnTheScreen();
    await act(async () => {
      fireEvent.press(secondView.getByTestId(TestIds.IN_PROGRESS_CONTINUE));
    });

    expect(await secondView.findByTestId(TestIds.PROCESSING)).toBeOnTheScreen();
    expect(
      Engine.context.TransactionController.addTransaction,
    ).toHaveBeenCalledTimes(1);
    expect(reportDepositTransfer).toHaveBeenCalledTimes(2);
    expect(reportDepositTransfer).toHaveBeenLastCalledWith(
      KALSHI_VENUE_ID,
      'op-1',
      { txHash: TX_HASH, chainId: BASE_DEPOSIT_NETWORK.chainId },
    );
  });

  it('reports an already-submitted unreported transfer from TransactionController on Continue without calling the wallet', async () => {
    const openDeposit = makeDeposit({ amount: '25.00' });
    const reportDepositTransfer = jest.fn(async () => ({
      ...openDeposit,
      status: 'processing',
    }));
    Engine.context.TransactionController.state.transactions = [
      {
        id: 'tx-persisted',
        chainId: '0x2105',
        networkClientId: 'base-mainnet',
        status: TransactionStatus.confirmed,
        hash: TX_HASH,
        time: Date.parse(openDeposit.createdAt) + 1000,
        type: TransactionType.tokenMethodTransfer,
        txParams: {
          from: '0x0000000000000000000000000000000000000001',
          to: USDC,
          data: TRANSFER_25_USDC,
          value: '0x0',
        },
      } as TransactionMeta,
    ];
    mockFunding({
      'PredictFundingService:prepareDeposit': async () => {
        throw PredictError.from(PredictErrorCode.DEPOSIT_IN_PROGRESS);
      },
      'PredictFundingService:getDeposit': async () => openDeposit,
      'PredictFundingService:listOpenDeposits': async () => [openDeposit],
      'PredictFundingService:reportDepositTransfer': reportDepositTransfer,
    });
    const view = renderPredictDepositScreen({ venueId: KALSHI_VENUE_ID });

    await typeAmount(view, '10');
    await addFunds(view);
    await view.findByTestId(TestIds.IN_PROGRESS);
    expect(
      view.queryByTestId(TestIds.IN_PROGRESS_CANCEL),
    ).not.toBeOnTheScreen();
    await act(async () => {
      fireEvent.press(view.getByTestId(TestIds.IN_PROGRESS_CONTINUE));
    });

    expect(await view.findByTestId(TestIds.PROCESSING)).toBeOnTheScreen();
    expect(
      Engine.context.TransactionController.addTransaction,
    ).not.toHaveBeenCalled();
    expect(reportDepositTransfer).toHaveBeenCalledWith(
      KALSHI_VENUE_ID,
      'op-1',
      { txHash: TX_HASH, chainId: BASE_DEPOSIT_NETWORK.chainId },
    );
  });

  it('waits for an existing pending transaction on Continue instead of adding a second transfer', async () => {
    const openDeposit = makeDeposit({ amount: '25.00' });
    const reportDepositTransfer = jest.fn(async () => ({
      ...openDeposit,
      status: 'processing',
    }));
    const pendingTx = {
      id: 'tx-pending',
      chainId: '0x2105',
      networkClientId: 'base-mainnet',
      status: TransactionStatus.unapproved,
      time: Date.parse(openDeposit.createdAt) + 1000,
      type: TransactionType.tokenMethodTransfer,
      txParams: {
        from: '0x0000000000000000000000000000000000000001',
        to: USDC,
        data: TRANSFER_25_USDC,
        value: '0x0',
      },
    } as TransactionMeta;
    Engine.context.TransactionController.state.transactions = [pendingTx];
    const listeners = new Map<string, Set<(...args: never[]) => void>>();
    jest.spyOn(Engine.controllerMessenger, 'subscribe').mockImplementation(((
      event: string,
      handler: (...args: never[]) => void,
    ) => {
      let set = listeners.get(event);
      if (!set) {
        set = new Set();
        listeners.set(event, set);
      }
      set.add(handler);
    }) as never);
    jest.spyOn(Engine.controllerMessenger, 'unsubscribe').mockImplementation(((
      event: string,
      handler: (...args: never[]) => void,
    ) => {
      listeners.get(event)?.delete(handler);
    }) as never);
    mockFunding({
      'PredictFundingService:prepareDeposit': async () => {
        throw PredictError.from(PredictErrorCode.DEPOSIT_IN_PROGRESS);
      },
      'PredictFundingService:getDeposit': async () => openDeposit,
      'PredictFundingService:listOpenDeposits': async () => [openDeposit],
      'PredictFundingService:reportDepositTransfer': reportDepositTransfer,
    });
    const view = renderPredictDepositScreen({ venueId: KALSHI_VENUE_ID });

    await typeAmount(view, '10');
    await addFunds(view);
    await view.findByTestId(TestIds.IN_PROGRESS);
    await act(async () => {
      fireEvent.press(view.getByTestId(TestIds.IN_PROGRESS_CONTINUE));
      const submittedTx = {
        ...pendingTx,
        status: TransactionStatus.submitted,
        hash: TX_HASH,
      };
      Engine.context.TransactionController.state.transactions = [submittedTx];
      for (const handler of listeners.get(
        'TransactionController:transactionSubmitted',
      ) ?? []) {
        (handler as (payload: { transactionMeta: TransactionMeta }) => void)({
          transactionMeta: submittedTx,
        });
      }
    });

    expect(await view.findByTestId(TestIds.PROCESSING)).toBeOnTheScreen();
    expect(
      Engine.context.TransactionController.addTransaction,
    ).not.toHaveBeenCalled();
    expect(reportDepositTransfer).toHaveBeenCalledWith(
      KALSHI_VENUE_ID,
      'op-1',
      { txHash: TX_HASH, chainId: BASE_DEPOSIT_NETWORK.chainId },
    );
  });

  it('reconciles a lost transfer after restart without duplicating when the device clock is behind createdAt', async () => {
    const futureCreatedAt = new Date(
      Date.now() + 10 * 60_000,
    ).toISOString() as PredictTimestamp;
    const openDeposit = makeDeposit({
      operationId: 'op-skew',
      amount: '25.00',
      createdAt: futureCreatedAt,
    });
    const prepareDeposit = jest
      .fn()
      .mockResolvedValueOnce(openDeposit)
      .mockRejectedValueOnce(
        PredictError.from(PredictErrorCode.DEPOSIT_IN_PROGRESS, {
          metadata: { depositOperationId: openDeposit.operationId },
        }),
      );
    const reportDepositTransfer = jest
      .fn()
      .mockRejectedValueOnce(PredictError.from(PredictErrorCode.NETWORK_ERROR))
      .mockResolvedValueOnce({ ...openDeposit, status: 'processing' });
    mockFunding({
      'PredictFundingService:prepareDeposit': prepareDeposit,
      'PredictFundingService:getDeposit': async () => openDeposit,
      'PredictFundingService:listOpenDeposits': async () => [openDeposit],
      'PredictFundingService:reportDepositTransfer': reportDepositTransfer,
    });
    jest
      .mocked(Engine.context.TransactionController.addTransaction)
      .mockImplementation(async (txParams, options) => {
        const meta = {
          id: 'tx-skew',
          chainId: '0x2105',
          networkClientId: 'base-mainnet',
          status: TransactionStatus.submitted,
          hash: TX_HASH,
          time: Date.parse(futureCreatedAt) - 10 * 60_000,
          type: TransactionType.tokenMethodTransfer,
          requestId: options?.requestId,
          txParams,
        } as TransactionMeta;
        Engine.context.TransactionController.state.transactions = [meta];
        return {
          result: Promise.resolve(TX_HASH),
          transactionMeta: meta,
        } as never;
      });

    const firstView = renderPredictDepositScreen({ venueId: KALSHI_VENUE_ID });
    await typeAmount(firstView, '25');
    await addFunds(firstView);
    expect(await firstView.findByTestId(TestIds.PROCESSING)).toBeOnTheScreen();
    firstView.unmount();

    // Simulate app restart losing the in-memory session cache while TransactionController persists.
    clearAllSessionDepositTransfers();

    const secondView = renderPredictDepositScreen({ venueId: KALSHI_VENUE_ID });
    await typeAmount(secondView, '10');
    await addFunds(secondView);
    await secondView.findByTestId(TestIds.IN_PROGRESS);
    expect(
      secondView.getByText(
        strings('predict_next.deposit.in_progress.processing', {
          amount: '$25.00',
        }),
      ),
    ).toBeOnTheScreen();
    expect(
      secondView.queryByTestId(TestIds.IN_PROGRESS_CANCEL),
    ).not.toBeOnTheScreen();

    await act(async () => {
      fireEvent.press(secondView.getByTestId(TestIds.IN_PROGRESS_CONTINUE));
    });

    expect(await secondView.findByTestId(TestIds.PROCESSING)).toBeOnTheScreen();
    expect(
      Engine.context.TransactionController.addTransaction,
    ).toHaveBeenCalledTimes(1);
    expect(reportDepositTransfer).toHaveBeenCalledTimes(2);
    expect(reportDepositTransfer).toHaveBeenLastCalledWith(
      KALSHI_VENUE_ID,
      'op-skew',
      { txHash: TX_HASH, chainId: BASE_DEPOSIT_NETWORK.chainId },
    );
  });

  it('does not reuse a previous operation transfer at the same address and amount for a new operationId', async () => {
    const newDeposit = makeDeposit({
      operationId: 'op-new',
      amount: '25.00',
    });
    const reportDepositTransfer = jest.fn(async () => ({
      ...newDeposit,
      status: 'processing',
    }));
    const newHash: PredictHex = `0x${'cd'.repeat(32)}`;
    Engine.context.TransactionController.state.transactions = [
      {
        id: 'tx-old-op',
        chainId: '0x2105',
        networkClientId: 'base-mainnet',
        status: TransactionStatus.confirmed,
        hash: TX_HASH,
        time: Date.parse(newDeposit.createdAt) + 1000,
        type: TransactionType.tokenMethodTransfer,
        requestId: depositTransferRequestId('op-old'),
        txParams: {
          from: '0x0000000000000000000000000000000000000001',
          to: USDC,
          data: TRANSFER_25_USDC,
          value: '0x0',
        },
      } as TransactionMeta,
    ];
    mockFunding({
      'PredictFundingService:prepareDeposit': async () => {
        throw PredictError.from(PredictErrorCode.DEPOSIT_IN_PROGRESS);
      },
      'PredictFundingService:getDeposit': async () => newDeposit,
      'PredictFundingService:listOpenDeposits': async () => [newDeposit],
      'PredictFundingService:reportDepositTransfer': reportDepositTransfer,
    });
    mockWallet(async () => newHash);

    const view = renderPredictDepositScreen({ venueId: KALSHI_VENUE_ID });
    await typeAmount(view, '10');
    await addFunds(view);
    await view.findByTestId(TestIds.IN_PROGRESS);
    expect(view.getByTestId(TestIds.IN_PROGRESS_CANCEL)).toBeOnTheScreen();

    await act(async () => {
      fireEvent.press(view.getByTestId(TestIds.IN_PROGRESS_CONTINUE));
    });

    expect(await view.findByTestId(TestIds.PROCESSING)).toBeOnTheScreen();
    expect(
      Engine.context.TransactionController.addTransaction,
    ).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        requestId: depositTransferRequestId('op-new'),
      }),
    );
    expect(reportDepositTransfer).toHaveBeenCalledWith(
      KALSHI_VENUE_ID,
      'op-new',
      { txHash: newHash, chainId: BASE_DEPOSIT_NETWORK.chainId },
    );
  });

  it('rejects a matching unapproved wallet transaction when cancelling an open deposit', async () => {
    const openDeposit = makeDeposit({
      operationId: 'op-cancel',
      amount: '25.00',
    });
    const cancelDeposit = jest.fn(async () => ({
      ...openDeposit,
      status: 'cancelled',
      next: null,
    }));
    Engine.context.TransactionController.state.transactions = [
      {
        id: 'tx-unapproved-match',
        chainId: '0x2105',
        networkClientId: 'base-mainnet',
        status: TransactionStatus.unapproved,
        time: Date.parse(openDeposit.createdAt) - 300_000,
        type: TransactionType.tokenMethodTransfer,
        requestId: depositTransferRequestId('op-cancel'),
        txParams: {
          from: '0x0000000000000000000000000000000000000001',
          to: USDC,
          data: TRANSFER_25_USDC,
          value: '0x0',
        },
      } as TransactionMeta,
      {
        id: 'tx-unapproved-unrelated',
        chainId: '0x2105',
        networkClientId: 'base-mainnet',
        status: TransactionStatus.unapproved,
        time: Date.parse(openDeposit.createdAt) + 1000,
        type: TransactionType.tokenMethodTransfer,
        requestId: depositTransferRequestId('op-other'),
        txParams: {
          from: '0x0000000000000000000000000000000000000001',
          to: USDC,
          data: TRANSFER_25_USDC,
          value: '0x0',
        },
      } as TransactionMeta,
    ];
    mockFunding({
      'PredictFundingService:prepareDeposit': async () => {
        throw PredictError.from(PredictErrorCode.DEPOSIT_IN_PROGRESS);
      },
      'PredictFundingService:listOpenDeposits': async () => [openDeposit],
      'PredictFundingService:cancelDeposit': cancelDeposit,
    });

    const view = renderPredictDepositScreen({ venueId: KALSHI_VENUE_ID });
    await typeAmount(view, '10');
    await addFunds(view);
    await view.findByTestId(TestIds.IN_PROGRESS);

    await act(async () => {
      fireEvent.press(view.getByTestId(TestIds.IN_PROGRESS_CANCEL));
    });

    expect(cancelDeposit).toHaveBeenCalledWith(KALSHI_VENUE_ID, 'op-cancel');
    expect(
      Engine.context.ApprovalController.rejectRequest,
    ).toHaveBeenCalledTimes(1);
    expect(
      Engine.context.ApprovalController.rejectRequest,
    ).toHaveBeenCalledWith(
      'tx-unapproved-match',
      providerErrors.userRejectedRequest(),
    );
    await waitFor(() =>
      expect(view.queryByTestId(TestIds.IN_PROGRESS)).not.toBeOnTheScreen(),
    );
  });

  it('rejects a matching unapproved wallet transaction when auto-cancelling a near-expiry deposit on Continue', async () => {
    const nearExpiryDeposit = makeDeposit({
      operationId: 'op-expiring',
      amount: '25.00',
      planExpiresAt: minutesFromNow(1),
    });
    const cancelDeposit = jest.fn(async () => ({
      ...nearExpiryDeposit,
      status: 'cancelled',
      next: null,
    }));
    Engine.context.TransactionController.state.transactions = [
      {
        id: 'tx-unapproved-expiring',
        chainId: '0x2105',
        networkClientId: 'base-mainnet',
        status: TransactionStatus.unapproved,
        time: Date.parse(nearExpiryDeposit.createdAt) + 1000,
        type: TransactionType.tokenMethodTransfer,
        requestId: depositTransferRequestId('op-expiring'),
        txParams: {
          from: '0x0000000000000000000000000000000000000001',
          to: USDC,
          data: TRANSFER_25_USDC,
          value: '0x0',
        },
      } as TransactionMeta,
    ];
    mockFunding({
      'PredictFundingService:prepareDeposit': async () => {
        throw PredictError.from(PredictErrorCode.DEPOSIT_IN_PROGRESS);
      },
      'PredictFundingService:getDeposit': async () => nearExpiryDeposit,
      'PredictFundingService:listOpenDeposits': async () => [nearExpiryDeposit],
      'PredictFundingService:cancelDeposit': cancelDeposit,
    });

    const view = renderPredictDepositScreen({ venueId: KALSHI_VENUE_ID });
    await typeAmount(view, '10');
    await addFunds(view);
    await view.findByTestId(TestIds.IN_PROGRESS);

    await act(async () => {
      fireEvent.press(view.getByTestId(TestIds.IN_PROGRESS_CONTINUE));
    });

    expect(await view.findByTestId(TestIds.NOTICE)).toHaveTextContent(
      strings('predict_next.deposit.plan_mismatch'),
    );
    expect(
      Engine.context.TransactionController.addTransaction,
    ).not.toHaveBeenCalled();
    expect(
      Engine.context.ApprovalController.rejectRequest,
    ).toHaveBeenCalledTimes(1);
    expect(
      Engine.context.ApprovalController.rejectRequest,
    ).toHaveBeenCalledWith(
      'tx-unapproved-expiring',
      providerErrors.userRejectedRequest(),
    );
    expect(cancelDeposit).toHaveBeenCalledWith(KALSHI_VENUE_ID, 'op-expiring');
  });
});
