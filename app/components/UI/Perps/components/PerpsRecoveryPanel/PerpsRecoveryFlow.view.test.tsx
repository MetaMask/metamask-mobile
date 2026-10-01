import '../../../../../../tests/component-view/mocks';
import React from 'react';
import {
  act,
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react-native';
import type {
  PerpsPendingManualRecovery,
  PerpsRecoveredDispatch,
  PerpsRecoveryProtectionResult,
  PerpsRecoveryVenueReview,
} from '@metamask/perps-controller';
import Engine from '../../../../../core/Engine';
import { updateBgState } from '../../../../../core/redux/slices/engine';
import Routes from '../../../../../constants/navigation/Routes';
import {
  createEthMarketForViews,
  createLongPositionForViews,
  createLimitOrderForViews,
} from '../../../../../../tests/component-view/fixtures/perpsViewFixtures';
import {
  renderPerpsHomeView,
  renderPerpsMarketDetailsView,
  renderPerpsProMarketView,
} from '../../../../../../tests/component-view/renderers/perpsViewRenderer';
import {
  clearPerpsOutreachApiMocks,
  setupPerpsOutreachApiMock,
} from '../../../../../../tests/component-view/api-mocking/perpsOutreach';
import { strings } from '../../../../../../locales/i18n';
import PerpsTPSLView from '../../Views/PerpsTPSLView/PerpsTPSLView';
import { PerpsTPSLViewSelectorsIDs as TPSL } from '../../Perps.testIds';
import { PerpsRecoveryPanelTestIds as IDs } from './PerpsRecoveryPanel.testIds';
import { selectPerpsSelectedAccountAddress } from '../../selectors/selectedAccountAddress';

const ADDRESS = '0x0000000000000000000000000000000000000001';
const MARKET = createEthMarketForViews({ providerId: 'lighter' });
const POSITION = createLongPositionForViews({
  providerId: 'lighter',
  size: '0.004',
  positionValue: '10',
  marginUsed: '10',
  leverage: { type: 'isolated', value: 1 },
});
const ORDER = createLimitOrderForViews({ providerId: 'lighter' });
const DISPATCH: PerpsRecoveredDispatch = {
  recoveryId: 'opaque-dispatch-for-mounted-flow',
  providerId: 'lighter',
  walletAddress: ADDRESS,
  network: 'testnet',
  acknowledgeable: true,
  kind: 14,
  intent: 'internal-source-intent',
  txHash: null,
  outcome: 'succeeded',
  evidence: 'internal-venue-evidence',
};
const PROTECTION: PerpsPendingManualRecovery = {
  recoveryId: 'opaque-protection-for-mounted-flow',
  providerId: 'lighter',
  walletAddress: ADDRESS,
  network: 'testnet',
  symbol: 'ETH',
  settlementKey: 'internal-source-settlement',
  recordedAt: 1_790_000_000_000,
  reason: 'internal-source-reason',
  priorIntent: 'replace',
  survivingOrderIds: [ORDER.orderId],
  actionNeeded: 'internal-source-guidance',
};
const VENUE: Extract<PerpsRecoveryVenueReview, { status: 'ready' }> = {
  status: 'ready',
  providerId: 'lighter',
  walletAddress: ADDRESS,
  network: 'testnet',
  accountIndex: 64,
  positions: [POSITION],
  orders: [ORDER],
  reviewedAt: 1_790_000_000_000,
};
const controller = Engine.context.PerpsController;
const getDispatches = jest.mocked(controller.getRecoveredDispatches);
const getProtections = jest.mocked(controller.getPendingManualRecoveries);
const reviewVenue = jest.mocked(controller.reviewRecoveryVenue);
const acknowledge = jest.mocked(controller.acknowledgeRecoveredDispatch);
const resolveProtection = jest.mocked(controller.resolveRecoveryProtection);

const overrides = {
  engine: {
    backgroundState: {
      PerpsController: {
        activeProvider: 'lighter' as const,
        isTestnet: true,
        isEligible: true,
        isFirstTimeUser: { mainnet: false, testnet: false },
      },
    },
  },
};
const streams = {
  marketData: [MARKET],
  positions: [],
  orders: [],
  prices: {
    ETH: {
      symbol: 'ETH',
      price: '2500',
      markPrice: '2500',
      timestamp: 1,
      isTradable: true,
    },
  },
};
const RecoveryEditorRoute = () => <PerpsTPSLView />;
const renderHome = () =>
  renderPerpsHomeView({
    overrides,
    streamOverrides: streams,
    extraRoutes: [{ name: Routes.PERPS.TPSL, Component: RecoveryEditorRoute }],
  });

const openProtectionEditor = async () => {
  const row = await screen.findByTestId(IDs.PROTECTION);
  fireEvent.press(within(row).getByTestId(IDs.REVIEW));
  fireEvent.press(await screen.findByTestId(IDs.EDIT_PROTECTION));
  await screen.findByTestId(TPSL.STOP_LOSS_PRICE_INPUT);
};

const syncController = (
  store: ReturnType<typeof renderHome>['store'],
  key: 'PerpsController' | 'AccountsController' | 'AccountTreeController',
  state: Record<string, unknown>,
) => {
  const engineWithState = Engine as unknown as { state: typeof Engine.state };
  engineWithState.state = { ...engineWithState.state, [key]: state };
  store.dispatch(updateBgState({ key }));
};

describe('Mounted Perps recovery flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupPerpsOutreachApiMock();
    getDispatches.mockReset().mockResolvedValue([]);
    getProtections.mockReset().mockResolvedValue([]);
    reviewVenue.mockReset().mockResolvedValue(VENUE);
    acknowledge.mockReset().mockResolvedValue(undefined);
    resolveProtection.mockReset().mockResolvedValue({
      status: 'settled',
      providerId: 'lighter',
      success: true,
    });
  });

  afterEach(() => {
    cleanup();
    clearPerpsOutreachApiMocks();
  });

  it('offers recovery on Home, reviews complete venue data and acknowledges only the selected dispatch', async () => {
    getDispatches.mockResolvedValue([DISPATCH]);
    acknowledge.mockImplementationOnce(async () => {
      getDispatches.mockResolvedValue([]);
    });
    const { stream } = renderHome();
    const row = await screen.findByTestId(IDs.DISPATCH);

    fireEvent.press(within(row).getByTestId(IDs.REVIEW));

    const venue = within(await screen.findByTestId(IDs.VENUE));
    expect(venue.getByTestId(IDs.POSITION)).toHaveTextContent(
      strings('perps.recovery.position_summary', {
        symbol: POSITION.symbol,
        size: POSITION.size,
        price: POSITION.entryPrice,
      }),
    );
    expect(venue.getByTestId(IDs.ORDER)).toHaveTextContent(
      strings('perps.recovery.order_summary', {
        symbol: ORDER.symbol,
        side: strings(`perps.recovery.${ORDER.side}`),
        type: ORDER.detailedOrderType ?? ORDER.orderType,
        size: ORDER.remainingSize,
        price: ORDER.price,
      }),
    );
    fireEvent.press(screen.getByTestId(IDs.ACKNOWLEDGE));

    await waitFor(() =>
      expect(acknowledge).toHaveBeenCalledWith(DISPATCH.recoveryId),
    );
    await waitFor(() =>
      expect(screen.queryByTestId(IDs.PANEL)).not.toBeOnTheScreen(),
    );
    expect(reviewVenue).toHaveBeenCalledTimes(2);
    expect(reviewVenue).toHaveBeenNthCalledWith(1, { providerId: 'lighter' });
    expect(reviewVenue).toHaveBeenNthCalledWith(2, { providerId: 'lighter' });
    expect(stream.getOrdersReconnectCount()).toBe(1);
    expect(stream.getFillsReconnectCount()).toBe(1);
    expect(stream.getPositionsReconnectCount()).toBe(1);
    expect(stream.getAccountReconnectCount()).toBe(1);
    expect(controller.placeOrder).not.toHaveBeenCalled();
    expect(controller.updatePositionTPSL).not.toHaveBeenCalled();
    expect(screen.queryByText(DISPATCH.recoveryId)).not.toBeOnTheScreen();
  });

  it.each([
    ['Lite', renderPerpsMarketDetailsView],
    ['Pro', renderPerpsProMarketView],
  ] as const)(
    'offers recovery on %s for the displayed market and owning provider',
    async (_mode, renderMarket) => {
      getProtections.mockResolvedValue([
        PROTECTION,
        { ...PROTECTION, symbol: 'BTC', settlementKey: 'other-market' },
        {
          ...PROTECTION,
          providerId: 'hyperliquid',
          settlementKey: 'other-provider',
        },
      ]);
      renderMarket({
        overrides,
        initialParams: { market: MARKET },
        streamOverrides: streams,
      });
      const row = await screen.findByTestId(IDs.PROTECTION);

      fireEvent.press(within(row).getByTestId(IDs.REVIEW));

      await screen.findByTestId(IDs.VENUE);
      expect(screen.getAllByTestId(IDs.PROTECTION)).toHaveLength(1);
      expect(
        within(row).getByText(
          strings('perps.recovery.protection', { symbol: 'ETH' }),
        ),
      ).toBeOnTheScreen();
      expect(
        screen.queryByText(
          strings('perps.recovery.protection', { symbol: 'BTC' }),
        ),
      ).not.toBeOnTheScreen();
      expect(reviewVenue).toHaveBeenCalledWith({ providerId: 'lighter' });
      expect(screen.getByTestId(IDs.EDIT_PROTECTION)).toBeOnTheScreen();
    },
  );

  it('submits the reviewed protection through the real editor and survives focus refresh during dismissal', async () => {
    getProtections.mockResolvedValue([PROTECTION]);
    let complete!: (value: PerpsRecoveryProtectionResult) => void;
    resolveProtection.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          complete = resolve;
        }),
    );
    const { stream } = renderHome();
    await openProtectionEditor();

    fireEvent.changeText(
      screen.getByTestId(TPSL.STOP_LOSS_PRICE_INPUT),
      '2300',
    );
    fireEvent.press(screen.getByTestId(TPSL.SET_BUTTON));

    await waitFor(() =>
      expect(resolveProtection).toHaveBeenCalledWith(
        expect.objectContaining({
          providerId: 'lighter',
          recoveryId: PROTECTION.recoveryId,
          symbol: 'ETH',
          position: POSITION,
          expectedPosition: {
            size: POSITION.size,
            entryPrice: POSITION.entryPrice,
          },
          stopLossPrice: '2300',
        }),
      ),
    );
    expect(screen.queryByTestId(TPSL.SET_BUTTON)).not.toBeOnTheScreen();
    expect(getProtections).toHaveBeenCalledTimes(1);
    expect(stream.getOrdersReconnectCount()).toBe(0);

    getProtections.mockResolvedValue([]);
    await act(async () =>
      complete({ status: 'settled', providerId: 'lighter', success: true }),
    );

    await waitFor(() =>
      expect(screen.queryByTestId(IDs.PANEL)).not.toBeOnTheScreen(),
    );
    expect(stream.getOrdersReconnectCount()).toBe(1);
    expect(stream.getPositionsReconnectCount()).toBe(1);
    expect(controller.updatePositionTPSL).not.toHaveBeenCalled();
  });

  it('expires an open recovery editor across a testnet-mainnet-testnet switch', async () => {
    getProtections.mockResolvedValue([PROTECTION]);
    const { store } = renderHome();
    await openProtectionEditor();
    fireEvent.changeText(
      screen.getByTestId(TPSL.STOP_LOSS_PRICE_INPUT),
      '2300',
    );

    act(() => {
      const current = store.getState().engine.backgroundState.PerpsController;
      syncController(store, 'PerpsController', {
        ...current,
        isTestnet: false,
      });
      syncController(store, 'PerpsController', current);
    });
    await screen.findByTestId(TPSL.RECOVERY_REVIEW_EXPIRED);
    fireEvent.press(screen.getByTestId(TPSL.SET_BUTTON));

    expect(resolveProtection).not.toHaveBeenCalled();
    expect(controller.updatePositionTPSL).not.toHaveBeenCalled();
    expect(screen.getByTestId(TPSL.SET_BUTTON)).toBeOnTheScreen();
  });

  it('expires an open recovery editor across account A-to-B-to-A selection', async () => {
    getProtections.mockResolvedValue([PROTECTION]);
    const { store } = renderHome();
    await openProtectionEditor();
    fireEvent.changeText(
      screen.getByTestId(TPSL.STOP_LOSS_PRICE_INPUT),
      '2300',
    );
    const { AccountsController: accounts, AccountTreeController: tree } =
      store.getState().engine.backgroundState;
    const selectedGroupId = tree.selectedAccountGroup;
    if (selectedGroupId === '') {
      throw new Error('Recovery fixture has no selected account group');
    }
    const wallet = Object.values(tree.accountTree.wallets).find(
      (candidate) => selectedGroupId in candidate.groups,
    );
    if (!wallet) {
      throw new Error('Selected recovery fixture account group has no wallet');
    }
    const walletId = wallet.id;
    const group = wallet.groups[selectedGroupId];
    const selectedAccount =
      accounts.internalAccounts.accounts[
        accounts.internalAccounts.selectedAccount
      ];
    const otherAccountId = 'recovery-account-b';
    const otherAddress = '0x0000000000000000000000000000000000000002';
    const otherGroupId = `${walletId}/1`;

    act(() => {
      syncController(store, 'AccountsController', {
        ...accounts,
        internalAccounts: {
          ...accounts.internalAccounts,
          selectedAccount: otherAccountId,
          accounts: {
            ...accounts.internalAccounts.accounts,
            [otherAccountId]: {
              ...selectedAccount,
              id: otherAccountId,
              address: otherAddress,
            },
          },
        },
      });
      syncController(store, 'AccountTreeController', {
        ...tree,
        accountTree: {
          ...tree.accountTree,
          wallets: {
            ...tree.accountTree.wallets,
            [walletId]: {
              ...wallet,
              groups: {
                ...wallet.groups,
                [otherGroupId]: {
                  ...group,
                  id: otherGroupId,
                  accounts: [otherAccountId],
                },
              },
            },
          },
        },
        selectedAccountGroup: otherGroupId,
      });
      expect(selectPerpsSelectedAccountAddress(store.getState())).toBe(
        otherAddress,
      );
      syncController(store, 'AccountsController', accounts);
      syncController(store, 'AccountTreeController', tree);
    });
    expect(selectPerpsSelectedAccountAddress(store.getState())).toBe(ADDRESS);
    await screen.findByTestId(TPSL.RECOVERY_REVIEW_EXPIRED);

    fireEvent.press(screen.getByTestId(TPSL.SET_BUTTON));

    expect(resolveProtection).not.toHaveBeenCalled();
    expect(controller.updatePositionTPSL).not.toHaveBeenCalled();
    expect(screen.getByTestId(TPSL.SET_BUTTON)).toBeOnTheScreen();
  });

  it('refuses to review a dispatch belonging to a different wallet', async () => {
    getDispatches.mockResolvedValue([
      {
        ...DISPATCH,
        walletAddress: '0x1234567890123456789012345678901234567890',
      },
    ]);
    renderHome();
    const row = await screen.findByTestId(IDs.DISPATCH);

    fireEvent.press(within(row).getByTestId(IDs.REVIEW));

    expect(within(row).getByTestId(IDs.REVIEW)).toBeDisabled();
    expect(reviewVenue).not.toHaveBeenCalled();
    expect(acknowledge).not.toHaveBeenCalled();
  });

  it('requires explicit removal confirmation and forwards only the reviewed protection identity', async () => {
    getProtections.mockResolvedValue([PROTECTION]);
    reviewVenue.mockResolvedValue({ ...VENUE, positions: [] });
    resolveProtection.mockImplementationOnce(async () => {
      getProtections.mockResolvedValue([]);
      return { status: 'settled', providerId: 'lighter', success: true };
    });
    const { stream } = renderHome();
    const row = await screen.findByTestId(IDs.PROTECTION);
    fireEvent.press(within(row).getByTestId(IDs.REVIEW));
    fireEvent.press(await screen.findByTestId(IDs.REMOVE_PROTECTION));
    expect(resolveProtection).not.toHaveBeenCalled();

    fireEvent.press(screen.getByTestId(IDs.CONFIRM_REMOVAL));

    await waitFor(() =>
      expect(resolveProtection).toHaveBeenCalledWith({
        providerId: 'lighter',
        recoveryId: PROTECTION.recoveryId,
        symbol: 'ETH',
      }),
    );
    await waitFor(() =>
      expect(screen.queryByTestId(IDs.PANEL)).not.toBeOnTheScreen(),
    );
    expect(stream.getOrdersReconnectCount()).toBe(1);
    expect(stream.getAccountReconnectCount()).toBe(1);
  });

  it('keeps an unresolved protection visible without refreshing streams or retrying the financial action', async () => {
    getProtections.mockResolvedValue([PROTECTION]);
    resolveProtection.mockResolvedValue({
      status: 'unresolved',
      providerId: 'lighter',
      success: false,
      error: 'private-source-rejection',
    });
    const { stream } = renderHome();
    const row = await screen.findByTestId(IDs.PROTECTION);
    fireEvent.press(within(row).getByTestId(IDs.REVIEW));
    fireEvent.press(await screen.findByTestId(IDs.REMOVE_PROTECTION));

    fireEvent.press(screen.getByTestId(IDs.CONFIRM_REMOVAL));

    expect(await screen.findByTestId(IDs.ACTION_ERROR)).toHaveTextContent(
      strings('perps.recovery.unresolved_error'),
    );
    expect(screen.getByTestId(IDs.PROTECTION)).toBeOnTheScreen();
    expect(screen.queryByTestId(IDs.VENUE)).not.toBeOnTheScreen();
    expect(resolveProtection).toHaveBeenCalledTimes(1);
    expect(stream.getOrdersReconnectCount()).toBe(0);
    expect(stream.getPositionsReconnectCount()).toBe(0);
    expect(
      screen.queryByText('private-source-rejection'),
    ).not.toBeOnTheScreen();
  });

  it('does not refresh the new network after an old acknowledgment finishes', async () => {
    getDispatches.mockResolvedValue([DISPATCH]);
    let complete!: () => void;
    acknowledge.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          complete = resolve;
        }),
    );
    const { store, stream } = renderHome();
    const row = await screen.findByTestId(IDs.DISPATCH);
    fireEvent.press(within(row).getByTestId(IDs.REVIEW));
    fireEvent.press(await screen.findByTestId(IDs.ACKNOWLEDGE));
    await waitFor(() => expect(acknowledge).toHaveBeenCalledTimes(1));

    act(() => {
      const current = store.getState().engine.backgroundState.PerpsController;
      syncController(store, 'PerpsController', {
        ...current,
        isTestnet: false,
      });
    });
    await act(async () => complete());

    expect(stream.getOrdersReconnectCount()).toBe(0);
    expect(stream.getFillsReconnectCount()).toBe(0);
    expect(stream.getPositionsReconnectCount()).toBe(0);
    expect(stream.getAccountReconnectCount()).toBe(0);
    expect(screen.queryByTestId(IDs.VENUE)).not.toBeOnTheScreen();
    expect(acknowledge).toHaveBeenCalledTimes(1);
  });
});
