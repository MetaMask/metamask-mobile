import type { ReactNode } from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { StackActions } from '@react-navigation/native';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import Engine from '../../../../../core/Engine';
import { selectSelectedInternalAccountByScope } from '../../../../../selectors/multichainAccounts/accounts';
import { GachaRevealTestIds } from '../../Gacha.testIds';
import { showErrorToast, showSuccessToast } from '../../hooks/toasts';
import { createCollectorCryptError } from '../../providers/collector-crypt/services/errors';
import type {
  CollectorCryptCard,
  PackOperation,
} from '../../providers/collector-crypt/types';
import {
  MOCK_ACCOUNT,
  MOCK_INTERNAL_ACCOUNT,
  createCard,
  createOperation,
  createTestState,
  renderScreenWithQueryClient,
} from '../testUtils';
import GachaReveal from './GachaReveal';

const mockPopTo = jest.fn();
const mockDispatch = jest.fn();
let mockOnRevealed: (() => void) | undefined;

jest.mock('../../components/PackReveal', () => ({
  __esModule: true,
  default: ({
    children,
    onRevealed,
  }: {
    children: ReactNode;
    onRevealed?: () => void;
  }) => {
    mockOnRevealed = onRevealed;
    return children;
  },
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ popTo: mockPopTo, dispatch: mockDispatch }),
}));

jest.mock('../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      GachaController: {
        completePack: jest.fn(),
        generatePack: jest.fn(),
        dismissOperation: jest.fn(),
        refreshBuyback: jest.fn(),
        sellCard: jest.fn(),
      },
      AssetsController: { getAssets: jest.fn() },
    },
  },
}));

jest.mock('../../../../../selectors/multichainAccounts/accounts', () => ({
  ...jest.requireActual('../../../../../selectors/multichainAccounts/accounts'),
  selectSelectedInternalAccountByScope: jest.fn(),
}));

jest.mock('../../hooks/toasts', () => ({
  showSuccessToast: jest.fn(),
  showErrorToast: jest.fn(),
}));

const controller = jest.mocked(Engine.context.GachaController);
const mockGetAssets = jest.mocked(Engine.context.AssetsController.getAssets);

const MEMO = 'memo-1';
const CARD = createCard({
  mint: 'MintA',
  buyback: { status: 'available', amount: '42000000' },
});
const OPENED = createOperation({ memo: MEMO, status: 'opened', mint: 'MintA' });
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
} = {}) =>
  renderScreenWithQueryClient(GachaReveal, {
    name: Routes.GACHA.REVEAL,
    params: { memo: MEMO },
    state: createTestState({ operations, cards, usdcAmount }),
  });

const expectHomeWith = (params?: object) =>
  expect(mockPopTo).toHaveBeenCalledWith(Routes.GACHA.HOME, params);

const finishReveal = () => {
  act(() => mockOnRevealed?.());
};

