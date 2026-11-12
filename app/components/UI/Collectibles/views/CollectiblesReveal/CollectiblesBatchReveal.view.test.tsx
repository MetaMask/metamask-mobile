import '../../../../../../tests/component-view/mocks';
import { AppState } from 'react-native';
import { createDeferredPromise } from '@metamask/utils';
import {
  fireEvent,
  screen,
  waitFor,
  act,
  within,
} from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import { renderCollectiblesView } from '../../../../../../tests/component-view/renderers/collectibles';
import {
  createRouteParamsProbe,
  getRouteParamsProbeTestId,
} from '../../../../../../tests/component-view/render';
import { refreshPackPartnerReads } from '../../../../../../tests/component-view/fixtures/collectibles-data-services';
import Engine from '../../../../../core/Engine';
import Routes from '../../../../../constants/navigation/Routes';
import { PackRevealSelectorsIDs } from '../../components/PackReveal/PackReveal.testIds';
import { CollectiblesPurchaseSheetTestIds } from '../../Collectibles.testIds';
import { PACK_PARTNER_ENVIRONMENT } from '../../providers/pack-partner/constants';
import { createPackPartnerError } from '../../providers/pack-partner/services/errors';
import { packPartnerQueries } from '../../services/data/packPartnerQueries';
import type { CollectiblesPackOperation } from '../../types';
import {
  packPartnerReads,
  createCard,
  createOperation,
  createPack,
  createSale,
  MOCK_ACCOUNT,
  publishPackPartnerJournal,
} from '../testUtils';
import CollectiblesReveal from './CollectiblesReveal';

const controller = {
  completePacks: jest.fn(),
  checkSales: jest.fn(),
  generatePack: jest.fn(),
  sellCards: jest.fn(),
  dismissOperation: jest.fn(),
  markPackRevealed: jest.fn(),
};
const pack = createPack();
const memos = ['batch-one', 'batch-two'];
const cards = memos.map((memo, index) =>
  createCard({
    mint: `mint-${index}`,
    memo,
    name: `Card ${index}`,
    set: `Set ${index}`,
    nftStandard: 'core',
    buyback: { status: 'available', amount: '11050000' },
  }),
);
const OFFERS = Object.fromEntries(
  cards.map((card) => [card.mint, card.buyback]),
);
const soldSale = (mint: string) =>
  createSale({
    mint,
    amount: '11050000',
    status: 'completed',
    signature: `sale-${mint}`,
    updatedAt: Date.now(),
  });
const operations = cards.map((card, index) =>
  createOperation({
    memo: memos[index],
    mint: card.mint,
    status: 'opened',
    batchMemos: memos,
    result: card,
  }),
);
const renderBatch = (automatic = false) =>
  renderCollectiblesView({
    entry: { Component: CollectiblesReveal, name: Routes.COLLECTIBLES.REVEAL },
    params: { memo: memos[0] },
    // A Turbo payout is part of the opening's result.
    operations: automatic
      ? [
          {
            ...operations[0],
            result: {
              ...cards[0],
              sale: {
                status: 'completed',
                automatic: true,
                amount: '11050000',
                updatedAt: Date.now(),
              },
            },
          },
          operations[1],
        ]
      : operations,
    offers: OFFERS,
    usdcAmount: '1000',
    routes: [{ name: Routes.COLLECTIBLES.HOME }],
  });
const skip = async () => {
  await waitFor(() =>
    expect(
      screen.getByTestId(PackRevealSelectorsIDs.REVEAL_BUTTON),
    ).toBeEnabled(),
  );
  fireEvent.press(screen.getByTestId(PackRevealSelectorsIDs.REVEAL_BUTTON));
  await screen.findByTestId('collectibles-batch-next');
};
const results = async () => {
  await skip();
  fireEvent.press(screen.getByTestId('collectibles-batch-next'));
  await skip();
  fireEvent.press(screen.getByTestId('collectibles-batch-next'));
  await screen.findByTestId('collectibles-batch-results');
};

