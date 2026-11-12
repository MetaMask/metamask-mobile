import { fireEvent, screen } from '@testing-library/react-native';
import Routes from '../../../../../constants/navigation/Routes';
import Engine from '../../../../../core/Engine';
import { selectSelectedInternalAccountByScope } from '../../../../../selectors/multichainAccounts/accounts';
import {
  CollectiblesHomeTestIds,
  CollectiblesDevTestIds,
  CollectiblesPacksTestIds,
} from '../../Collectibles.testIds';
import { isCollectiblesDevEnabled } from '../../dev/devTools';
import {
  MOCK_INTERNAL_ACCOUNT,
  packPartnerReads,
  createPack,
  createTestState,
  renderScreenWithQueryClient,
} from '../testUtils';
import type { CollectiblesPackOperation } from '../../types';
import type { CollectiblesHomeParams } from '../../types/navigation';
import CollectiblesHome from './CollectiblesHome';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockHomeNavigationState = {
  index: 0,
  routes: [{ name: Routes.COLLECTIBLES.HOME }],
};
jest.mock('../../dev/devTools', () => ({
  ...jest.requireActual('../../dev/devTools'),
  isCollectiblesDevEnabled: jest.fn(),
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
      CollectiblesController: {
        generatePack: jest.fn(),
        resetOnboarding: jest.fn(),
      },
      AssetsController: { getAssets: jest.fn() },
    },
    controllerMessenger: {
      call: jest.fn(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
    },
  },
}));

jest.mock('../../../../../selectors/multichainAccounts/accounts', () => ({
  ...jest.requireActual('../../../../../selectors/multichainAccounts/accounts'),
  selectSelectedInternalAccountByScope: jest.fn(),
}));

const controller = jest.mocked(Engine.context.CollectiblesController);
const mockAccountByScope = jest.fn();

const POKEMON_PACK = createPack();
const ONE_PIECE_PACK = createPack({
  code: 'one_piece_25',
  name: 'One Piece Pack',
  category: 'One Piece',
  price: 25,
});

const renderHome = ({
  operations = [],
  usdcAmount = '100',
  params,
}: {
  operations?: CollectiblesPackOperation[];
  usdcAmount?: string;
  params?: CollectiblesHomeParams;
} = {}) =>
  renderScreenWithQueryClient(CollectiblesHome, {
    name: Routes.COLLECTIBLES.HOME,
    params,
    state: createTestState({ operations, usdcAmount }),
  });

// Compile-time environment checks stay isolated here; screen behavior lives in
// CollectiblesHome.view.test.tsx and CollectiblesFunding.view.test.tsx.
describe('CollectiblesHome', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(isCollectiblesDevEnabled).mockReturnValue(false);
    jest
      .mocked(selectSelectedInternalAccountByScope)
      .mockReturnValue(mockAccountByScope);
    mockAccountByScope.mockReturnValue(MOCK_INTERNAL_ACCOUNT);
    packPartnerReads.getPacks.mockResolvedValue([POKEMON_PACK, ONE_PIECE_PACK]);
  });

  it('omits the legacy balance and funding controls from discovery', async () => {
    renderHome();
    await screen.findByTestId('collectibles-popular-carousel');
    expect(
      screen.queryByTestId(CollectiblesHomeTestIds.BALANCE),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByTestId(CollectiblesHomeTestIds.FUND_BUTTON),
    ).not.toBeOnTheScreen();
    expect(controller.generatePack).not.toHaveBeenCalled();
  });

  it('returns to the wallet from the Back control', async () => {
    renderHome({ params: { initialTab: 'packs' } });
    await screen.findByTestId(CollectiblesPacksTestIds.LIST);

    fireEvent.press(screen.getByTestId(CollectiblesHomeTestIds.BACK_BUTTON));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(controller.generatePack).not.toHaveBeenCalled();
  });

  it('resets onboarding from the devnet Dev tab', async () => {
    jest.mocked(isCollectiblesDevEnabled).mockReturnValue(true);
    renderHome({ params: { initialTab: 'dev' } });
    fireEvent.press(
      screen.getByTestId(CollectiblesDevTestIds.RESET_ONBOARDING),
    );

    expect(controller.resetOnboarding).toHaveBeenCalledTimes(1);
    expect(controller.generatePack).not.toHaveBeenCalled();
  });

  it('hides Dev and rejects direct tab navigation on mainnet', async () => {
    renderHome({ params: { initialTab: 'dev' } });

    await screen.findByTestId(CollectiblesPacksTestIds.LIST);

    expect(
      screen.queryByTestId(CollectiblesHomeTestIds.DEV_TAB),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByTestId(CollectiblesDevTestIds.CONTAINER),
    ).not.toBeOnTheScreen();
  });
});
