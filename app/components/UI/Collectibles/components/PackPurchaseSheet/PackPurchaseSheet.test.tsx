import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createDeferredPromise } from '@metamask/utils';
import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react-native';
import Engine from '../../../../../core/Engine';
import type { RootState } from '../../../../../reducers';
import renderWithProvider, {
  type DeepPartial,
} from '../../../../../util/test/renderWithProvider';
import { strings } from '../../../../../../locales/i18n';
import { CollectiblesPurchaseSheetTestIds } from '../../Collectibles.testIds';
import { createPackPartnerError } from '../../providers/pack-partner/services/errors';
import { MOCK_ACCOUNT, createPack } from '../../views/testUtils';
import PackPurchaseSheet from './PackPurchaseSheet';

jest.mock('../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: { CollectiblesController: { generatePack: jest.fn() } },
  },
}));

// Match Metro's numeric asset sources rather than Jest's filename strings.
jest.mock('../../assets/named-packs/pokemon-charged.webp', () => 21);
jest.mock('../../assets/named-packs/pokemon-core.webp', () => 31);

const controller = jest.mocked(Engine.context.CollectiblesController);
const PACK = createPack();

const renderSheet = (
  props: Partial<React.ComponentProps<typeof PackPurchaseSheet>> = {},
  state?: DeepPartial<RootState>,
) => {
  const onClose = jest.fn();
  const onPurchased = jest.fn();
  renderWithProvider(
    <PackPurchaseSheet
      pack={PACK}
      account={MOCK_ACCOUNT}
      balance={120_000_000n}
      onClose={onClose}
      onPurchased={onPurchased}
      {...props}
    />,
    { state },
  );
  return { onClose, onPurchased };
};

