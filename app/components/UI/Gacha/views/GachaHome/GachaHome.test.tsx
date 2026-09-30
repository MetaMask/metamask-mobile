import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { CommonActions } from '@react-navigation/native';
import Routes from '../../../../../constants/navigation/Routes';
import Engine from '../../../../../core/Engine';
import { selectSelectedInternalAccountByScope } from '../../../../../selectors/multichainAccounts/accounts';
import {
  GachaAttentionBannerTestIds,
  GachaCardTileTestIds,
  GachaHomeTestIds,
  GachaPackCardTestIds,
  GachaPacksTestIds,
  GachaPurchaseSheetTestIds,
} from '../../Gacha.testIds';
import { createCollectorCryptError } from '../../providers/collector-crypt/services/errors';
import { DEMO_PACK_CODE, isGachaRevealDemoEnabled } from '../../dev/revealDemo';
import {
  MOCK_ACCOUNT,
  MOCK_INTERNAL_ACCOUNT,
  createCard,
  createOperation,
  createPack,
  createTestState,
  renderScreenWithQueryClient,
} from '../testUtils';
import type {
  CollectorCryptCard,
  PackOperation,
} from '../../providers/collector-crypt/types';
import type { GachaHomeParams } from '../../types/navigation';
import GachaHome from './GachaHome';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('../../dev/revealDemo', () => ({
  ...jest.requireActual('../../dev/revealDemo'),
  isGachaRevealDemoEnabled: jest.fn(),
}));

jest.mock('@shopify/flash-list', () =>
  jest.requireActual('../../../../../util/test/mockFlashList').flashListMock(),
);

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
}));

jest.mock('../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      GachaController: {
        getPacks: jest.fn(),
        generatePack: jest.fn(),
        syncCards: jest.fn(),
        recoverOperations: jest.fn(),
      },
      AssetsController: { getAssets: jest.fn() },
    },
  },
}));

jest.mock('../../../../../selectors/multichainAccounts/accounts', () => ({
  ...jest.requireActual('../../../../../selectors/multichainAccounts/accounts'),
  selectSelectedInternalAccountByScope: jest.fn(),
}));

const controller = jest.mocked(Engine.context.GachaController);
const mockAccountByScope = jest.fn();

const POKEMON_PACK = createPack();
const ONE_PIECE_PACK = createPack({
  code: 'one_piece_25',
  name: 'One Piece Pack',
  category: 'One Piece',
  price: 25,
});
const CARD = createCard({ mint: 'MintA' });

const renderHome = ({
  cards = [],
  operations = [],
  usdcAmount = '100',
  params,
}: {
  cards?: CollectorCryptCard[];
  operations?: PackOperation[];
  usdcAmount?: string;
  params?: GachaHomeParams;
} = {}) =>
  renderScreenWithQueryClient(GachaHome, {
    name: Routes.GACHA.HOME,
    params,
    state: createTestState({ cards, operations, usdcAmount }),
  });

/** Waits for the first card sync to settle. */
const waitForSync = async () => {
  await waitFor(() => expect(controller.syncCards).toHaveBeenCalled());
  await act(async () => undefined);
};

