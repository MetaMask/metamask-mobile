import { BackHandler } from 'react-native';
import { act } from '@testing-library/react-native';
import Routes from '../../../../../constants/navigation/Routes';
import Engine from '../../../../../core/Engine';
import { selectSelectedInternalAccountByScope } from '../../../../../selectors/multichainAccounts/accounts';
import {
  MOCK_INTERNAL_ACCOUNT,
  createOperation,
  createTestState,
  renderScreenWithQueryClient,
} from '../testUtils';
import GachaReveal from './GachaReveal';

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

// Native BackHandler listener contract stays unit-level; screen journeys use CV.
describe('GachaReveal hardware back contract', () => {
  afterEach(() => jest.restoreAllMocks());
  it('consumes Android back while a purchase is pending', () => {
    jest
      .mocked(selectSelectedInternalAccountByScope)
      .mockReturnValue(() => MOCK_INTERNAL_ACCOUNT);
    jest
      .mocked(Engine.context.GachaController.completePack)
      .mockReturnValue(new Promise(() => undefined));
    jest
      .mocked(Engine.context.AssetsController.getAssets)
      .mockResolvedValue({});
    const backListener = jest.spyOn(BackHandler, 'addEventListener');
    const { unmount } = renderScreenWithQueryClient(GachaReveal, {
      name: Routes.GACHA.REVEAL,
      params: { memo: 'memo-1' },
      state: createTestState({ operations: [createOperation()] }),
    });
    const backHandlers = backListener.mock.calls
      .filter(([event]) => event === 'hardwareBackPress')
      .map(([, handler]) => handler)
      .reverse();

    act(() => {
      expect(
        backHandlers.some((handler) =>
          handler({ type: 'hardwareBackPress', timeStamp: 0 }),
        ),
      ).toBe(true);
    });

    expect(
      Engine.context.GachaController.dismissOperation,
    ).not.toHaveBeenCalled();
    unmount();
  });
});