describeForPlatforms('Multipack results', () => {
  const originalAppState = AppState.currentState;
  beforeEach(() => {
    AppState.currentState = 'active';
    Object.values(controller).forEach((mock) => {
      if (jest.isMockFunction(mock)) mock.mockReset();
    });
    controller.completePacks.mockResolvedValue(undefined);
    controller.checkSales.mockResolvedValue(undefined);
    packPartnerReads.getPacks.mockResolvedValue([pack]);
    Object.assign(Engine.context, {
      CollectiblesController: controller,
      AssetsController: {
        getAssets: jest.fn().mockResolvedValue({}),
        state: { assetsBalance: {} },
      },
    });
  });
  afterEach(() => {
    AppState.currentState = originalAppState;
  });

  it('skips each reveal, advances in order and requires confirmation for selected sales', async () => {
    renderBatch();

    await results();
    expect(packPartnerReads.getBuybackOffer).toHaveBeenCalledWith('mint-0');
    expect(packPartnerReads.getBuybackOffer).toHaveBeenCalledWith('mint-1');
    expect(
      screen.getByTestId('collectibles-batch-sell-selected'),
    ).toBeDisabled();
    fireEvent.press(screen.getByTestId('collectibles-batch-card-mint-0'));
    fireEvent.press(screen.getByTestId('collectibles-batch-sell-selected'));

    expect(controller.sellCards).not.toHaveBeenCalled();
    expect(
      screen.getByTestId('collectibles-buyback-confirmation'),
    ).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('collectibles-batch-confirm-sale'));
    await waitFor(() =>
      expect(controller.sellCards).toHaveBeenCalledWith({
        account: MOCK_ACCOUNT,
        cards: [
          { mint: 'mint-0', expectedAmount: '11050000', nftStandard: 'core' },
        ],
      }),
    );
    expect(controller.completePacks).toHaveBeenCalledTimes(1);
    expect(controller.checkSales).toHaveBeenCalledWith({
      address: MOCK_ACCOUNT.address,
    });
    expect(controller.generatePack).not.toHaveBeenCalled();
  });

  it('shows a sold result without replaying the animation or automatically advancing', async () => {
    const { store } = renderBatch();
    await skip();
    fireEvent.press(screen.getByTestId('collectibles-batch-sell-card'));
    controller.sellCards.mockImplementation(async () => {
      act(() => {
        publishPackPartnerJournal(store, { sales: [soldSale('mint-0')] });
      });
    });

    fireEvent.press(screen.getByTestId('collectibles-batch-confirm-sale'));

    expect(
      await screen.findByTestId('collectibles-card-sold'),
    ).toHaveTextContent(/11\.05/u);
    expect(
      screen.queryByTestId(PackRevealSelectorsIDs.REVEAL_BUTTON),
    ).not.toBeOnTheScreen();
    expect(screen.getByTestId('collectibles-batch-next')).toHaveTextContent(
      strings('collectibles.batch.next'),
    );
  });

  it('reconciles a partial sale by checking sales and requires approval of the remaining refreshed offer', async () => {
    const { store } = renderBatch();
    await results();
    controller.sellCards.mockImplementationOnce(async () => {
      act(() => {
        publishPackPartnerJournal(store, { sales: [soldSale('mint-0')] });
      });
      // PackPartner lowered the second offer: the workflow refreshes its read.
      packPartnerReads.getBuybackOffer.mockImplementation(async (mint) =>
        mint === 'mint-1'
          ? { status: 'available', amount: '7000000' }
          : OFFERS[mint],
      );
      await refreshPackPartnerReads(
        packPartnerQueries.getBuybackOffer(PACK_PARTNER_ENVIRONMENT, 'mint-1')
          .queryKey,
      );
      throw createPackPartnerError({ code: 'OFFER_CHANGED' });
    });
    fireEvent.press(screen.getByTestId('collectibles-batch-card-mint-0'));
    fireEvent.press(screen.getByTestId('collectibles-batch-card-mint-1'));
    fireEvent.press(screen.getByTestId('collectibles-batch-sell-selected'));
    fireEvent.press(screen.getByTestId('collectibles-batch-confirm-sale'));
    await screen.findByTestId('collectibles-batch-retry');

    fireEvent.press(screen.getByTestId('collectibles-batch-retry'));

    await waitFor(() => {
      expect(controller.checkSales).toHaveBeenLastCalledWith({
        address: MOCK_ACCOUNT.address,
      });
      expect(
        screen.getByTestId('collectibles-batch-sell-selected'),
      ).toBeEnabled();
    });
    expect(controller.checkSales).toHaveBeenCalledTimes(2);
    expect(controller.completePacks).toHaveBeenCalledTimes(1);
    expect(controller.sellCards).toHaveBeenCalledTimes(1);
    expect(controller.generatePack).not.toHaveBeenCalled();
    fireEvent.press(screen.getByTestId('collectibles-batch-sell-selected'));
    expect(
      screen.getByTestId('collectibles-buyback-confirmation'),
    ).toBeOnTheScreen();
    expect(controller.sellCards).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByTestId('collectibles-batch-confirm-sale'));

    await waitFor(() =>
      expect(controller.sellCards).toHaveBeenNthCalledWith(2, {
        account: MOCK_ACCOUNT,
        cards: [
          { mint: 'mint-1', expectedAmount: '7000000', nftStandard: 'core' },
        ],
      }),
    );
  });

  it('keeps the loading screen until every card is opened, without revealing partial results', async () => {
    const processing = createDeferredPromise();
    controller.completePacks.mockReturnValue(processing.promise);
    const pendingOperations = operations.map((operation) => ({
      ...operation,
      status: 'paid' as const,
      mint: undefined,
      result: undefined,
    }));
    const { store } = renderCollectiblesView({
      entry: {
        Component: CollectiblesReveal,
        name: Routes.COLLECTIBLES.REVEAL,
      },
      params: { memo: memos[0], skipReveal: true },
      operations: pendingOperations,
      offers: OFFERS,
      routes: [{ name: Routes.COLLECTIBLES.HOME }],
    });
    await screen.findByTestId('collectibles-batch-loading');
    const update = (count: number) =>
      publishPackPartnerJournal(store, {
        operations: operations.map((operation, index) =>
          index < count ? operation : pendingOperations[index],
        ),
      });
    act(() => update(1));
    // Even if a completion call settles early, persisted readiness gates the reveal.
    await act(async () => {
      processing.resolve();
    });
    expect(screen.getByTestId('collectibles-batch-loading')).toBeOnTheScreen();
    expect(
      screen.queryByTestId(PackRevealSelectorsIDs.REVEAL_BUTTON),
    ).not.toBeOnTheScreen();

    act(() => update(2));

    await screen.findByTestId('collectibles-batch-results');
    expect(controller.generatePack).not.toHaveBeenCalled();
    expect(controller.sellCards).not.toHaveBeenCalled();
    expect(
      screen.queryByTestId('collectibles-batch-loading'),
    ).not.toBeOnTheScreen();
  });

  it('resumes the saved next card with its reveal already displayed', async () => {
    renderCollectiblesView({
      entry: {
        Component: CollectiblesReveal,
        name: Routes.COLLECTIBLES.REVEAL,
      },
      params: { memo: memos[0] },
      operations: [
        { ...operations[0], revealed: true, revealCompleted: true },
        { ...operations[1], revealed: true },
      ],
      offers: OFFERS,
      routes: [{ name: Routes.COLLECTIBLES.HOME }],
    });
    await screen.findByTestId('collectibles-batch-next');
    expect(screen.getByText('Set 1')).toBeOnTheScreen();
    expect(screen.queryByText('Card 1')).not.toBeOnTheScreen();
    expect(
      screen.queryByTestId(PackRevealSelectorsIDs.REVEAL_BUTTON),
    ).not.toBeOnTheScreen();
    expect(controller.generatePack).not.toHaveBeenCalled();
  });

  it('excludes automatically sold cards and reviews buy again instead of buying immediately', async () => {
    renderBatch(true);
    await results();
    expect(
      screen.getByTestId('collectibles-batch-sell-selected'),
    ).toBeDisabled();
    expect(
      screen.getByLabelText(strings('collectibles.batch.sold_automatically')),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId('collectibles-batch-card-action-mint-0').props.style,
    ).toEqual(
      screen.getByTestId('collectibles-batch-card-action-mint-1').props.style,
    );

    fireEvent.press(screen.getByTestId('collectibles-batch-buy-again'));

    expect(
      await screen.findByTestId(CollectiblesPurchaseSheetTestIds.SHEET),
    ).toBeOnTheScreen();
    expect(
      screen
        .getAllByTestId('collectibles-quantity')
        .some((item) => item.props.children === '2 packs'),
    ).toBe(true);
    expect(controller.generatePack).not.toHaveBeenCalled();
    expect(controller.sellCards).not.toHaveBeenCalled();
  });

  it('shows the opened cards with the not-opened banner when one member expired', async () => {
    const expired: CollectiblesPackOperation = {
      ...operations[1],
      status: 'expired',
      mint: undefined,
      result: undefined,
    };
    renderCollectiblesView({
      entry: {
        Component: CollectiblesReveal,
        name: Routes.COLLECTIBLES.REVEAL,
      },
      params: { memo: memos[0] },
      operations: [operations[0], expired],
      offers: OFFERS,
      routes: [{ name: Routes.COLLECTIBLES.HOME }],
    });

    await skip();

    expect(screen.getByText('Set 0')).toBeOnTheScreen();
    expect(
      screen.getByTestId('collectibles-batch-not-opened'),
    ).toHaveTextContent(
      strings('collectibles.batch.not_opened', { count: 1, total: 2 }),
    );
    expect(
      screen.queryByTestId('collectibles-batch-unopened'),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByTestId('collectibles-batch-loading'),
    ).not.toBeOnTheScreen();
    expect(screen.queryByText('Set 1')).not.toBeOnTheScreen();
    expect(controller.dismissOperation).not.toHaveBeenCalled();
    expect(controller.generatePack).not.toHaveBeenCalled();
  });

  it('shows the unopened state when every member expired or failed, and Close dismisses every member', async () => {
    const unopened: CollectiblesPackOperation[] = operations.map(
      (operation, index) => ({
        ...operation,
        status: index === 0 ? 'expired' : 'failed',
        mint: undefined,
        result: undefined,
      }),
    );
    renderCollectiblesView({
      entry: {
        Component: CollectiblesReveal,
        name: Routes.COLLECTIBLES.REVEAL,
      },
      params: { memo: memos[0] },
      operations: unopened,
      routes: [
        {
          name: Routes.COLLECTIBLES.HOME,
          Component: createRouteParamsProbe(Routes.COLLECTIBLES.HOME),
        },
      ],
    });

    expect(
      await screen.findByTestId('collectibles-batch-unopened'),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId('collectibles-batch-not-opened'),
    ).toHaveTextContent(
      strings('collectibles.batch.not_opened', { count: 2, total: 2 }),
    );
    expect(
      screen.queryByTestId('collectibles-batch-loading'),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByTestId(PackRevealSelectorsIDs.REVEAL_BUTTON),
    ).not.toBeOnTheScreen();
    expect(controller.dismissOperation).not.toHaveBeenCalled();

    fireEvent.press(screen.getByTestId('collectibles-batch-close'));

    expect(
      await screen.findByTestId(
        getRouteParamsProbeTestId(Routes.COLLECTIBLES.HOME),
      ),
    ).toHaveTextContent(JSON.stringify({ initialTab: 'packs' }));
    expect(controller.dismissOperation).toHaveBeenCalledTimes(memos.length);
    memos.forEach((memo) =>
      expect(controller.dismissOperation).toHaveBeenCalledWith({
        account: MOCK_ACCOUNT,
        memo,
      }),
    );
    expect(controller.generatePack).not.toHaveBeenCalled();
    expect(controller.sellCards).not.toHaveBeenCalled();
  });

  it('keeps the pending sale banner while Check sale status finds the sale still pending, then clears it once confirmed', async () => {
    const pending = createSale({
      mint: 'mint-0',
      amount: '11050000',
      status: 'pending',
    });
    const { store } = renderCollectiblesView({
      entry: {
        Component: CollectiblesReveal,
        name: Routes.COLLECTIBLES.REVEAL,
      },
      params: { memo: memos[0] },
      operations,
      sales: [pending],
      offers: OFFERS,
      routes: [{ name: Routes.COLLECTIBLES.HOME }],
    });
    const banner = await screen.findByTestId('collectibles-batch-sale-pending');
    expect(
      within(banner).getByText(strings('collectibles.errors.sale_pending')),
    ).toBeOnTheScreen();
    // Opening the batch checks the pending sales once, by memo.
    await waitFor(() =>
      expect(
        screen.getByTestId(PackRevealSelectorsIDs.REVEAL_BUTTON),
      ).toBeEnabled(),
    );
    expect(controller.checkSales).toHaveBeenCalledTimes(1);
    const stillPending = createDeferredPromise<void>();
    controller.checkSales.mockReturnValueOnce(stillPending.promise);

    fireEvent.press(screen.getByTestId('collectibles-batch-check-sales'));
    fireEvent.press(screen.getByTestId('collectibles-batch-check-sales'));

    expect(controller.checkSales).toHaveBeenCalledTimes(2);
    expect(controller.checkSales).toHaveBeenLastCalledWith({
      address: MOCK_ACCOUNT.address,
    });
    await act(async () => stillPending.resolve());
    expect(
      screen.getByTestId('collectibles-batch-sale-pending'),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('collectibles-batch-check-sales')).toBeEnabled();

    controller.checkSales.mockImplementationOnce(async () => {
      publishPackPartnerJournal(store, {
        sales: [soldSale('mint-0')],
      });
    });
    fireEvent.press(screen.getByTestId('collectibles-batch-check-sales'));

    await waitFor(() =>
      expect(
        screen.queryByTestId('collectibles-batch-sale-pending'),
      ).not.toBeOnTheScreen(),
    );
    expect(controller.checkSales).toHaveBeenCalledTimes(3);
    expect(controller.sellCards).not.toHaveBeenCalled();
    expect(controller.completePacks).toHaveBeenCalledTimes(1);
    expect(controller.generatePack).not.toHaveBeenCalled();
  });
});