describe('PackPurchaseSheet', () => {
  beforeEach(() => {
    controller.generatePack.mockReset();
    jest.mocked(AsyncStorage.getItem).mockResolvedValue(null);
    jest.mocked(AsyncStorage.setItem).mockResolvedValue();
  });

  it('shows the price-first review with its display name and essential purchase details', () => {
    renderSheet();

    expect(screen.getByText('Pokémon Charged Pack')).toBeOnTheScreen();
    expect(
      screen.queryByTestId(CollectiblesPurchaseSheetTestIds.IMAGE),
    ).not.toBeOnTheScreen();
    expect(
      screen.getByTestId('collectibles-purchase-amount'),
    ).toHaveTextContent('$50');
    expect(screen.getByTestId('collectibles-purchase-total')).toHaveTextContent(
      'Total$50',
    );
    expect(
      screen.getByTestId('collectibles-payment-selector'),
    ).toHaveTextContent('USDC ($120)');
    expect(
      screen.getByTestId(CollectiblesPurchaseSheetTestIds.CONFIRM_BUTTON),
    ).toHaveTextContent(strings('collectibles.purchase.buy_one_pack'));
  });

  it('omits the signing explanation', () => {
    renderSheet();

    expect(
      screen.queryByText(
        'MetaMask signs the payment for you once you confirm. No other approval is needed.',
      ),
    ).not.toBeOnTheScreen();
  });

  it('keeps purchase content scrollable while the title and confirmation stay fixed', () => {
    renderSheet();

    const content = within(
      screen.getByTestId(CollectiblesPurchaseSheetTestIds.CONTENT),
    );
    expect(
      content.getByTestId('collectibles-purchase-amount'),
    ).toBeOnTheScreen();
    expect(
      content.queryByText(strings('collectibles.purchase.odds')),
    ).not.toBeOnTheScreen();
    expect(
      content.queryByText(strings('collectibles.purchase.buy')),
    ).not.toBeOnTheScreen();
    expect(
      content.queryByTestId(CollectiblesPurchaseSheetTestIds.CONFIRM_BUTTON),
    ).not.toBeOnTheScreen();
  });

  it('keeps an unknown pack API name', () => {
    const pack = createPack({
      code: 'new-pack',
      name: 'New Collector Pack',
      category: null,
      price: 37,
    });

    renderSheet({ pack });

    expect(screen.getByText(pack.name)).toBeOnTheScreen();
    expect(
      screen.queryByTestId(CollectiblesPurchaseSheetTestIds.IMAGE),
    ).not.toBeOnTheScreen();
  });

  it('generates the pack, closes and hands over the memo on confirm', async () => {
    controller.generatePack.mockResolvedValue('memo-new');
    const { onClose, onPurchased } = renderSheet();

    fireEvent.press(
      screen.getByTestId(CollectiblesPurchaseSheetTestIds.CONFIRM_BUTTON),
    );

    await waitFor(() =>
      expect(onPurchased).toHaveBeenCalledWith('memo-new', {
        skipReveal: false,
      }),
    );
    expect(controller.generatePack).toHaveBeenCalledWith({
      account: MOCK_ACCOUNT,
      pack: {
        code: PACK.code,
        name: PACK.name,
        price: PACK.price,
        priceAmount: PACK.priceAmount,
      },
      options: { quantity: 1, turbo: false },
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('reviews quantity and Turbo independently before preparing transactions', async () => {
    controller.generatePack.mockResolvedValue('memo-batch');
    renderSheet({ balance: 1000000000n });
    fireEvent.press(screen.getByTestId('collectibles-quantity-plus'));
    fireEvent.press(screen.getByTestId('collectibles-quantity-plus'));
    fireEvent(screen.getByTestId('collectibles-turbo'), 'valueChange', true);
    expect(controller.generatePack).not.toHaveBeenCalled();

    fireEvent.press(
      screen.getByTestId(CollectiblesPurchaseSheetTestIds.CONFIRM_BUTTON),
    );

    await waitFor(() =>
      expect(controller.generatePack).toHaveBeenCalledWith({
        account: MOCK_ACCOUNT,
        pack: {
          code: PACK.code,
          name: PACK.name,
          price: PACK.price,
          priceAmount: PACK.priceAmount,
        },
        options: { quantity: 3, turbo: true },
      }),
    );
  });

  it('caps the reviewed purchase at five packs', () => {
    renderSheet({ balance: 1000000000n });
    for (let index = 0; index < 8; index += 1)
      fireEvent.press(screen.getByTestId('collectibles-quantity-plus'));
    expect(screen.getByTestId('collectibles-quantity')).toHaveTextContent(
      '5 packs',
    );
    expect(screen.getByTestId('collectibles-quantity-plus')).toBeDisabled();
    expect(controller.generatePack).not.toHaveBeenCalled();
  });

  it('updates the total from presets and limits Max to the available balance', () => {
    renderSheet({ balance: 149_999_999n });

    fireEvent.press(screen.getByTestId('collectibles-quantity-preset-5'));

    expect(
      screen.getByTestId('collectibles-purchase-amount'),
    ).toHaveTextContent('$250');
    expect(
      screen.getByTestId(CollectiblesPurchaseSheetTestIds.CONFIRM_BUTTON),
    ).toBeDisabled();

    fireEvent.press(screen.getByTestId('collectibles-quantity-max'));

    expect(screen.getByTestId('collectibles-quantity')).toHaveTextContent(
      '2 packs',
    );
    expect(screen.getByTestId('collectibles-purchase-total')).toHaveTextContent(
      'Total$100',
    );
    expect(
      screen.getByTestId(CollectiblesPurchaseSheetTestIds.CONFIRM_BUTTON),
    ).toBeEnabled();
    expect(controller.generatePack).not.toHaveBeenCalled();
  });

  it('keeps Turbo independent of skipping reveals and passes the presentation choice', async () => {
    controller.generatePack.mockResolvedValue('memo-skip');
    const { onPurchased } = renderSheet();

    fireEvent(
      screen.getByTestId('collectibles-skip-reveals'),
      'valueChange',
      true,
    );
    fireEvent.press(
      screen.getByTestId(CollectiblesPurchaseSheetTestIds.CONFIRM_BUTTON),
    );

    await waitFor(() =>
      expect(onPurchased).toHaveBeenCalledWith('memo-skip', {
        skipReveal: true,
      }),
    );
    expect(controller.generatePack).toHaveBeenCalledWith({
      account: MOCK_ACCOUNT,
      pack: {
        code: PACK.code,
        name: PACK.name,
        price: PACK.price,
        priceAmount: PACK.priceAmount,
      },
      options: { quantity: 1, turbo: false },
    });
  });

  it('blocks an unaffordable batch and leaves payment selection disabled', () => {
    const { onClose, onPurchased } = renderSheet({ balance: 60_000_000n });
    fireEvent.press(screen.getByTestId('collectibles-quantity-plus'));
    fireEvent(screen.getByTestId('collectibles-turbo'), 'valueChange', true);

    fireEvent.press(
      screen.getByTestId(CollectiblesPurchaseSheetTestIds.CONFIRM_BUTTON),
    );

    expect(
      screen.getByTestId(CollectiblesPurchaseSheetTestIds.CONFIRM_BUTTON),
    ).toBeDisabled();
    expect(screen.getByTestId('collectibles-payment-selector')).toBeDisabled();
    expect(
      screen.getByTestId('collectibles-insufficient-usdc'),
    ).toBeOnTheScreen();
    expect(controller.generatePack).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(onPurchased).not.toHaveBeenCalled();
  });

  it('keeps the sheet open with the mapped error when generation fails', async () => {
    controller.generatePack.mockRejectedValue(
      createPackPartnerError({ code: 'MACHINE_UNAVAILABLE' }),
    );
    const { onClose, onPurchased } = renderSheet();

    fireEvent.press(
      screen.getByTestId(CollectiblesPurchaseSheetTestIds.CONFIRM_BUTTON),
    );

    expect(
      await screen.findByText(
        strings('collectibles.errors.machine_unavailable'),
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(CollectiblesPurchaseSheetTestIds.SHEET),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(CollectiblesPurchaseSheetTestIds.CONFIRM_BUTTON),
    ).toBeEnabled();
    expect(onPurchased).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it.each([0n, 49_999_999n])(
    'blocks confirmation when available funds are %s',
    (balance) => {
      renderSheet({ balance });

      fireEvent.press(
        screen.getByTestId(CollectiblesPurchaseSheetTestIds.CONFIRM_BUTTON),
      );

      expect(
        screen.getByTestId(CollectiblesPurchaseSheetTestIds.CONFIRM_BUTTON),
      ).toBeDisabled();
      expect(controller.generatePack).not.toHaveBeenCalled();
    },
  );

  it('allows an exactly funded purchase with no second payment flow', () => {
    renderSheet({ balance: 50_000_000n });

    expect(
      screen.getByTestId(CollectiblesPurchaseSheetTestIds.CONFIRM_BUTTON),
    ).toBeEnabled();
    expect(
      screen.queryByTestId('collectibles-insufficient-usdc'),
    ).not.toBeOnTheScreen();
    expect(screen.getByTestId('collectibles-payment-selector')).toBeDisabled();
  });

  it('prices, checks and signs the exact base-unit price rather than the rounded catalogue price', async () => {
    controller.generatePack.mockResolvedValue('memo-exact');
    const pack = createPack({ price: 50, priceAmount: '49990000' });
    renderSheet({ pack, balance: 49_990_000n });

    expect(
      screen.getByTestId('collectibles-purchase-amount'),
    ).toHaveTextContent('$49.99');
    fireEvent.press(
      screen.getByTestId(CollectiblesPurchaseSheetTestIds.CONFIRM_BUTTON),
    );

    await waitFor(() =>
      expect(controller.generatePack).toHaveBeenCalledWith({
        account: MOCK_ACCOUNT,
        pack: {
          code: pack.code,
          name: pack.name,
          price: 50,
          priceAmount: '49990000',
        },
        options: { quantity: 1, turbo: false },
      }),
    );
  });

  it('does not generate another pack while a purchase is pending', async () => {
    const purchase = createDeferredPromise<string>();
    controller.generatePack.mockReturnValue(purchase.promise);
    const { onPurchased } = renderSheet();
    const button = screen.getByTestId(
      CollectiblesPurchaseSheetTestIds.CONFIRM_BUTTON,
    );

    act(() => {
      fireEvent.press(button);
      fireEvent.press(button);
    });

    expect(controller.generatePack).toHaveBeenCalledTimes(1);
    await act(async () => purchase.resolve('memo-once'));
    await waitFor(() =>
      expect(onPurchased).toHaveBeenCalledWith('memo-once', {
        skipReveal: false,
      }),
    );
    expect(onPurchased).toHaveBeenCalledTimes(1);
  });

  it('closes through the header control', async () => {
    const { onClose } = renderSheet();

    fireEvent.press(
      screen.getByTestId(CollectiblesPurchaseSheetTestIds.CLOSE_BUTTON),
    );

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });
});
