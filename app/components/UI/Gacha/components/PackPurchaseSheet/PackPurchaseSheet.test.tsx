import React from 'react';
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
import { getIntlNumberFormatter } from '../../../../../util/intl';
import renderWithProvider, {
  type DeepPartial,
} from '../../../../../util/test/renderWithProvider';
import I18n, { strings } from '../../../../../../locales/i18n';
import { GachaPurchaseSheetTestIds } from '../../Gacha.testIds';
import { createCollectorCryptError } from '../../providers/collector-crypt/services/errors';
import { MOCK_ACCOUNT, createPack } from '../../views/testUtils';
import PackPurchaseSheet from './PackPurchaseSheet';

jest.mock('../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: { GachaController: { generatePack: jest.fn() } },
  },
}));

// Match Metro's numeric asset sources rather than Jest's filename strings.
jest.mock('../../assets/pack-artwork/pokemon-50-spark.webp', () => 21);
jest.mock('../../assets/pack-artwork/default-origin.webp', () => 31);

const controller = jest.mocked(Engine.context.GachaController);
const PACK = createPack();

const renderSheet = (
  props: Partial<React.ComponentProps<typeof PackPurchaseSheet>> = {},
  state?: DeepPartial<RootState>,
) => {
  const onClose = jest.fn();
  const onPurchased = jest.fn();
  const onFundAndOpen = jest.fn();
  renderWithProvider(
    <PackPurchaseSheet
      pack={PACK}
      account={MOCK_ACCOUNT}
      balance={120_000_000n}
      onClose={onClose}
      onPurchased={onPurchased}
      onFundAndOpen={onFundAndOpen}
      {...props}
    />,
    { state },
  );
  return { onClose, onPurchased, onFundAndOpen };
};

