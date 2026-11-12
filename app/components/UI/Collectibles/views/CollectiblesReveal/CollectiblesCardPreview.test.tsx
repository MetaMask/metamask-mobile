import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import Routes from '../../../../../constants/navigation/Routes';
import Engine from '../../../../../core/Engine';
import { selectSelectedInternalAccountByScope } from '../../../../../selectors/multichainAccounts/accounts';
import {
  CollectiblesCardViewTestIds,
  CollectiblesRevealTestIds,
} from '../../Collectibles.testIds';
import {
  MOCK_ACCOUNT,
  MOCK_INTERNAL_ACCOUNT,
  packPartnerReads,
  createCard,
  createOperation,
  createTestState,
  renderScreenWithQueryClient,
  serveOwnedCards,
} from '../testUtils';
import CollectiblesReveal from './CollectiblesReveal';
import type { PackRevealProps } from '../../components/PackReveal/PackReveal.types';

const mockGoBack = jest.fn();
const mockPopTo = jest.fn();
let mockOnRevealed: (() => void) | undefined;

// The WebView completion callback is native; this contract isolates replay from writes.
jest.mock('../../components/PackReveal', () => ({
  __esModule: true,
  default: function MockPackReveal({ children, onRevealed }: PackRevealProps) {
    mockOnRevealed = onRevealed;
    return children;
  },
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: mockGoBack, popTo: mockPopTo }),
}));

jest.mock('../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      CollectiblesController: {
        completePack: jest.fn(),
        generatePack: jest.fn(),
        dismissOperation: jest.fn(),
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

const controller = jest.mocked(Engine.context.CollectiblesController);
const CARD = createCard({
  mint: 'OwnedCard',
  name: 'Owned card',
  set: 'Owned set',
});
const PREVIEW_STATE = createTestState({
  operations: [createOperation()],
  usdcAmount: '100',
});
const finishReveal = () => {
  act(() => mockOnRevealed?.());
};
// Reads (owned cards and their offers) are allowed; no write may start.
const expectNoControllerActions = () => {
  expect(controller.completePack).not.toHaveBeenCalled();
  expect(controller.generatePack).not.toHaveBeenCalled();
  expect(controller.sellCard).not.toHaveBeenCalled();
  expect(controller.dismissOperation).not.toHaveBeenCalled();
  expect(Engine.context.AssetsController.getAssets).not.toHaveBeenCalled();
};

describe('Collected card replay isolation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOnRevealed = undefined;
    jest
      .mocked(selectSelectedInternalAccountByScope)
      .mockReturnValue(() => MOCK_INTERNAL_ACCOUNT);
    serveOwnedCards(MOCK_ACCOUNT.address, [CARD]);
  });

  it('rejects restored routes without a purchase memo or owned card', () => {
    renderScreenWithQueryClient(CollectiblesReveal, {
      name: Routes.COLLECTIBLES.REVEAL,
      params: {},
      state: PREVIEW_STATE,
    });

    expect(mockPopTo).toHaveBeenCalledWith(Routes.COLLECTIBLES.HOME, {
      initialTab: 'packs',
    });
    expectNoControllerActions();
  });

  it('replays a card PackPartner reports as owned without mounting a purchase or buyback flow', async () => {
    const { store } = renderScreenWithQueryClient(CollectiblesReveal, {
      name: Routes.COLLECTIBLES.REVEAL,
      params: { previewMint: CARD.mint },
      state: PREVIEW_STATE,
    });
    await waitFor(() => expect(mockOnRevealed).toBeDefined());

    finishReveal();

    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expectNoControllerActions();
    expect(
      store.getState().engine.backgroundState.CollectiblesController,
    ).toEqual(PREVIEW_STATE.engine?.backgroundState?.CollectiblesController);
  });

  it('closes a card the owned-card read does not return without starting an operation', async () => {
    renderScreenWithQueryClient(CollectiblesReveal, {
      name: Routes.COLLECTIBLES.REVEAL,
      params: { previewMint: 'MissingCard' },
      state: PREVIEW_STATE,
    });
    expect(
      await screen.findByTestId(CollectiblesCardViewTestIds.NOT_FOUND),
    ).toBeOnTheScreen();
    expect(packPartnerReads.getOwnedCards).toHaveBeenCalledWith(
      MOCK_ACCOUNT.address,
    );

    fireEvent.press(screen.getByTestId(CollectiblesRevealTestIds.CLOSE_BUTTON));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expectNoControllerActions();
  });
});
