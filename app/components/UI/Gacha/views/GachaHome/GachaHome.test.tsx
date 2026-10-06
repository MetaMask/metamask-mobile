import { fireEvent, screen } from '@testing-library/react-native';
import Routes from '../../../../../constants/navigation/Routes';
import Engine from '../../../../../core/Engine';
import { selectSelectedInternalAccountByScope } from '../../../../../selectors/multichainAccounts/accounts';
import {
  GachaHomeTestIds,
  GachaDevTestIds,
  GachaPackCardTestIds,
  GachaPacksTestIds,
  GachaPurchaseSheetTestIds,
} from '../../Gacha.testIds';
import { DEMO_PACK_CODE, isGachaDevEnabled } from '../../dev/revealDemo';
import {
  MOCK_ACCOUNT,
  MOCK_INTERNAL_ACCOUNT,
  createCard,
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
import type { QuickBuyRootProps } from '../../../QuickBuy/types';
import {
  COLLECTOR_CRYPT_SCOPE,
  SOLANA_USDC_MINT,
} from '../../providers/collector-crypt/constants';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockHomeNavigationState = {
  index: 0,
  routes: [{ name: Routes.GACHA.HOME }],
};
// Quick Buy's native sheet and transaction callbacks have separate contract tests.
const mockQuickBuyRoot = jest.fn((_props: QuickBuyRootProps) => null);

jest.mock('../../../QuickBuy/quickBuy', () => ({
  QuickBuy: { Root: (props: QuickBuyRootProps) => mockQuickBuyRoot(props) },
}));

jest.mock('../../dev/revealDemo', () => ({
  ...jest.requireActual('../../dev/revealDemo'),
  isGachaDevEnabled: jest.fn(),
}));

jest.mock('@shopify/flash-list', () =>
  jest.requireActual('../../../../../util/test/mockFlashList').flashListMock(),
);

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
    getParent: () => undefined,
    getState: () => mockHomeNavigationState,
    addListener: () => () => undefined,
  }),
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
        resetOnboarding: jest.fn(),
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

// Quick Buy's native callbacks and the compile-time Dev flag require isolated
// contracts; screen behavior lives in GachaHome/GachaFunding.view.test.tsx.
describe('GachaHome', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(isGachaDevEnabled).mockReturnValue(false);
    jest
      .mocked(selectSelectedInternalAccountByScope)
      .mockReturnValue(mockAccountByScope);
    mockAccountByScope.mockReturnValue(MOCK_INTERNAL_ACCOUNT);
    controller.getPacks.mockResolvedValue([POKEMON_PACK, ONE_PIECE_PACK]);
    controller.syncCards.mockResolvedValue([]);
    controller.recoverOperations.mockResolvedValue(undefined);
  });

  it('opens Solana USDC funding from the balance button without a purchase', async () => {
    renderHome();
    await screen.findByTestId(GachaPacksTestIds.LIST);

    fireEvent.press(screen.getByTestId(GachaHomeTestIds.FUND_BUTTON));

    expect(mockQuickBuyRoot.mock.calls.at(-1)?.[0]).toEqual(
      expect.objectContaining({
        isVisible: true,
        initialAmountUsd: undefined,
        destinationAddress: MOCK_ACCOUNT.address,
        features: expect.objectContaining({ tradeModes: ['buy'] }),
        target: expect.objectContaining({
          chain: COLLECTOR_CRYPT_SCOPE,
          tokenAddress: SOLANA_USDC_MINT,
        }),
      }),
    );
    expect(controller.generatePack).not.toHaveBeenCalled();
  });

  it('opens the local demo without a purchase sheet or payment', async () => {
    jest.mocked(isGachaDevEnabled).mockReturnValue(true);
    renderHome({ cards: [CARD], usdcAmount: '0' });

    await screen.findByTestId(GachaPacksTestIds.LIST);
    expect(
      screen.queryByTestId(GachaPackCardTestIds.CARD(DEMO_PACK_CODE)),
    ).not.toBeOnTheScreen();
    fireEvent.press(screen.getByTestId(GachaHomeTestIds.DEV_TAB));

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

  it('resets onboarding only from the local Dev tab', async () => {
    jest.mocked(isGachaDevEnabled).mockReturnValue(true);
    renderHome();
    await screen.findByTestId(GachaPacksTestIds.LIST);

    fireEvent.press(screen.getByTestId(GachaHomeTestIds.DEV_TAB));
    fireEvent.press(screen.getByTestId(GachaDevTestIds.RESET_ONBOARDING));

    expect(controller.resetOnboarding).toHaveBeenCalledTimes(1);
    expect(controller.generatePack).not.toHaveBeenCalled();
  });

  it('ignores a Dev tab parameter when local tools are disabled', async () => {
    renderHome({ params: { initialTab: 'dev' } });

    await screen.findByTestId(GachaPacksTestIds.LIST);

    expect(
      screen.queryByTestId(GachaHomeTestIds.DEV_TAB),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByTestId(GachaDevTestIds.CONTAINER),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByTestId(GachaPackCardTestIds.CARD(DEMO_PACK_CODE)),
    ).not.toBeOnTheScreen();
  });
});