describe('GachaReveal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOnRevealed = undefined;
    jest
      .mocked(selectSelectedInternalAccountByScope)
      .mockReturnValue(() => MOCK_INTERNAL_ACCOUNT);
    controller.completePack.mockResolvedValue(CARD);
    controller.refreshBuyback.mockResolvedValue({ status: 'unavailable' });
    mockGetAssets.mockResolvedValue({});
  });

  describe('processing', () => {
    it('completes the pack once and shows the payment stage', () => {
      controller.completePack.mockReturnValue(new Promise(() => undefined));

      renderReveal({
        operations: [createOperation({ memo: MEMO, status: 'signed' })],
      });

      expect(
        screen.getByTestId(GachaRevealTestIds.PROCESSING),
      ).toBeOnTheScreen();
      expect(screen.getByTestId(GachaRevealTestIds.STAGE)).toHaveTextContent(
        'Confirming the payment',
      );
      expect(controller.completePack).toHaveBeenCalledTimes(1);
      expect(controller.completePack).toHaveBeenCalledWith({
        account: MOCK_ACCOUNT,
        memo: MEMO,
      });
    });

    it('closes without dismissing the running operation', () => {
      controller.completePack.mockReturnValue(new Promise(() => undefined));
      renderReveal({
        operations: [createOperation({ memo: MEMO, status: 'generated' })],
      });

      fireEvent.press(screen.getByTestId(GachaRevealTestIds.CLOSE_BUTTON));

      expect(controller.dismissOperation).not.toHaveBeenCalled();
      expectHomeWith({ initialTab: 'packs' });
    });
  });

  describe('error', () => {
    it('shows the mapped error and retries a resumable operation', async () => {
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

      fireEvent.press(
        await screen.findByTestId(GachaRevealTestIds.RETRY_BUTTON),
      );

      await waitFor(() =>
        expect(
          screen.getByTestId(GachaRevealTestIds.ERROR_MESSAGE),
        ).toHaveTextContent(/couldn't be sent/u),
      );
      expect(controller.completePack).toHaveBeenCalledTimes(2);
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

      expect(controller.dismissOperation).not.toHaveBeenCalled();
      expectHomeWith({ initialTab: 'packs' });
    });

    it('starts over an expired pack with the same pack', async () => {
      controller.completePack.mockRejectedValue(
        createCollectorCryptError({ code: 'PACK_EXPIRED' }),
      );
      controller.generatePack.mockResolvedValue('memo-2');
      renderReveal({
        operations: [createOperation({ memo: MEMO, status: 'expired' })],
      });

      fireEvent.press(screen.getByTestId(GachaRevealTestIds.START_OVER_BUTTON));

      await waitFor(() =>
        expect(mockDispatch).toHaveBeenCalledWith(
          StackActions.replace(Routes.GACHA.REVEAL, {
            memo: 'memo-2',
          }),
        ),
      );
      expect(controller.generatePack).toHaveBeenCalledWith({
        account: MOCK_ACCOUNT,
        pack: PACK_REF,
      });
      expect(controller.dismissOperation).toHaveBeenCalledWith({
        account: MOCK_ACCOUNT,
        memo: MEMO,
      });
      expect(
        screen.queryByTestId(GachaRevealTestIds.RETRY_BUTTON),
      ).not.toBeOnTheScreen();
    });

    it('shows a toast when starting over fails', async () => {
      controller.completePack.mockRejectedValue(
        createCollectorCryptError({ code: 'PACK_EXPIRED' }),
      );
      controller.generatePack.mockRejectedValue(
        createCollectorCryptError({ code: 'MACHINE_UNAVAILABLE' }),
      );
      renderReveal({
        operations: [createOperation({ memo: MEMO, status: 'expired' })],
      });

      fireEvent.press(screen.getByTestId(GachaRevealTestIds.START_OVER_BUTTON));

      await waitFor(() =>
        expect(showErrorToast).toHaveBeenCalledWith(
          "We couldn't open your pack",
          'This pack is not available right now. Try another pack.',
        ),
      );
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('only offers Close on a failed pack and dismisses it', async () => {
      controller.completePack.mockRejectedValue(
        createCollectorCryptError({ code: 'PACK_FAILED' }),
      );
      renderReveal({
        operations: [createOperation({ memo: MEMO, status: 'failed' })],
      });

      fireEvent.press(
        screen.getByTestId(GachaRevealTestIds.ERROR_CLOSE_BUTTON),
      );

      expect(
        screen.queryByTestId(GachaRevealTestIds.RETRY_BUTTON),
      ).not.toBeOnTheScreen();
      expect(
        screen.queryByTestId(GachaRevealTestIds.START_OVER_BUTTON),
      ).not.toBeOnTheScreen();
      expect(controller.dismissOperation).toHaveBeenCalledWith({
        account: MOCK_ACCOUNT,
        memo: MEMO,
      });
      expectHomeWith({ initialTab: 'packs' });
    });

    it('shows not found for an unknown operation', async () => {
      controller.completePack.mockRejectedValue(
        createCollectorCryptError({ code: 'NOT_FOUND' }),
      );
      renderReveal();

      expect(
        await screen.findByTestId(GachaRevealTestIds.ERROR_MESSAGE),
      ).toHaveTextContent("We couldn't find this item.");
    });
  });

  describe('revealed', () => {
    it('waits for the reveal animation before offering purchase actions', () => {
      renderReveal({ operations: [OPENED], cards: [CARD] });

      expect(
        screen.queryByTestId(GachaRevealTestIds.SELL_AND_OPEN_BUTTON),
      ).not.toBeOnTheScreen();
      expect(
        screen.queryByTestId(GachaRevealTestIds.BUY_AGAIN_BUTTON),
      ).not.toBeOnTheScreen();

      finishReveal();

      expect(
        screen.getByTestId(GachaRevealTestIds.SELL_AND_OPEN_BUTTON),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(GachaRevealTestIds.BUY_AGAIN_BUTTON),
      ).toBeOnTheScreen();
    });

    it('shows the offer and pack price after revealing and refreshes the USDC balance', async () => {
      renderReveal({ operations: [OPENED], cards: [CARD] });

      finishReveal();

      expect(screen.getByTestId(GachaRevealTestIds.REVEALED)).toBeOnTheScreen();
      expect(
        screen.getByTestId(GachaRevealTestIds.SELL_AND_OPEN_BUTTON),
      ).toHaveTextContent(
        strings('gacha.reveal.sell_and_open_amount', { amount: '42.00' }),
      );
      expect(
        screen.getByTestId(GachaRevealTestIds.BUY_AGAIN_BUTTON),
      ).toHaveTextContent(strings('gacha.reveal.buy_again', { amount: 50 }));
      await waitFor(() => expect(mockGetAssets).toHaveBeenCalledTimes(1));
    });

    it('buys another pack without selling the revealed card', async () => {
      controller.generatePack.mockResolvedValue('memo-2');
      renderReveal({ operations: [OPENED], cards: [CARD] });
      finishReveal();

      fireEvent.press(screen.getByTestId(GachaRevealTestIds.BUY_AGAIN_BUTTON));

      await waitFor(() =>
        expect(mockDispatch).toHaveBeenCalledWith(
          StackActions.replace(Routes.GACHA.REVEAL, { memo: 'memo-2' }),
        ),
      );
      expect(controller.generatePack).toHaveBeenCalledWith({
        account: MOCK_ACCOUNT,
        pack: PACK_REF,
      });
      expect(controller.dismissOperation).toHaveBeenCalledWith({
        account: MOCK_ACCOUNT,
        memo: MEMO,
      });
      expect(controller.sellCard).not.toHaveBeenCalled();
    });

    it('stays on the card when buying another pack fails', async () => {
      controller.generatePack.mockRejectedValue(
        createCollectorCryptError({ code: 'MACHINE_UNAVAILABLE' }),
      );
      renderReveal({ operations: [OPENED], cards: [CARD] });
      finishReveal();

      fireEvent.press(screen.getByTestId(GachaRevealTestIds.BUY_AGAIN_BUTTON));

      await waitFor(() => expect(showErrorToast).toHaveBeenCalled());
      expect(
        screen.getByTestId(GachaRevealTestIds.BUY_AGAIN_BUTTON),
      ).toBeEnabled();
      expect(screen.getByTestId(GachaRevealTestIds.REVEALED)).toBeOnTheScreen();
      expect(controller.sellCard).not.toHaveBeenCalled();
      expect(controller.dismissOperation).not.toHaveBeenCalled();
      expect(mockDispatch).not.toHaveBeenCalled();
      expect(mockPopTo).not.toHaveBeenCalled();
    });

    it('stays on the card when selling and opening another pack fails at the sale', async () => {
      controller.sellCard.mockRejectedValue(
        createCollectorCryptError({ code: 'BUYBACK_UNAVAILABLE' }),
      );
      renderReveal({ operations: [OPENED], cards: [CARD] });
      finishReveal();

      fireEvent.press(
        screen.getByTestId(GachaRevealTestIds.SELL_AND_OPEN_BUTTON),
      );

      await waitFor(() => expect(showErrorToast).toHaveBeenCalled());
      await waitFor(() =>
        expect(
          screen.getByTestId(GachaRevealTestIds.BUY_AGAIN_BUTTON),
        ).toBeEnabled(),
      );
      expect(screen.getByTestId(GachaRevealTestIds.REVEALED)).toBeOnTheScreen();
      expect(controller.generatePack).not.toHaveBeenCalled();
      expect(controller.dismissOperation).not.toHaveBeenCalled();
      expect(mockDispatch).not.toHaveBeenCalled();
      expect(mockPopTo).not.toHaveBeenCalled();
    });

    it('sells and opens the same pack again', async () => {
      controller.sellCard.mockResolvedValue({
        mint: 'MintA',
        amount: '42000000',
        signature: 'sig',
      });
      controller.generatePack.mockResolvedValue('memo-2');
      renderReveal({ operations: [OPENED], cards: [CARD], usdcAmount: '10' });
      finishReveal();

      fireEvent.press(
        screen.getByTestId(GachaRevealTestIds.SELL_AND_OPEN_BUTTON),
      );

      await waitFor(() =>
        expect(mockDispatch).toHaveBeenCalledWith(
          StackActions.replace(Routes.GACHA.REVEAL, { memo: 'memo-2' }),
        ),
      );
      expect(controller.sellCard).toHaveBeenCalledWith({
        account: MOCK_ACCOUNT,
        mint: 'MintA',
      });
      expect(showSuccessToast).toHaveBeenCalledWith('Sold for 42.00 USDC');
      expect(controller.generatePack).toHaveBeenCalledWith({
        account: MOCK_ACCOUNT,
        pack: PACK_REF,
      });
      expect(controller.dismissOperation).toHaveBeenCalledWith({
        account: MOCK_ACCOUNT,
        memo: MEMO,
      });
    });

    it('disables selling and opening when balance plus refund is below the price', () => {
      renderReveal({ operations: [OPENED], cards: [CARD], usdcAmount: '7' });
      finishReveal();

      fireEvent.press(
        screen.getByTestId(GachaRevealTestIds.SELL_AND_OPEN_BUTTON),
      );

      expect(
        screen.getByTestId(GachaRevealTestIds.SELL_AND_OPEN_BUTTON),
      ).toBeDisabled();
      expect(controller.sellCard).not.toHaveBeenCalled();
      expect(controller.generatePack).not.toHaveBeenCalled();
    });

    it('disables buying again when the balance alone is below the pack price', () => {
      renderReveal({ operations: [OPENED], cards: [CARD], usdcAmount: '10' });
      finishReveal();

      fireEvent.press(screen.getByTestId(GachaRevealTestIds.BUY_AGAIN_BUTTON));

      expect(
        screen.getByTestId(GachaRevealTestIds.BUY_AGAIN_BUTTON),
      ).toBeDisabled();
      expect(
        screen.getByTestId(GachaRevealTestIds.SELL_AND_OPEN_BUTTON),
      ).toBeEnabled();
      expect(controller.generatePack).not.toHaveBeenCalled();
      expect(controller.sellCard).not.toHaveBeenCalled();
    });

    it('keeps the card and returns to Packs when closing', () => {
      renderReveal({ operations: [OPENED], cards: [CARD] });
      finishReveal();

      fireEvent.press(screen.getByTestId(GachaRevealTestIds.CLOSE_BUTTON));

      expect(controller.dismissOperation).toHaveBeenCalledWith({
        account: MOCK_ACCOUNT,
        memo: MEMO,
      });
      expectHomeWith({ initialTab: 'packs' });
      expect(controller.sellCard).not.toHaveBeenCalled();
      expect(controller.generatePack).not.toHaveBeenCalled();
    });

    it('offers buying again while checking an unknown buyback offer', async () => {
      const card = createCard({ mint: 'MintA' });
      controller.completePack.mockResolvedValue(card);
      renderReveal({ operations: [OPENED], cards: [card] });
      finishReveal();

      await waitFor(() =>
        expect(controller.refreshBuyback).toHaveBeenCalledWith({
          account: MOCK_ACCOUNT,
          mint: 'MintA',
        }),
      );
      expect(
        screen.getByTestId(GachaRevealTestIds.BUY_AGAIN_BUTTON),
      ).toBeEnabled();
      expect(
        screen.queryByTestId(GachaRevealTestIds.SELL_AND_OPEN_BUTTON),
      ).not.toBeOnTheScreen();
    });
  });
});
