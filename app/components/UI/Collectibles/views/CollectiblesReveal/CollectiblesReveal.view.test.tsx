import '../../../../../../tests/component-view/mocks';
import { AccessibilityInfo, AppState } from 'react-native';
import { createDeferredPromise } from '@metamask/utils';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { toast, ToastSeverity } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import {
  createRouteParamsProbe,
  getRouteParamsProbeTestId,
} from '../../../../../../tests/component-view/render';
import { renderCollectiblesView } from '../../../../../../tests/component-view/renderers/collectibles';
import Routes from '../../../../../constants/navigation/Routes';
import Engine from '../../../../../core/Engine';
import {
  CollectiblesBuybackOfferTestIds,
  CollectiblesPurchaseSheetTestIds,
  CollectiblesRevealTestIds,
} from '../../Collectibles.testIds';
import { PackRevealSelectorsIDs } from '../../components/PackReveal/PackReveal.testIds';
import { BuybackConfirmationTestIds } from '../../components/BuybackOffer';
import { CollectiblesRevealResultTestIds } from './CollectiblesReveal.testIds';
import { createPackPartnerError } from '../../providers/pack-partner/services/errors';
import { getPackPartnerErrorMessage } from '../../providers/pack-partner/utils/errorMessages';
import type {
  CollectiblesBuyback,
  CollectiblesPackOperation,
} from '../../types';
import {
  MOCK_ACCOUNT,
  packPartnerReads,
  createCard,
  createOperation,
  createPack,
} from '../testUtils';
import CollectiblesReveal from './CollectiblesReveal';

const controller = {
  completePack: jest.fn(),
  generatePack: jest.fn(),
  dismissOperation: jest.fn(),
  sellCard: jest.fn(),
};
const getAssets = jest.fn();
const MEMO = 'memo-1';
const NEXT_MEMO = 'memo-2';
const initialAppState = AppState.currentState;
const OPENING_OFFER = { status: 'available', amount: '42000000' } as const;
/** The awarded card, with the offer the opening returned. */
const CARD = createCard({ mint: 'MintA', buyback: OPENING_OFFER });
const OPENED = createOperation({
  memo: MEMO,
  status: 'opened',
  mint: CARD.mint,
  result: CARD,
});
/** The pack as the live catalogue lists it; buying again signs its current price. */
const CATALOGUE_PACK = createPack({ code: OPENED.packCode });
const PACK_REF = {
  code: CATALOGUE_PACK.code,
  name: CATALOGUE_PACK.name,
  price: CATALOGUE_PACK.price,
  priceAmount: CATALOGUE_PACK.priceAmount,
};

const renderReveal = ({
  operations = [],
  offers = { [CARD.mint]: OPENING_OFFER },
  usdcAmount = '100',
  skipReveal = false,
}: {
  operations?: CollectiblesPackOperation[];
  /** PackPartner's current offers, by mint. */
  offers?: Record<string, CollectiblesBuyback>;
  usdcAmount?: string;
  skipReveal?: boolean;
} = {}) =>
  renderCollectiblesView({
    entry: { Component: CollectiblesReveal, name: Routes.COLLECTIBLES.REVEAL },
    offers,
    usdcAmount,
    operations: [
      ...operations,
      createOperation({ memo: NEXT_MEMO, status: 'submitted' }),
    ],
    params: { memo: MEMO, skipReveal },
    routes: [
      {
        name: Routes.COLLECTIBLES.HOME,
        Component: createRouteParamsProbe(Routes.COLLECTIBLES.HOME),
      },
    ],
  });

const finishReveal = async () => {
  await waitFor(() =>
    expect(
      screen.getByTestId(PackRevealSelectorsIDs.REVEAL_BUTTON),
    ).toBeEnabled(),
  );
  fireEvent.press(screen.getByTestId(PackRevealSelectorsIDs.REVEAL_BUTTON));
  await screen.findByTestId(CollectiblesRevealResultTestIds.KEEP_BUTTON);
};

const expectHome = async () => {
  expect(
    await screen.findByTestId(
      getRouteParamsProbeTestId(Routes.COLLECTIBLES.HOME),
    ),
  ).toHaveTextContent(JSON.stringify({ initialTab: 'packs' }));
  expect(
    screen.queryByTestId(CollectiblesRevealTestIds.CONTAINER),
  ).not.toBeOnTheScreen();
};