describe('GachaHome', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(isGachaRevealDemoEnabled).mockReturnValue(false);
    jest
      .mocked(selectSelectedInternalAccountByScope)
      .mockReturnValue(mockAccountByScope);
    mockAccountByScope.mockReturnValue(MOCK_INTERNAL_ACCOUNT);
    controller.getPacks.mockResolvedValue([POKEMON_PACK, ONE_PIECE_PACK]);
    controller.syncCards.mockResolvedValue([]);
    controller.recoverOperations.mockResolvedValue(undefined);
  });

  it('shows the USDC balance, collection filters and packs by price', async () => {
    renderHome({ usdcAmount: '100.999999' });

    expect(
      await screen.findByTestId(GachaPacksTestIds.FILTERS),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(GachaPacksTestIds.COLLECTION_FILTER('')),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(GachaPacksTestIds.COLLECTION_FILTER('One Piece')),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(GachaPacksTestIds.COLLECTION_FILTER('Pokemon')),
    ).toBeOnTheScreen();
    expect(screen.getByTestId(GachaHomeTestIds.BALANCE)).toHaveTextContent(
      /^100$/u,
    );
    expect(
      screen.queryByText('Powered by Collector Crypt'),
    ).not.toBeOnTheScreen();
    expect(screen.queryByText('Balance')).not.toBeOnTheScreen();
  });

  it('filters packs to one collection at a time', async () => {
    renderHome();

    await screen.findByTestId(GachaPacksTestIds.FILTERS);
    fireEvent.press(
      screen.getByTestId(GachaPacksTestIds.COLLECTION_FILTER('One Piece')),
    );

    expect(
      screen.getByTestId(GachaPackCardTestIds.CARD(ONE_PIECE_PACK.code)),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(GachaPackCardTestIds.CARD(POKEMON_PACK.code)),
    ).not.toBeOnTheScreen();
    expect(
      screen.getByTestId(GachaPacksTestIds.COLLECTION_FILTER('One Piece')).props
        .accessibilityState?.selected,
    ).toBe(true);
    expect(
      screen.getByTestId(GachaPacksTestIds.COLLECTION_FILTER('')).props
        .accessibilityState?.selected,
    ).toBe(false);

    fireEvent.press(
      screen.getByTestId(GachaPacksTestIds.COLLECTION_FILTER('')),
    );

    expect(
      screen.getByTestId(GachaPackCardTestIds.CARD(ONE_PIECE_PACK.code)),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(GachaPackCardTestIds.CARD(POKEMON_PACK.code)),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(GachaPacksTestIds.COLLECTION_FILTER('')).props
        .accessibilityState?.selected,
    ).toBe(true);
    expect(
      screen.getByTestId(GachaPacksTestIds.COLLECTION_FILTER('One Piece')).props
        .accessibilityState?.selected,
    ).toBe(false);
  });

  it('recovers interrupted operations of the account on mount', async () => {
    renderHome();

    await waitForSync();

    expect(controller.recoverOperations).toHaveBeenCalledTimes(1);
    expect(controller.recoverOperations).toHaveBeenCalledWith({
      account: MOCK_ACCOUNT,
    });
  });

  it('disables Open on packs priced above the balance', async () => {
    renderHome({ usdcAmount: '30' });

    const pokemonButton = await screen.findByTestId(
      GachaPackCardTestIds.OPEN_BUTTON(POKEMON_PACK.code),
    );

    expect(pokemonButton).toBeDisabled();
    expect(
      screen.getByTestId(GachaPackCardTestIds.OPEN_BUTTON(ONE_PIECE_PACK.code)),
    ).toBeEnabled();
  });

  it('stays on Packs when My cards is pressed without any card', async () => {
    renderHome();
    await screen.findByTestId(GachaPacksTestIds.LIST);
    await waitForSync();

    fireEvent.press(screen.getByTestId(GachaHomeTestIds.CARDS_TAB));

    expect(screen.getByTestId(GachaPacksTestIds.LIST)).toBeOnTheScreen();
  });

  it('opens My cards when the account has cards and opens a card', async () => {
    renderHome({ cards: [CARD] });
    await screen.findByTestId(GachaPacksTestIds.LIST);

    fireEvent.press(screen.getByTestId(GachaHomeTestIds.CARDS_TAB));
    fireEvent.press(
      await screen.findByTestId(GachaCardTileTestIds.TILE('MintA')),
    );

    expect(screen.queryByTestId(GachaPacksTestIds.LIST)).not.toBeOnTheScreen();
    expect(mockNavigate).toHaveBeenCalledWith(Routes.GACHA.CARD, {
      mint: 'MintA',
    });
  });

  it('opens My cards from the initialTab param', async () => {
    renderHome({ cards: [CARD], params: { initialTab: 'cards' } });

    expect(
      await screen.findByTestId(GachaCardTileTestIds.TILE('MintA')),
    ).toBeOnTheScreen();
  });

  it('falls back to Packs when initialTab is cards and the sync finds no card', async () => {
    renderHome({ params: { initialTab: 'cards' } });

    expect(await screen.findByTestId(GachaPacksTestIds.LIST)).toBeOnTheScreen();
  });

  it('reacts to a new initialTab param', async () => {
    const { navigationRef } = renderHome({ cards: [CARD] });
    await screen.findByTestId(GachaPacksTestIds.LIST);

    act(() => {
      navigationRef.dispatch(CommonActions.setParams({ initialTab: 'cards' }));
    });

    expect(
      await screen.findByTestId(GachaCardTileTestIds.TILE('MintA')),
    ).toBeOnTheScreen();
  });

  it('shows the newest operation needing attention and opens its reveal', async () => {
    renderHome({
      operations: [
        createOperation({ memo: 'memo-old', status: 'expired', createdAt: 1 }),
        createOperation({ memo: 'memo-new', status: 'opened', createdAt: 2 }),
      ],
    });

    fireEvent.press(await screen.findByText('View'));

    expect(
      screen.getByTestId(GachaAttentionBannerTestIds.BANNER),
    ).toBeOnTheScreen();
    expect(screen.getByText('You have a card to reveal')).toBeOnTheScreen();
    expect(mockNavigate).toHaveBeenCalledWith(Routes.GACHA.REVEAL, {
      memo: 'memo-new',
    });
  });

  it('confirms a purchase in the sheet and opens the reveal', async () => {
    controller.generatePack.mockResolvedValue('memo-bought');
    renderHome();

    fireEvent.press(
      await screen.findByTestId(
        GachaPackCardTestIds.OPEN_BUTTON(POKEMON_PACK.code),
      ),
    );
    fireEvent.press(
      await screen.findByTestId(GachaPurchaseSheetTestIds.CONFIRM_BUTTON),
    );

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith(Routes.GACHA.REVEAL, {
        memo: 'memo-bought',
      }),
    );
    expect(controller.generatePack).toHaveBeenCalledWith({
      account: MOCK_ACCOUNT,
      pack: {
        code: POKEMON_PACK.code,
        name: POKEMON_PACK.name,
        price: POKEMON_PACK.price,
      },
    });
  });

  it('opens the local demo without a purchase sheet or payment', async () => {
    jest.mocked(isGachaRevealDemoEnabled).mockReturnValue(true);
    renderHome({ cards: [CARD], usdcAmount: '0' });

    fireEvent.press(
      await screen.findByTestId(
        GachaPackCardTestIds.OPEN_BUTTON(DEMO_PACK_CODE),
      ),
    );

    expect(mockNavigate).toHaveBeenCalledWith(Routes.GACHA.REVEAL, {
      demo: true,
    });
    expect(
      screen.queryByTestId(GachaPurchaseSheetTestIds.SHEET),
    ).not.toBeOnTheScreen();
    expect(controller.generatePack).not.toHaveBeenCalled();
  });

  it('shows the packs error with a retry', async () => {
    controller.getPacks.mockRejectedValueOnce(
      createCollectorCryptError({ code: 'NETWORK_ERROR', retryable: true }),
    );
    renderHome();

    expect(
      await screen.findByTestId(GachaPacksTestIds.ERROR),
    ).toHaveTextContent(/Connection problem/u);

    fireEvent.press(screen.getByText('Try again'));

    expect(await screen.findByTestId(GachaPacksTestIds.LIST)).toBeOnTheScreen();
    expect(controller.getPacks).toHaveBeenCalledTimes(2);
  });

  it('shows the empty packs message', async () => {
    controller.getPacks.mockResolvedValue([]);
    renderHome();

    expect(
      await screen.findByTestId(GachaPacksTestIds.EMPTY),
    ).toBeOnTheScreen();
  });

  it('asks for a Solana account when the account group has none', () => {
    mockAccountByScope.mockReturnValue(undefined);
    renderHome();

    expect(screen.getByTestId(GachaHomeTestIds.NO_ACCOUNT)).toBeOnTheScreen();
    expect(screen.queryByTestId(GachaHomeTestIds.TABS)).not.toBeOnTheScreen();
    expect(controller.syncCards).not.toHaveBeenCalled();
  });

  it('goes back from the header', () => {
    renderHome();

    fireEvent.press(screen.getByTestId(GachaHomeTestIds.BACK_BUTTON));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
