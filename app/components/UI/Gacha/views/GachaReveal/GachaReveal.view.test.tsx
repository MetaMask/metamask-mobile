import '../../../../../../tests/component-view/mocks';
import { AccessibilityInfo, AppState } from 'react-native';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { toast, ToastSeverity } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import {
  createRouteParamsProbe,
  getRouteParamsProbeTestId,
} from '../../../../../../tests/component-view/render';
import { renderGachaView } from '../../../../../../tests/component-view/renderers/gacha';
import Routes from '../../../../../constants/navigation/Routes';
import Engine from '../../../../../core/Engine';
import {
  GachaPurchaseSheetTestIds,
  GachaRevealTestIds,
} from '../../Gacha.testIds';
import { PackRevealSelectorsIDs } from '../../components/PackReveal/PackReveal.testIds';
import { createCollectorCryptError } from '../../providers/collector-crypt/services/errors';
import { getCollectorCryptErrorMessage } from '../../providers/collector-crypt/utils/errorMessages';
import type {
  CollectorCryptCard,
  PackOperation,
} from '../../providers/collector-crypt/types';
import {
  MOCK_ACCOUNT,
  createCard,
  createOperation,
  createPack,
} from '../testUtils';
import GachaReveal from './GachaReveal';

const controller = {
  getPacks: jest.fn(),
  completePack: jest.fn(),
  generatePack: jest.fn(),
  dismissOperation: jest.fn(),
  refreshBuyback: jest.fn(),
  sellCard: jest.fn(),
};
const getAssets = jest.fn();
const MEMO = 'memo-1';
const NEXT_MEMO = 'memo-2';
const initialAppState = AppState.currentState;
const CARD = createCard({
  mint: 'MintA',
  buyback: { status: 'available', amount: '42000000' },
});
const OPENED = createOperation({
  memo: MEMO,
  status: 'opened',
  mint: CARD.mint,
});
const PACK_REF = {
  code: OPENED.packCode,
  name: OPENED.packName,
  price: OPENED.price,
};

const renderReveal = ({
  operations = [],
  cards = [],
  usdcAmount = '100',
}: {
  operations?: PackOperation[];
  cards?: CollectorCryptCard[];
  usdcAmount?: string;
} = {}) => {
  return renderGachaView({
    entry: { Component: GachaReveal, name: Routes.GACHA.REVEAL },
    cards,
    usdcAmount,
    operations: [
      ...operations,
      createOperation({ memo: NEXT_MEMO, status: 'signed' }),
    ],
    params: { memo: MEMO },
    routes: [
      {
        name: Routes.GACHA.HOME,
        Component: createRouteParamsProbe(Routes.GACHA.HOME),
      },
    ],
  });
};

const finishReveal = async () => {
  await waitFor(() =>
    expect(
      screen.getByTestId(PackRevealSelectorsIDs.REVEAL_BUTTON),
    ).toBeEnabled(),
  );
  fireEvent.press(screen.getByTestId(PackRevealSelectorsIDs.REVEAL_BUTTON));
  await screen.findByTestId(GachaRevealTestIds.BUY_AGAIN_BUTTON);
};

const expectHome = async () => {
  expect(
    await screen.findByTestId(getRouteParamsProbeTestId(Routes.GACHA.HOME)),
  ).toHaveTextContent(JSON.stringify({ initialTab: 'packs' }));
  expect(
    screen.queryByTestId(GachaRevealTestIds.CONTAINER),
  ).not.toBeOnTheScreen();
};

const expectNextPack = async () => {
  await waitFor(() =>
    expect(controller.completePack).toHaveBeenLastCalledWith({
      account: MOCK_ACCOUNT,
      memo: NEXT_MEMO,
    }),
  );
  expect(await screen.findByTestId(GachaRevealTestIds.STAGE)).toHaveTextContent(
    strings('gacha.reveal.paying'),
  );
  expect(controller.generatePack).toHaveBeenCalledWith({
    account: MOCK_ACCOUNT,
    pack: PACK_REF,
  });
  expect(controller.dismissOperation).toHaveBeenCalledWith({
    account: MOCK_ACCOUNT,
    memo: MEMO,
  });
};