const expectNextPack = async () => {
  await waitFor(() =>
    expect(controller.completePack).toHaveBeenLastCalledWith({
      account: MOCK_ACCOUNT,
      memo: NEXT_MEMO,
    }),
  );
  expect(
    await screen.findByTestId(CollectiblesRevealTestIds.STAGE),
  ).toHaveTextContent(strings('collectibles.reveal.paying'));
  expect(controller.generatePack).toHaveBeenCalledWith(
    expect.objectContaining({
      account: MOCK_ACCOUNT,
      pack: PACK_REF,
    }),
  );
  expect(controller.dismissOperation).toHaveBeenCalledWith({
    account: MOCK_ACCOUNT,
    memo: MEMO,
  });
};

describeForPlatforms('CollectiblesReveal journeys', () => {
  beforeEach(() => {
    AppState.currentState = 'active';
    Object.values(controller).forEach((method) => {
      if (jest.isMockFunction(method)) method.mockReset();
    });
    getAssets.mockReset().mockResolvedValue({});
    jest.mocked(toast).mockClear();
    jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(true);
    controller.completePack.mockResolvedValue(CARD);
    packPartnerReads.getPacks.mockResolvedValue([CATALOGUE_PACK]);
    Object.assign(Engine.context, {
      CollectiblesController: controller,
      AssetsController: { getAssets, state: { assetsBalance: {} } },
    });
  });

  afterEach(() => {
    AppState.currentState = initialAppState;
    jest.restoreAllMocks();
  });

  it('completes the pack once and lets the user leave a pending payment without dismissing it', async () => {
    controller.completePack.mockReturnValue(new Promise(() => undefined));
    renderReveal({
      operations: [createOperation({ memo: MEMO, status: 'submitted' })],
    });

    expect(
      await screen.findByTestId(CollectiblesRevealTestIds.STAGE),
    ).toHaveTextContent(strings('collectibles.reveal.paying'));
    expect(controller.completePack).toHaveBeenCalledTimes(1);
    expect(controller.completePack).toHaveBeenCalledWith({
      account: MOCK_ACCOUNT,
      memo: MEMO,
    });
    fireEvent.press(screen.getByTestId(CollectiblesRevealTestIds.CLOSE_BUTTON));

    await expectHome();
    expect(controller.dismissOperation).not.toHaveBeenCalled();
  });

  it('retries a resumable operation and keeps the mapped error visible when retry fails', async () => {
    controller.completePack.mockRejectedValue(
      createPackPartnerError({ code: 'SUBMIT_FAILED' }),
    );
    renderReveal({
      operations: [
        createOperation({
          memo: MEMO,
          status: 'submitted',
          error: { code: 'SUBMIT_FAILED' },
        }),
      ],
    });

    fireEvent.press(
      await screen.findByTestId(CollectiblesRevealTestIds.RETRY_BUTTON),
    );

    await waitFor(() =>
      expect(controller.completePack).toHaveBeenCalledTimes(2),
    );
    expect(
      await screen.findByTestId(CollectiblesRevealTestIds.ERROR_MESSAGE),
    ).toHaveTextContent(getPackPartnerErrorMessage('SUBMIT_FAILED'));
  });

  it('closes a resumable error without dismissing the operation', async () => {
    controller.completePack.mockRejectedValue(
      createPackPartnerError({ code: 'OPEN_PENDING' }),
    );
    renderReveal({
      operations: [createOperation({ memo: MEMO, status: 'paid' })],
    });

    fireEvent.press(
      await screen.findByTestId(CollectiblesRevealTestIds.ERROR_CLOSE_BUTTON),
    );

    await expectHome();
    expect(controller.dismissOperation).not.toHaveBeenCalled();
  });

  it('confirms the expired pack again before replacing the route with the next purchase', async () => {
    controller.completePack.mockRejectedValueOnce(
      createPackPartnerError({ code: 'PACK_EXPIRED' }),
    );
    controller.generatePack.mockResolvedValue(NEXT_MEMO);
    renderReveal({
      operations: [createOperation({ memo: MEMO, status: 'expired' })],
    });

    fireEvent.press(
      await screen.findByTestId(CollectiblesRevealTestIds.START_OVER_BUTTON),
    );
    const confirm = await screen.findByTestId(
      CollectiblesPurchaseSheetTestIds.CONFIRM_BUTTON,
    );
    expect(confirm).toHaveTextContent(
      strings('collectibles.purchase.buy_one_pack'),
    );
    expect(screen.getByTestId('collectibles-purchase-total')).toHaveTextContent(
      /\$50$/u,
    );
    expect(controller.generatePack).not.toHaveBeenCalled();
    fireEvent.press(confirm);

    await expectNextPack();
    expect(
      screen.queryByTestId(CollectiblesRevealTestIds.START_OVER_BUTTON),
    ).not.toBeOnTheScreen();
  });

  it('keeps an expired pack and reports a failed replacement purchase in the confirmation', async () => {
    controller.completePack.mockRejectedValue(
      createPackPartnerError({ code: 'PACK_EXPIRED' }),
    );
    controller.generatePack.mockRejectedValue(
      createPackPartnerError({ code: 'MACHINE_UNAVAILABLE' }),
    );
    renderReveal({
      operations: [createOperation({ memo: MEMO, status: 'expired' })],
    });

    fireEvent.press(
      await screen.findByTestId(CollectiblesRevealTestIds.START_OVER_BUTTON),
    );
    fireEvent.press(
      await screen.findByTestId(
        CollectiblesPurchaseSheetTestIds.CONFIRM_BUTTON,
      ),
    );

    expect(
      await screen.findByTestId(CollectiblesPurchaseSheetTestIds.ERROR),
    ).toHaveTextContent(getPackPartnerErrorMessage('MACHINE_UNAVAILABLE'));
    expect(
      screen.getByTestId(CollectiblesRevealTestIds.ERROR),
    ).toBeOnTheScreen();
    expect(controller.dismissOperation).not.toHaveBeenCalled();
  });

  it('disables buying an expired pack the balance no longer covers', async () => {
    controller.completePack.mockRejectedValue(
      createPackPartnerError({ code: 'PACK_EXPIRED' }),
    );
    packPartnerReads.getPacks.mockResolvedValue([createPack({ price: 55 })]);
    renderReveal({
      operations: [createOperation({ memo: MEMO, status: 'expired' })],
      usdcAmount: '50',
    });

    fireEvent.press(
      await screen.findByTestId(CollectiblesRevealTestIds.START_OVER_BUTTON),
    );

    expect(
      await screen.findByTestId(
        CollectiblesPurchaseSheetTestIds.CONFIRM_BUTTON,
      ),
    ).toBeDisabled();
    expect(
      screen.getByTestId(CollectiblesPurchaseSheetTestIds.CONFIRM_BUTTON),
    ).toHaveTextContent(strings('collectibles.purchase.buy_one_pack'));
    expect(screen.getByTestId('collectibles-purchase-total')).toHaveTextContent(
      /\$55$/u,
    );
    fireEvent.press(
      screen.getByTestId(CollectiblesPurchaseSheetTestIds.CONFIRM_BUTTON),
    );
    expect(controller.generatePack).not.toHaveBeenCalled();
  });

  it('hides Start over when the catalogue no longer lists the expired pack', async () => {
    controller.completePack.mockRejectedValue(
      createPackPartnerError({ code: 'PACK_EXPIRED' }),
    );
    packPartnerReads.getPacks.mockResolvedValue([]);
    renderReveal({
      operations: [createOperation({ memo: MEMO, status: 'expired' })],
    });

    await waitFor(() => expect(packPartnerReads.getPacks).toHaveBeenCalled());
    await waitFor(() =>
      expect(
        screen.queryByTestId(CollectiblesRevealTestIds.START_OVER_BUTTON),
      ).not.toBeOnTheScreen(),
    );
    expect(
      screen.getByTestId(CollectiblesRevealTestIds.ERROR_CLOSE_BUTTON),
    ).toBeEnabled();
  });

  it('only offers Close on a failed pack and dismisses it when leaving', async () => {
    controller.completePack.mockRejectedValue(
      createPackPartnerError({ code: 'PACK_FAILED' }),
    );
    renderReveal({
      operations: [createOperation({ memo: MEMO, status: 'failed' })],
    });
    await screen.findByTestId(CollectiblesRevealTestIds.ERROR_CLOSE_BUTTON);
    expect(
      screen.queryByTestId(CollectiblesRevealTestIds.RETRY_BUTTON),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByTestId(CollectiblesRevealTestIds.START_OVER_BUTTON),
    ).not.toBeOnTheScreen();

    fireEvent.press(
      screen.getByTestId(CollectiblesRevealTestIds.ERROR_CLOSE_BUTTON),
    );

    await expectHome();
    expect(controller.dismissOperation).toHaveBeenCalledWith({
      account: MOCK_ACCOUNT,
      memo: MEMO,
    });
  });

  it('explains an unknown operation and allows the user to leave', async () => {
    controller.completePack.mockRejectedValue(
      createPackPartnerError({ code: 'NOT_FOUND' }),
    );
    renderReveal();
    expect(
      await screen.findByTestId(CollectiblesRevealTestIds.ERROR_MESSAGE),
    ).toHaveTextContent(getPackPartnerErrorMessage('NOT_FOUND'));

    fireEvent.press(
      screen.getByTestId(CollectiblesRevealTestIds.ERROR_CLOSE_BUTTON),
    );

    await expectHome();
  });

  it('reveals the card before exposing the buyback and keep actions', async () => {
    renderReveal({ operations: [OPENED] });
    await screen.findByTestId(PackRevealSelectorsIDs.REVEAL_BUTTON);
    expect(
      screen.queryByTestId(CollectiblesRevealResultTestIds.SELL_BACK_BUTTON),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByTestId(CollectiblesRevealResultTestIds.KEEP_BUTTON),
    ).not.toBeOnTheScreen();
    await finishReveal();
    expect(
      screen.getByTestId(CollectiblesRevealResultTestIds.SELL_BACK_BUTTON),
    ).toHaveTextContent(
      strings('collectibles.reveal.accept_buyback', { amount: '$42' }),
    );
    expect(
      screen.getByTestId(CollectiblesRevealResultTestIds.KEEP_BUTTON),
    ).toHaveTextContent(strings('collectibles.reveal.keep_card'));
    await waitFor(() => expect(getAssets).toHaveBeenCalledTimes(1));
  });

  it('uses an unobstructed reveal and restores close on the result', async () => {
    renderReveal({ operations: [OPENED] });
    await screen.findByTestId(PackRevealSelectorsIDs.REVEAL_BUTTON);
    expect(
      screen.queryByTestId(CollectiblesRevealTestIds.CLOSE_BUTTON),
    ).not.toBeOnTheScreen();
    await finishReveal();
    expect(
      screen.getByTestId(CollectiblesRevealTestIds.CLOSE_BUTTON),
    ).toBeOnTheScreen();
    expect(controller.generatePack).not.toHaveBeenCalled();
    expect(controller.sellCard).not.toHaveBeenCalled();
  });

  it('keeps the card in collection without purchasing or selling', async () => {
    renderReveal({ operations: [OPENED], usdcAmount: '0' });
    await finishReveal();
    fireEvent.press(
      screen.getByTestId(CollectiblesRevealResultTestIds.KEEP_BUTTON),
    );
    expect(
      await screen.findByTestId(
        getRouteParamsProbeTestId(Routes.COLLECTIBLES.HOME),
      ),
    ).toHaveTextContent(JSON.stringify({ initialTab: 'cards' }));
    expect(controller.generatePack).not.toHaveBeenCalled();
    expect(controller.sellCard).not.toHaveBeenCalled();
  });

  it('stays on the card when the confirmed sale fails and never buys again', async () => {
    controller.sellCard.mockRejectedValue(
      createPackPartnerError({ code: 'BUYBACK_UNAVAILABLE' }),
    );
    renderReveal({ operations: [OPENED] });
    await finishReveal();
    fireEvent.press(
      screen.getByTestId(CollectiblesRevealResultTestIds.SELL_BACK_BUTTON),
    );
    fireEvent.press(
      await screen.findByTestId(BuybackConfirmationTestIds.CONFIRM_BUTTON),
    );
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: ToastSeverity.Danger,
          title: strings('collectibles.toast.sell_failed'),
        }),
      ),
    );
    expect(
      screen.getByTestId(CollectiblesRevealResultTestIds.KEEP_BUTTON),
    ).toBeEnabled();
    expect(controller.generatePack).not.toHaveBeenCalled();
    expect(controller.dismissOperation).not.toHaveBeenCalled();
  });

  it('retains the confirmed sold receipt until Done is pressed', async () => {
    controller.sellCard.mockResolvedValue({
      mint: CARD.mint,
      amount: '42000000',
      signature: 'sig',
    });
    renderReveal({ operations: [OPENED] });
    await finishReveal();
    fireEvent.press(
      screen.getByTestId(CollectiblesRevealResultTestIds.SELL_BACK_BUTTON),
    );
    const confirm = await screen.findByTestId(
      BuybackConfirmationTestIds.CONFIRM_BUTTON,
    );
    expect(controller.sellCard).not.toHaveBeenCalled();
    fireEvent.press(confirm);
    expect(
      await screen.findByTestId('collectibles-card-sold'),
    ).toHaveTextContent(/42/u);
    expect(
      screen.getByTestId(CollectiblesRevealResultTestIds.KEEP_BUTTON),
    ).toHaveTextContent(strings('collectibles.reveal.done'));
    expect(
      screen.queryByTestId(CollectiblesRevealResultTestIds.SELL_BACK_BUTTON),
    ).not.toBeOnTheScreen();
    expect(controller.dismissOperation).not.toHaveBeenCalled();
    expect(controller.generatePack).not.toHaveBeenCalled();
    fireEvent.press(
      screen.getByTestId(CollectiblesRevealResultTestIds.KEEP_BUTTON),
    );
    await expectHome();
  });

  it('skips only presentation and never generates a purchase or executes a sale', async () => {
    renderReveal({ operations: [OPENED], skipReveal: true });
    await screen.findByTestId(CollectiblesRevealResultTestIds.KEEP_BUTTON);
    expect(
      screen.queryByTestId(PackRevealSelectorsIDs.REVEAL_BUTTON),
    ).not.toBeOnTheScreen();
    expect(controller.generatePack).not.toHaveBeenCalled();
    expect(controller.sellCard).not.toHaveBeenCalled();
    expect(controller.completePack).toHaveBeenCalledTimes(1);
  });

  it('keeps the card and returns to Packs when closing', async () => {
    renderReveal({ operations: [OPENED] });
    await finishReveal();
    fireEvent.press(screen.getByTestId(CollectiblesRevealTestIds.CLOSE_BUTTON));
    await expectHome();
    expect(controller.dismissOperation).toHaveBeenCalledWith({
      account: MOCK_ACCOUNT,
      memo: MEMO,
    });
    expect(controller.sellCard).not.toHaveBeenCalled();
    expect(controller.generatePack).not.toHaveBeenCalled();
  });

  it('shows the offer of the opening while the offer read runs, then the fresher offer', async () => {
    const read = createDeferredPromise<CollectiblesBuyback>();
    packPartnerReads.getBuybackOffer.mockReturnValueOnce(read.promise);
    renderReveal({ operations: [OPENED] });
    await finishReveal();

    expect(packPartnerReads.getBuybackOffer).toHaveBeenCalledWith(CARD.mint);
    expect(
      screen.getByTestId(CollectiblesRevealResultTestIds.SELL_BACK_BUTTON),
    ).toHaveTextContent(
      strings('collectibles.reveal.accept_buyback', { amount: '$42' }),
    );
    expect(
      screen.queryByTestId(CollectiblesBuybackOfferTestIds.CHECKING),
    ).not.toBeOnTheScreen();

    await act(async () => {
      read.resolve({ status: 'available', amount: '38000000' });
      await read.promise;
    });

    await waitFor(() =>
      expect(
        screen.getByTestId(CollectiblesRevealResultTestIds.SELL_BACK_BUTTON),
      ).toHaveTextContent(
        strings('collectibles.reveal.accept_buyback', { amount: '$38' }),
      ),
    );
    expect(controller.sellCard).not.toHaveBeenCalled();
  });

  it('keeps the offer of the opening when the offer read fails', async () => {
    packPartnerReads.getBuybackOffer.mockRejectedValueOnce(
      new Error('offline'),
    );
    renderReveal({ operations: [OPENED] });
    await finishReveal();

    await waitFor(() =>
      expect(packPartnerReads.getBuybackOffer).toHaveBeenCalledWith(CARD.mint),
    );
    expect(
      screen.getByTestId(CollectiblesRevealResultTestIds.SELL_BACK_BUTTON),
    ).toHaveTextContent(
      strings('collectibles.reveal.accept_buyback', { amount: '$42' }),
    );
    expect(
      screen.queryByTestId(CollectiblesBuybackOfferTestIds.ERROR),
    ).not.toBeOnTheScreen();
  });

  it('allows keeping a card while its unknown offer is being read', async () => {
    packPartnerReads.getBuybackOffer.mockReturnValue(
      new Promise(() => undefined),
    );
    const card = createCard({ mint: CARD.mint });
    controller.completePack.mockResolvedValue(card);
    renderReveal({ operations: [{ ...OPENED, result: card }] });
    await finishReveal();
    expect(packPartnerReads.getBuybackOffer).toHaveBeenCalledWith(CARD.mint);
    expect(
      screen.getByTestId(CollectiblesRevealResultTestIds.KEEP_BUTTON),
    ).toBeEnabled();
    expect(
      screen.queryByTestId(CollectiblesRevealResultTestIds.SELL_BACK_BUTTON),
    ).not.toBeOnTheScreen();
  });
});
