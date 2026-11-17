import '../../../../../../tests/component-view/mocks';
import { AccessibilityInfo } from 'react-native';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { providerErrors } from '@metamask/rpc-errors';
import { TransactionType } from '@metamask/transaction-controller';
import NetInfo from '@react-native-community/netinfo';
import type NetInfoMock from '../../../../../__mocks__/@react-native-community/netinfo';
import { renderPredictDepositScreen } from '../../../../../../tests/component-view/renderers/predictNext';
import { mockPredictNextMessenger } from '../../../../../../tests/component-view/fixtures/predictNext';
import Engine from '../../../../../core/Engine';
import { strings } from '../../../../../../locales/i18n';
import { KALSHI_VENUE_ID } from '../../adapters/remote/KalshiRemoteAdapter';
import {
  BASE_DEPOSIT_NETWORK,
  type PredictDepositEnvironment,
} from '../../config/depositEnvironment';
import { PredictError, PredictErrorCode } from '../../errors';
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
const WALLET_ENVIRONMENT: PredictDepositEnvironment = {
  network: BASE_DEPOSIT_NETWORK,
  transferMode: 'wallet',
};
const SIMULATED_ENVIRONMENT: PredictDepositEnvironment = {
  network: BASE_DEPOSIT_NETWORK,
  transferMode: 'simulated',
};
/** `transfer(DEPOSIT_ADDRESS, 25000000)`: $25.00 in USDC base units. */
const TRANSFER_25_USDC = `0xa9059cbb${DEPOSIT_ADDRESS.slice(2).padStart(
  64,
  '0',
)}${(25_000_000).toString(16).padStart(64, '0')}`;

const netInfoMock = NetInfo as unknown as typeof NetInfoMock;

const minutesFromNow = (minutes: number): PredictTimestamp =>
  new Date(Date.now() + minutes * 60_000).toISOString() as PredictTimestamp;

