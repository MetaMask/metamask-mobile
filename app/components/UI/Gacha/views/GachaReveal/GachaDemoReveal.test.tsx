import { act, fireEvent, screen } from '@testing-library/react-native';
import Routes from '../../../../../constants/navigation/Routes';
import Engine from '../../../../../core/Engine';
import { selectSelectedInternalAccountByScope } from '../../../../../selectors/multichainAccounts/accounts';
import { strings } from '../../../../../../locales/i18n';
import {
  GachaCardDisplayTestIds,
  GachaRevealTestIds,
} from '../../Gacha.testIds';
import { isGachaDevEnabled } from '../../dev/revealDemo';
import {
  MOCK_INTERNAL_ACCOUNT,
  createCard,
  createOperation,
  createTestState,
  renderScreenWithQueryClient,
} from '../testUtils';
import GachaReveal from './GachaReveal';
import type { PackRevealProps } from '../../components/PackReveal/PackReveal.types';

const mockPopTo = jest.fn();
let mockOnRevealed: (() => void) | undefined;

// Metro inlines the development environment flag; test the route's gated branches.
jest.mock('../../dev/revealDemo', () => ({
  ...jest.requireActual('../../dev/revealDemo'),
  isGachaDevEnabled: jest.fn(),
}));

// Control the animation boundary to verify the demo never starts a real operation.
jest.mock('../../components/PackReveal', () => ({
  __esModule: true,
  default: function MockPackReveal({ children, onRevealed }: PackRevealProps) {
    const { useSharedValue } = jest.requireActual<
      typeof import('react-native-reanimated')
    >('react-native-reanimated');
    const progress = useSharedValue(1);
    mockOnRevealed = onRevealed;
    return typeof children === 'function' ? children(progress) : children;
  },
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ popTo: mockPopTo }),
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

const controller = jest.mocked(Engine.context.GachaController);
const CARD = createCard({ mint: 'FirstCard', name: 'First collection card' });
const SECOND_CARD = createCard({
  mint: 'SecondCard',
  name: 'Second collection card',
});
const DEMO_STATE = createTestState({
  cards: [CARD, SECOND_CARD],
  operations: [createOperation()],
  usdcAmount: '100',
});
const renderDemo = (state = DEMO_STATE) =>
  renderScreenWithQueryClient(GachaReveal, {
    name: Routes.GACHA.REVEAL,
    params: { demo: true },
    state,
  });
const finishReveal = () => {
  act(() => mockOnRevealed?.());
};
const expectNoControllerActions = () => {
  expect(controller.completePack).not.toHaveBeenCalled();
  expect(controller.generatePack).not.toHaveBeenCalled();
  expect(controller.sellCard).not.toHaveBeenCalled();
  expect(controller.dismissOperation).not.toHaveBeenCalled();
  expect(controller.refreshBuyback).not.toHaveBeenCalled();
  expect(Engine.context.AssetsController.getAssets).not.toHaveBeenCalled();
};

describe('Gacha reveal demo route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOnRevealed = undefined;
    jest.mocked(isGachaDevEnabled).mockReturnValue(true);
    jest
      .mocked(selectSelectedInternalAccountByScope)
      .mockReturnValue(() => MOCK_INTERNAL_ACCOUNT);
  });

  it('reveals the first collection card without running a purchase', () => {
    const { store } = renderDemo();

    finishReveal();

    expect(screen.getByTestId(GachaRevealTestIds.CONTAINER)).toBeOnTheScreen();
    expect(screen.getByTestId(GachaCardDisplayTestIds.NAME)).toHaveTextContent(
      CARD.name,
    );
    expect(screen.queryByText(SECOND_CARD.name)).not.toBeOnTheScreen();
    expectNoControllerActions();
    expect(store.getState().engine.backgroundState.GachaController).toEqual(
      DEMO_STATE.engine?.backgroundState?.GachaController,
    );
  });

  it.each(['common', 'uncommon', 'rare', 'epic'] as const)(
    'previews %s rarity without changing the collection card',
    (rarity) => {
      const { store } = renderDemo();
      finishReveal();

      fireEvent.press(
        screen.getByTestId(GachaRevealTestIds.DEMO_RARITY(rarity)),
      );
      finishReveal();

      expect(
        screen.getByTestId(GachaCardDisplayTestIds.RARITY),
      ).toHaveTextContent(strings(`gacha.rarity.${rarity}`));
      expect(store.getState().engine.backgroundState.GachaController).toEqual(
        DEMO_STATE.engine?.backgroundState?.GachaController,
      );
      expectNoControllerActions();
    },
  );

  it.each([
    GachaRevealTestIds.DEMO_REPLAY_BUTTON,
    GachaRevealTestIds.DEMO_SELL_AND_OPEN_BUTTON,
  ])('replays through %s without paying or selling', (buttonId) => {
    const { store } = renderDemo();
    finishReveal();

    fireEvent.press(screen.getByTestId(buttonId));

    expect(screen.queryByTestId(buttonId)).not.toBeOnTheScreen();
    expectNoControllerActions();

    finishReveal();

    expect(screen.getByTestId(buttonId)).toBeOnTheScreen();
    expect(store.getState().engine.backgroundState.GachaController).toEqual(
      DEMO_STATE.engine?.backgroundState?.GachaController,
    );
    expectNoControllerActions();
  });

  it('closes to Dev without dismissing or selling a real card', () => {
    renderDemo();
    finishReveal();

    fireEvent.press(screen.getByTestId(GachaRevealTestIds.CLOSE_BUTTON));

    expect(mockPopTo).toHaveBeenCalledWith(Routes.GACHA.HOME, {
      initialTab: 'dev',
    });
    expectNoControllerActions();
  });

  it('offers closing an empty collection without starting an operation', () => {
    renderDemo(createTestState());

    expect(screen.getByText(strings('gacha.demo.no_card'))).toBeOnTheScreen();
    expect(
      screen.queryByTestId(GachaRevealTestIds.DEMO_REPLAY_BUTTON),
    ).not.toBeOnTheScreen();

    fireEvent.press(screen.getByTestId(GachaRevealTestIds.CLOSE_BUTTON));

    expect(mockPopTo).toHaveBeenCalledWith(Routes.GACHA.HOME, {
      initialTab: 'dev',
    });
    expectNoControllerActions();
  });

  it('keeps a disabled demo route out of the real purchase flow', () => {
    jest.mocked(isGachaDevEnabled).mockReturnValue(false);

    renderDemo();

    expect(
      screen.queryByTestId(GachaRevealTestIds.CONTAINER),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByTestId(GachaRevealTestIds.DEMO_REPLAY_BUTTON),
    ).not.toBeOnTheScreen();
    expect(mockPopTo).toHaveBeenCalledWith(Routes.GACHA.HOME, {
      initialTab: 'packs',
    });
    expectNoControllerActions();
  });
});
