import React from 'react';
import {
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react-native';
import Engine from '../../../../../core/Engine';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { strings } from '../../../../../../locales/i18n';
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
jest.mock('../../assets/packs/artwork/pokemon-50-spark/pack.webp', () => 21);
jest.mock('../../assets/packs/artwork/default-origin/pack.webp', () => 31);

const controller = jest.mocked(Engine.context.GachaController);
const PACK = createPack();

const renderSheet = (
  props: Partial<React.ComponentProps<typeof PackPurchaseSheet>> = {},
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
  );
  return { onClose, onPurchased };
};

describe('PackPurchaseSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    ).toHaveTextContent('Buy and Open');
  });

  it('omits the account row and signing explanation', () => {
    renderSheet();

    expect(screen.queryByText('Account')).not.toBeOnTheScreen();
    expect(screen.queryByText(MOCK_ACCOUNT.address)).not.toBeOnTheScreen();
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
      await screen.findByText(
        'This pack is not available right now. Try another pack.',
      ),
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

  it('disables the confirmation when the balance is too low', () => {
    renderSheet({ balance: 10_000_000n });

    fireEvent.press(
      screen.getByTestId(GachaPurchaseSheetTestIds.CONFIRM_BUTTON),
    );

    expect(controller.generatePack).not.toHaveBeenCalled();
    expect(
      screen.getByTestId(GachaPurchaseSheetTestIds.CONFIRM_BUTTON),
    ).toBeDisabled();
    expect(
      screen.getByText(strings('gacha.packs.insufficient_usdc')),
    ).toBeOnTheScreen();
  });

  it('closes through the header control', async () => {
    const { onClose } = renderSheet();

    fireEvent.press(screen.getByTestId(GachaPurchaseSheetTestIds.CLOSE_BUTTON));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });
});
