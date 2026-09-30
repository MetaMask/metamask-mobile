import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import Engine from '../../../../../core/Engine';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { GachaPurchaseSheetTestIds } from '../../Gacha.testIds';
import { createCollectorCryptError } from '../../providers/collector-crypt/services/errors';
import { MOCK_ACCOUNT, createPack } from '../../views/testUtils';
import PackPurchaseSheet, { shortenAddress } from './PackPurchaseSheet';

jest.mock('../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: { GachaController: { generatePack: jest.fn() } },
  },
}));

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

  it('shows the pack, price, balance after and account', () => {
    renderSheet();

    expect(screen.getByText('Open a pack')).toBeOnTheScreen();
    expect(screen.getByText('Elite Pokemon Pack')).toBeOnTheScreen();
    expect(screen.getByText('50.00 USDC')).toBeOnTheScreen();
    expect(screen.getByText('120.00 USDC available')).toBeOnTheScreen();
    expect(
      screen.getByTestId(GachaPurchaseSheetTestIds.BALANCE_AFTER),
    ).toHaveTextContent('70.00 USDC');
    expect(
      screen.getByText(shortenAddress(MOCK_ACCOUNT.address)),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Sell the card back instantly for 85% of its value, within 72 hours.',
      ),
    ).toBeOnTheScreen();
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
      screen.getByTestId(GachaPurchaseSheetTestIds.BALANCE_AFTER),
    ).toHaveTextContent('0.00 USDC');
  });

  it('closes through the header control', async () => {
    const { onClose } = renderSheet();

    fireEvent.press(screen.getByTestId(GachaPurchaseSheetTestIds.CLOSE_BUTTON));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });
});

describe('shortenAddress', () => {
  it('keeps the first and last four characters', () => {
    expect(shortenAddress('5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp')).toBe(
      '5eyk…Kvdp',
    );
  });

  it('returns short addresses unchanged', () => {
    expect(shortenAddress('abc')).toBe('abc');
  });
});