describe('PackPurchaseSheet', () => {
  beforeEach(() => {
    controller.generatePack.mockReset();
  });

  it('shows the artwork with its display name and essential purchase details', () => {
    renderSheet();

    expect(screen.getByText('Pokémon Spark')).toBeOnTheScreen();
    expect(screen.getByTestId(GachaPurchaseSheetTestIds.IMAGE)).toHaveProp(
      'source',
      21,
    );
    expect(screen.getByText('50.00 USDC')).toBeOnTheScreen();
    expect(
      screen.getByTestId(GachaPurchaseSheetTestIds.CONFIRM_BUTTON),
    ).toHaveTextContent(strings('gacha.purchase.confirm'));
  });

  it('omits the signing explanation', () => {
    renderSheet();

    expect(
      screen.queryByText(
        'MetaMask signs the payment for you once you confirm. No other approval is needed.',
      ),
    ).not.toBeOnTheScreen();
  });

  it('shows the pack odds for all four rarities', () => {
    renderSheet();

    const odds = within(screen.getByTestId(GachaPurchaseSheetTestIds.ODDS));
    expect(odds.getByText(strings('gacha.rarity.common'))).toBeOnTheScreen();
    expect(odds.getByText('80%')).toBeOnTheScreen();
    expect(odds.getByText(strings('gacha.rarity.uncommon'))).toBeOnTheScreen();
    expect(odds.getByText('15%')).toBeOnTheScreen();
    expect(odds.getByText(strings('gacha.rarity.rare'))).toBeOnTheScreen();
    expect(odds.getByText('4%')).toBeOnTheScreen();
    expect(odds.getByText(strings('gacha.rarity.epic'))).toBeOnTheScreen();
    expect(odds.getByText('1%')).toBeOnTheScreen();
  });

  it('preserves fractional percentages in the pack odds', () => {
    const pack = createPack({
      odds: { common: 0.7525, uncommon: 0.2, rare: 0.04, epic: 0.0075 },
    });

    renderSheet({ pack });

    const odds = within(screen.getByTestId(GachaPurchaseSheetTestIds.ODDS));
    expect(odds.getByText('75.25%')).toBeOnTheScreen();
    expect(odds.getByText('20%')).toBeOnTheScreen();
    expect(odds.getByText('4%')).toBeOnTheScreen();
    expect(odds.getByText('0.75%')).toBeOnTheScreen();
  });

  it('keeps the artwork and odds in scrollable content below the fixed header', () => {
    renderSheet();

    const content = within(
      screen.getByTestId(GachaPurchaseSheetTestIds.CONTENT),
    );
    expect(
      content.getByTestId(GachaPurchaseSheetTestIds.IMAGE),
    ).toBeOnTheScreen();
    expect(
      content.getByTestId(GachaPurchaseSheetTestIds.ODDS),
    ).toBeOnTheScreen();
    expect(content.queryByText('Pokémon Spark')).not.toBeOnTheScreen();
    expect(
      content.queryByTestId(GachaPurchaseSheetTestIds.CONFIRM_BUTTON),
    ).not.toBeOnTheScreen();
  });

  it('keeps an unknown pack API name with the default artwork', () => {
    const pack = createPack({ code: 'new-pack', name: 'New Collector Pack' });

    renderSheet({ pack });

    expect(screen.getByText(pack.name)).toBeOnTheScreen();
    expect(screen.getByTestId(GachaPurchaseSheetTestIds.IMAGE)).toHaveProp(
      'source',
      31,
    );
  });

  it('generates the pack, closes and hands over the memo on confirm', async () => {
    controller.generatePack.mockResolvedValue('memo-new');
    const { onClose, onPurchased } = renderSheet();

    fireEvent.press(
      screen.getByTestId(GachaPurchaseSheetTestIds.CONFIRM_BUTTON),
    );

    await waitFor(() => expect(onPurchased).toHaveBeenCalledWith('memo-new'));
    expect(controller.generatePack).toHaveBeenCalledWith({
      account: MOCK_ACCOUNT,
      pack: { code: PACK.code, name: PACK.name, price: PACK.price },
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('keeps the sheet open with the mapped error when generation fails', async () => {
    controller.generatePack.mockRejectedValue(
      createCollectorCryptError({ code: 'MACHINE_UNAVAILABLE' }),
    );
    const { onClose, onPurchased } = renderSheet();

    fireEvent.press(
      screen.getByTestId(GachaPurchaseSheetTestIds.CONFIRM_BUTTON),
    );

    expect(
      await screen.findByText(strings('gacha.errors.machine_unavailable')),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(GachaPurchaseSheetTestIds.SHEET),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(GachaPurchaseSheetTestIds.CONFIRM_BUTTON),
    ).toBeEnabled();
    expect(onPurchased).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes the sheet before requesting funding for an unaffordable pack', async () => {
    const { onClose, onFundAndOpen, onPurchased } = renderSheet({
      balance: 10_000_000n,
    });
    const button = screen.getByTestId(GachaPurchaseSheetTestIds.CONFIRM_BUTTON);
    expect(button).toBeEnabled();
    const label = strings('gacha.purchase.fund_and_open', { amount: '40' });
    expect(button).toHaveTextContent(label);

    fireEvent.press(button);

    await waitFor(() => expect(onFundAndOpen).toHaveBeenCalledWith(PACK));
    expect(onFundAndOpen).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onClose.mock.invocationCallOrder[0]).toBeLessThan(
      onFundAndOpen.mock.invocationCallOrder[0],
    );
    expect(controller.generatePack).not.toHaveBeenCalled();
    expect(onPurchased).not.toHaveBeenCalled();
  });

  it.each([
    { price: 50, balance: 29_900_000n, amount: '21' },
    { price: 50, balance: 49_999_999n, amount: '1' },
    { price: 10_000, balance: 4_999_900_000n, amount: '5,001' },
  ])(
    'rounds up only the shortfall for a $price pack and $balance balance',
    ({ price, balance, amount }) => {
      renderSheet({ pack: createPack({ price }), balance });

      expect(
        screen.getByTestId(GachaPurchaseSheetTestIds.CONFIRM_BUTTON),
      ).toHaveTextContent(strings('gacha.purchase.fund_and_open', { amount }));
    },
  );

  it('passes a number to the funding formatter on Hermes', () => {
    const formatter = getIntlNumberFormatter(I18n.locale);
    const originalFormat = formatter.format;
    // Node accepts bigint here, but the app's Hermes Intl implementation does not.
    const format = jest.fn((value: number | bigint) => {
      if (typeof value === 'bigint') {
        throw new TypeError('Cannot convert BigInt to number');
      }
      return originalFormat(value);
    });
    const originalDescriptor = Object.getOwnPropertyDescriptor(
      formatter,
      'format',
    );
    Object.defineProperty(formatter, 'format', {
      configurable: true,
      value: format,
    });

    try {
      renderSheet({ balance: 29_900_000n });

      expect(format).toHaveBeenCalledWith(21);
      expect(
        screen.getByTestId(GachaPurchaseSheetTestIds.CONFIRM_BUTTON),
      ).toHaveTextContent(
        strings('gacha.purchase.fund_and_open', { amount: '21' }),
      );
    } finally {
      if (originalDescriptor) {
        Object.defineProperty(formatter, 'format', originalDescriptor);
      } else {
        Reflect.deleteProperty(formatter, 'format');
      }
    }
  });

  it('does not generate another pack while a purchase is pending', async () => {
    const purchase = createDeferredPromise<string>();
    controller.generatePack.mockReturnValue(purchase.promise);
    const { onPurchased } = renderSheet();
    const button = screen.getByTestId(GachaPurchaseSheetTestIds.CONFIRM_BUTTON);

    act(() => {
      fireEvent.press(button);
      fireEvent.press(button);
    });

    expect(controller.generatePack).toHaveBeenCalledTimes(1);
    await act(async () => purchase.resolve('memo-once'));
    await waitFor(() => expect(onPurchased).toHaveBeenCalledWith('memo-once'));
    expect(onPurchased).toHaveBeenCalledTimes(1);
  });

  it('starts funding only once when confirmation is pressed repeatedly', async () => {
    const { onFundAndOpen } = renderSheet({ balance: 0n });
    const button = screen.getByTestId(GachaPurchaseSheetTestIds.CONFIRM_BUTTON);

    act(() => {
      fireEvent.press(button);
      fireEvent.press(button);
    });

    await waitFor(() => expect(onFundAndOpen).toHaveBeenCalledTimes(1));
    expect(controller.generatePack).not.toHaveBeenCalled();
  });

  it('closes through the header control', async () => {
    const { onClose } = renderSheet();

    fireEvent.press(screen.getByTestId(GachaPurchaseSheetTestIds.CLOSE_BUTTON));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });
});