describeForPlatforms('GachaReveal journeys', () => {
  beforeEach(() => {
    AppState.currentState = 'active';
    Object.values(controller).forEach((method) => method.mockReset());
    getAssets.mockReset().mockResolvedValue({});
    jest.mocked(toast).mockClear();
    jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(true);
    controller.completePack.mockResolvedValue(CARD);
    controller.getPacks.mockResolvedValue([createPack()]);
    controller.refreshBuyback.mockResolvedValue({ status: 'unavailable' });
    Object.assign(Engine.context, {
      GachaController: controller,
      AssetsController: { getAssets },
    });
  });

  afterEach(() => {
    AppState.currentState = initialAppState;
    jest.restoreAllMocks();
  });

  it('completes the pack once and lets the user leave a pending payment without dismissing it', async () => {
    controller.completePack.mockReturnValue(new Promise(() => undefined));
    renderReveal({
      operations: [createOperation({ memo: MEMO, status: 'signed' })],
    });

    expect(
      await screen.findByTestId(GachaRevealTestIds.STAGE),
    ).toHaveTextContent(strings('gacha.reveal.paying'));
    expect(controller.completePack).toHaveBeenCalledTimes(1);
    expect(controller.completePack).toHaveBeenCalledWith({
      account: MOCK_ACCOUNT,
      memo: MEMO,
    });
    fireEvent.press(screen.getByTestId(GachaRevealTestIds.CLOSE_BUTTON));

    await expectHome();
    expect(controller.dismissOperation).not.toHaveBeenCalled();
  });

  it('retries a resumable operation and keeps the mapped error visible when retry fails', async () => {
    controller.completePack.mockRejectedValue(
      createCollectorCryptError({ code: 'SUBMIT_FAILED' }),
    );
    renderReveal({
      operations: [
        createOperation({
          memo: MEMO,
          status: 'signed',
          error: { code: 'SUBMIT_FAILED' },
        }),
      ],
    });

    fireEvent.press(await screen.findByTestId(GachaRevealTestIds.RETRY_BUTTON));

    await waitFor(() =>
      expect(controller.completePack).toHaveBeenCalledTimes(2),
    );
    expect(
      await screen.findByTestId(GachaRevealTestIds.ERROR_MESSAGE),
    ).toHaveTextContent(getCollectorCryptErrorMessage('SUBMIT_FAILED'));
  });

  it('closes a resumable error without dismissing the operation', async () => {
    controller.completePack.mockRejectedValue(
      createCollectorCryptError({ code: 'OPEN_PENDING' }),
    );
    renderReveal({
      operations: [createOperation({ memo: MEMO, status: 'paid' })],
    });

    fireEvent.press(
      await screen.findByTestId(GachaRevealTestIds.ERROR_CLOSE_BUTTON),
    );

    await expectHome();
    expect(controller.dismissOperation).not.toHaveBeenCalled();
  });

  it('confirms the expired pack again before replacing the route with the next purchase', async () => {
    controller.completePack.mockRejectedValueOnce(
      createCollectorCryptError({ code: 'PACK_EXPIRED' }),
    );
    controller.generatePack.mockResolvedValue(NEXT_MEMO);
    renderReveal({
      operations: [createOperation({ memo: MEMO, status: 'expired' })],
    });

    fireEvent.press(
      await screen.findByTestId(GachaRevealTestIds.START_OVER_BUTTON),
    );
    const confirm = await screen.findByTestId(
      GachaPurchaseSheetTestIds.CONFIRM_BUTTON,
    );
    expect(confirm).toHaveTextContent(strings('gacha.purchase.confirm'));
    expect(controller.generatePack).not.toHaveBeenCalled();
    fireEvent.press(confirm);

    await expectNextPack();
    expect(
      screen.queryByTestId(GachaRevealTestIds.START_OVER_BUTTON),
    ).not.toBeOnTheScreen();
  });

  it('keeps an expired pack and reports a failed replacement purchase in the confirmation', async () => {
    controller.completePack.mockRejectedValue(
      createCollectorCryptError({ code: 'PACK_EXPIRED' }),
    );
    controller.generatePack.mockRejectedValue(
      createCollectorCryptError({ code: 'MACHINE_UNAVAILABLE' }),
    );
    renderReveal({
      operations: [createOperation({ memo: MEMO, status: 'expired' })],
    });

    fireEvent.press(
      await screen.findByTestId(GachaRevealTestIds.START_OVER_BUTTON),
    );
    fireEvent.press(
      await screen.findByTestId(GachaPurchaseSheetTestIds.CONFIRM_BUTTON),
    );

    expect(
      await screen.findByTestId(GachaPurchaseSheetTestIds.ERROR),
    ).toHaveTextContent(getCollectorCryptErrorMessage('MACHINE_UNAVAILABLE'));
    expect(screen.getByTestId(GachaRevealTestIds.ERROR)).toBeOnTheScreen();
    expect(controller.dismissOperation).not.toHaveBeenCalled();
  });

  it('offers funding instead of buying an expired pack the balance no longer covers', async () => {
    controller.completePack.mockRejectedValue(
      createCollectorCryptError({ code: 'PACK_EXPIRED' }),
    );
    controller.getPacks.mockResolvedValue([createPack({ price: 55 })]);
    renderReveal({
      operations: [createOperation({ memo: MEMO, status: 'expired' })],
      usdcAmount: '50',
    });

    fireEvent.press(
      await screen.findByTestId(GachaRevealTestIds.START_OVER_BUTTON),
    );

    expect(
      await screen.findByTestId(GachaPurchaseSheetTestIds.CONFIRM_BUTTON),
    ).toHaveTextContent(
      strings('gacha.purchase.fund_and_open', { amount: '5' }),
    );
    expect(controller.generatePack).not.toHaveBeenCalled();
  });

  it('hides Start over when the catalogue no longer lists the expired pack', async () => {
    controller.completePack.mockRejectedValue(
      createCollectorCryptError({ code: 'PACK_EXPIRED' }),
    );
    controller.getPacks.mockResolvedValue([]);
    renderReveal({
      operations: [createOperation({ memo: MEMO, status: 'expired' })],
    });

    await waitFor(() => expect(controller.getPacks).toHaveBeenCalled());
    await waitFor(() =>
      expect(
        screen.queryByTestId(GachaRevealTestIds.START_OVER_BUTTON),
      ).not.toBeOnTheScreen(),
    );
    expect(
      screen.getByTestId(GachaRevealTestIds.ERROR_CLOSE_BUTTON),
    ).toBeEnabled();
  });

  it('only offers Close on a failed pack and dismisses it when leaving', async () => {
    controller.completePack.mockRejectedValue(
      createCollectorCryptError({ code: 'PACK_FAILED' }),
    );
    renderReveal({
      operations: [createOperation({ memo: MEMO, status: 'failed' })],
    });
    await screen.findByTestId(GachaRevealTestIds.ERROR_CLOSE_BUTTON);
    expect(
      screen.queryByTestId(GachaRevealTestIds.RETRY_BUTTON),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByTestId(GachaRevealTestIds.START_OVER_BUTTON),
    ).not.toBeOnTheScreen();

    fireEvent.press(screen.getByTestId(GachaRevealTestIds.ERROR_CLOSE_BUTTON));

    await expectHome();
    expect(controller.dismissOperation).toHaveBeenCalledWith({
      account: MOCK_ACCOUNT,
      memo: MEMO,
    });
  });

  it('explains an unknown operation and allows the user to leave', async () => {
    controller.completePack.mockRejectedValue(
      createCollectorCryptError({ code: 'NOT_FOUND' }),
    );
    renderReveal();
    expect(
      await screen.findByTestId(GachaRevealTestIds.ERROR_MESSAGE),
    ).toHaveTextContent(getCollectorCryptErrorMessage('NOT_FOUND'));

    fireEvent.press(screen.getByTestId(GachaRevealTestIds.ERROR_CLOSE_BUTTON));

    await expectHome();
  });

  it('reveals the card before exposing its offer and pack price and refreshes the balance', async () => {
    renderReveal({ operations: [OPENED], cards: [CARD] });
    await screen.findByTestId(PackRevealSelectorsIDs.REVEAL_BUTTON);
    expect(
      screen.queryByTestId(GachaRevealTestIds.SELL_AND_OPEN_BUTTON),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByTestId(GachaRevealTestIds.BUY_AGAIN_BUTTON),
    ).not.toBeOnTheScreen();

    await finishReveal();

    expect(screen.getByTestId(GachaRevealTestIds.REVEALED)).toBeOnTheScreen();
    expect(
      screen.getByTestId(GachaRevealTestIds.SELL_AND_OPEN_BUTTON),
    ).toHaveTextContent(
      strings('gacha.reveal.sell_and_open_amount', { amount: '42.00' }),
    );
    expect(
      screen.getByTestId(GachaRevealTestIds.BUY_AGAIN_BUTTON),
    ).toHaveTextContent(strings('gacha.reveal.buy_again', { amount: 50 }));
    await waitFor(() => expect(getAssets).toHaveBeenCalledTimes(1));
  });

  it('buys another pack without selling the revealed card', async () => {
    controller.generatePack.mockResolvedValue(NEXT_MEMO);
    renderReveal({ operations: [OPENED], cards: [CARD] });
    await finishReveal();

    fireEvent.press(screen.getByTestId(GachaRevealTestIds.BUY_AGAIN_BUTTON));

    await expectNextPack();
    expect(controller.sellCard).not.toHaveBeenCalled();
  });

  it('stays on the card when buying another pack fails', async () => {
    controller.generatePack.mockRejectedValue(
      createCollectorCryptError({ code: 'MACHINE_UNAVAILABLE' }),
    );
    renderReveal({ operations: [OPENED], cards: [CARD] });
    await finishReveal();

    fireEvent.press(screen.getByTestId(GachaRevealTestIds.BUY_AGAIN_BUTTON));

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: ToastSeverity.Danger,
          title: strings('gacha.toast.open_failed'),
        }),
      ),
    );
    expect(
      screen.getByTestId(GachaRevealTestIds.BUY_AGAIN_BUTTON),
    ).toBeEnabled();
    expect(screen.getByTestId(GachaRevealTestIds.REVEALED)).toBeOnTheScreen();
    expect(controller.sellCard).not.toHaveBeenCalled();
    expect(controller.dismissOperation).not.toHaveBeenCalled();
  });

  it('stays on the card and does not buy again when the sale fails', async () => {
    controller.sellCard.mockRejectedValue(
      createCollectorCryptError({ code: 'BUYBACK_UNAVAILABLE' }),
    );
    renderReveal({ operations: [OPENED], cards: [CARD] });
    await finishReveal();

    fireEvent.press(
      screen.getByTestId(GachaRevealTestIds.SELL_AND_OPEN_BUTTON),
    );

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: ToastSeverity.Danger,
          title: strings('gacha.toast.sell_failed'),
        }),
      ),
    );
    expect(
      screen.getByTestId(GachaRevealTestIds.BUY_AGAIN_BUTTON),
    ).toBeEnabled();
    expect(screen.getByTestId(GachaRevealTestIds.REVEALED)).toBeOnTheScreen();
    expect(controller.generatePack).not.toHaveBeenCalled();
    expect(controller.dismissOperation).not.toHaveBeenCalled();
  });

  it('sells the revealed card and opens the same pack again', async () => {
    controller.sellCard.mockResolvedValue({
      mint: CARD.mint,
      amount: '42000000',
      signature: 'sig',
    });
    controller.generatePack.mockResolvedValue(NEXT_MEMO);
    renderReveal({ operations: [OPENED], cards: [CARD], usdcAmount: '10' });
    await finishReveal();

    fireEvent.press(
      screen.getByTestId(GachaRevealTestIds.SELL_AND_OPEN_BUTTON),
    );

    await expectNextPack();
    expect(controller.sellCard).toHaveBeenCalledWith({
      account: MOCK_ACCOUNT,
      mint: CARD.mint,
      expectedAmount: '42000000',
    });
    expect(toast).toHaveBeenCalledWith({
      severity: ToastSeverity.Success,
      title: strings('gacha.toast.sold', { amount: '42.00' }),
      description: undefined,
      showCloseButton: false,
    });
  });

  it.each([
    { usdcAmount: '7', button: GachaRevealTestIds.SELL_AND_OPEN_BUTTON },
    { usdcAmount: '10', button: GachaRevealTestIds.BUY_AGAIN_BUTTON },
  ])(
    'prevents an unaffordable action with $usdcAmount USDC',
    async ({ usdcAmount, button }) => {
      renderReveal({ operations: [OPENED], cards: [CARD], usdcAmount });
      await finishReveal();

      fireEvent.press(screen.getByTestId(button));

      expect(screen.getByTestId(button)).toBeDisabled();
      if (usdcAmount === '10')
        expect(
          screen.getByTestId(GachaRevealTestIds.SELL_AND_OPEN_BUTTON),
        ).toBeEnabled();
      expect(controller.generatePack).not.toHaveBeenCalled();
      expect(controller.sellCard).not.toHaveBeenCalled();
    },
  );

  it('keeps the card and returns to Packs when closing', async () => {
    renderReveal({ operations: [OPENED], cards: [CARD] });
    await finishReveal();

    fireEvent.press(screen.getByTestId(GachaRevealTestIds.CLOSE_BUTTON));

    await expectHome();
    expect(controller.dismissOperation).toHaveBeenCalledWith({
      account: MOCK_ACCOUNT,
      memo: MEMO,
    });
    expect(controller.sellCard).not.toHaveBeenCalled();
    expect(controller.generatePack).not.toHaveBeenCalled();
  });

  it('offers buying again while an unknown buyback offer is being checked', async () => {
    const card = createCard({ mint: CARD.mint });
    controller.refreshBuyback.mockReturnValue(new Promise(() => undefined));
    renderReveal({ operations: [OPENED], cards: [card] });

    await finishReveal();

    expect(controller.refreshBuyback).toHaveBeenCalledWith({
      account: MOCK_ACCOUNT,
      mint: CARD.mint,
    });
    expect(
      screen.getByTestId(GachaRevealTestIds.BUY_AGAIN_BUTTON),
    ).toBeEnabled();
    expect(
      screen.queryByTestId(GachaRevealTestIds.SELL_AND_OPEN_BUTTON),
    ).not.toBeOnTheScreen();
  });
});