const makeDeposit = ({
  amount = '25.00',
  planAmount = amount,
  planExpiresAt = minutesFromNow(10),
  status = 'awaiting_transfer',
  withPlan = true,
}: {
  amount?: string;
  planAmount?: string;
  planExpiresAt?: PredictTimestamp;
  status?: PredictDepositOperation['status'];
  withPlan?: boolean;
} = {}): PredictDepositOperation => ({
  operationId: 'op-1' as PredictEntityId,
  status,
  amount: amount as PredictAmount,
  chainId: BASE_DEPOSIT_NETWORK.chainId,
  tokenContract: USDC,
  depositAddress: DEPOSIT_ADDRESS,
  planExpiresAt,
  txHash: null,
  createdAt: new Date().toISOString() as PredictTimestamp,
  next: withPlan
    ? {
        kind: 'wallet_transfer',
        chainId: BASE_DEPOSIT_NETWORK.chainId,
        tokenContract: USDC,
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
      async (txParams) =>
        ({
          result: result(),
          transactionMeta: { id: 'tx-1', chainId: '0x2105', txParams },
        }) as never,
    );
};

const typeAmount = async (
  view: ReturnType<typeof renderPredictDepositScreen>,
  keys: string,
): Promise<void> => {
  await view.findByTestId(TestIds.BALANCE);
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

  beforeEach(() => {
    jest.clearAllMocks();
    announceForAccessibility = jest
      .spyOn(AccessibilityInfo, 'announceForAccessibility')
      .mockImplementation(() => undefined);
    netInfoMock.__setMockNetInfo({ type: 'wifi', isInternetReachable: true });
    mockUsdcBalance('100000000');
  });

  afterEach(() => {
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
    const view = renderPredictDepositScreen(
      { venueId: KALSHI_VENUE_ID },
      { environment: WALLET_ENVIRONMENT },
    );

    expect(await view.findByTestId(TestIds.BALANCE)).toHaveTextContent(
      strings('predict_next.deposit.available', { amount: '100.00' }),
    );
    expect(view.getByTestId(TestIds.PAY_WITH)).toHaveTextContent(
      /USDC on Base/u,
    );
    await typeAmount(view, '25');
    expect(view.getByTestId(TestIds.AMOUNT)).toHaveTextContent('$25');
    await addFunds(view);

    expect(await view.findByTestId(TestIds.PROCESSING)).toBeTruthy();
    expect(
      view.getByText(
        strings('predict_next.deposit.processing_description', {
          amount: '$25.00',
        }),
      ),
    ).toBeTruthy();
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
    expect(await view.findByTestId('route-PredictNextHome')).toBeTruthy();
  });

  it('simulates the transfer on a dev build and never touches the wallet', async () => {
    const reportDepositTransfer = jest.fn(async () =>
      makeDeposit({ status: 'processing' }),
    );
    mockFunding({
      'PredictFundingService:prepareDeposit': async () => makeDeposit(),
      'PredictFundingService:reportDepositTransfer': reportDepositTransfer,
    });
    const view = renderPredictDepositScreen(
      { venueId: KALSHI_VENUE_ID },
      { environment: SIMULATED_ENVIRONMENT },
    );

    await typeAmount(view, '25');
    await addFunds(view);

    expect(await view.findByTestId(TestIds.PROCESSING)).toBeTruthy();
    expect(
      Engine.context.TransactionController.addTransaction,
    ).not.toHaveBeenCalled();
    expect(reportDepositTransfer).toHaveBeenCalledWith(
      KALSHI_VENUE_ID,
      'op-1',
      {
        txHash: expect.stringMatching(/^0x[0-9a-f]{64}$/u),
        chainId: BASE_DEPOSIT_NETWORK.chainId,
      },
    );
  });

  it('says there is not enough USDC on Base and blocks the deposit', async () => {
    mockUsdcBalance('10000000');
    mockFunding({});
    const view = renderPredictDepositScreen(
      { venueId: KALSHI_VENUE_ID },
      { environment: WALLET_ENVIRONMENT },
    );

    await typeAmount(view, '25');

    expect(view.getByTestId(TestIds.ALERT)).toHaveTextContent(
      strings('predict_next.deposit.not_enough_usdc', { network: 'Base' }),
    );
    expect(view.getByTestId(TestIds.CONTINUE)).toBeDisabled();
    fireEvent.press(view.getByTestId(TestIds.KEYPAD_KEY('delete')));
    expect(view.queryByTestId(TestIds.ALERT)).toBeNull();
    expect(view.getByTestId(TestIds.CONTINUE)).toBeEnabled();
  });

  it('reads no balance while offline and never blocks on the unknown balance', async () => {
    netInfoMock.__setMockNetInfo({ type: 'none', isInternetReachable: false });
    mockFunding({});
    const view = renderPredictDepositScreen(
      { venueId: KALSHI_VENUE_ID },
      { environment: WALLET_ENVIRONMENT },
    );

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
    const view = renderPredictDepositScreen(
      { venueId: KALSHI_VENUE_ID },
      { environment: WALLET_ENVIRONMENT },
    );

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
    const view = renderPredictDepositScreen(
      { venueId: KALSHI_VENUE_ID },
      { environment: WALLET_ENVIRONMENT },
    );

    await typeAmount(view, '25');
    await addFunds(view);

    expect(
      await view.findByText(
        strings('predict_next.deposit.in_progress.awaiting_transfer', {
          amount: '$40.00',
        }),
      ),
    ).toBeTruthy();
    expect(
      Engine.context.TransactionController.addTransaction,
    ).not.toHaveBeenCalled();
    await act(async () => {
      fireEvent.press(view.getByTestId(TestIds.IN_PROGRESS_CANCEL));
    });
    expect(cancelDeposit).toHaveBeenCalledWith(KALSHI_VENUE_ID, 'op-1');
    await waitFor(() =>
      expect(view.queryByTestId(TestIds.IN_PROGRESS)).toBeNull(),
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
      'PredictFundingService:listOpenDeposits': async () => [openDeposit],
      'PredictFundingService:reportDepositTransfer': reportDepositTransfer,
    });
    mockWallet(async () => TX_HASH);
    const view = renderPredictDepositScreen(
      { venueId: KALSHI_VENUE_ID },
      { environment: WALLET_ENVIRONMENT },
    );

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
    const view = renderPredictDepositScreen(
      { venueId: KALSHI_VENUE_ID },
      { environment: WALLET_ENVIRONMENT },
    );

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
    const view = renderPredictDepositScreen(
      { venueId: KALSHI_VENUE_ID },
      { environment: WALLET_ENVIRONMENT },
    );

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
    mockWallet(() => Promise.reject(providerErrors.userRejectedRequest()));
    const view = renderPredictDepositScreen(
      { venueId: KALSHI_VENUE_ID },
      { environment: WALLET_ENVIRONMENT },
    );

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
    const view = renderPredictDepositScreen(
      { venueId: KALSHI_VENUE_ID },
      { environment: WALLET_ENVIRONMENT },
    );

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
    const view = renderPredictDepositScreen(
      { venueId: KALSHI_VENUE_ID },
      { environment: WALLET_ENVIRONMENT },
    );

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
    mockWallet(() => Promise.reject(providerErrors.userRejectedRequest()));
    const view = renderPredictDepositScreen(
      { venueId: KALSHI_VENUE_ID },
      { environment: WALLET_ENVIRONMENT },
    );

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
    const view = renderPredictDepositScreen(
      { venueId: KALSHI_VENUE_ID },
      { environment: WALLET_ENVIRONMENT },
    );

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

  it('marks the processing title as a heading', async () => {
    mockFunding({
      'PredictFundingService:prepareDeposit': async () => makeDeposit(),
      'PredictFundingService:reportDepositTransfer': async () =>
        makeDeposit({ status: 'processing' }),
    });
    mockWallet(async () => TX_HASH);
    const view = renderPredictDepositScreen(
      { venueId: KALSHI_VENUE_ID },
      { environment: WALLET_ENVIRONMENT },
    );

    await typeAmount(view, '25');
    await addFunds(view);
    await view.findByTestId(TestIds.PROCESSING);

    expect(
      view.getByText(strings('predict_next.deposit.processing_title')),
    ).toHaveProp('accessibilityRole', 'header');
  });
});
