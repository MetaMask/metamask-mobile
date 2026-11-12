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
import CollectiblesReveal from './CollectiblesReveal';

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

// Native BackHandler listener contract stays unit-level; screen journeys use CV.
describe('CollectiblesReveal hardware back contract', () => {
  afterEach(() => jest.restoreAllMocks());
  it('consumes Android back while a purchase is pending', () => {
    jest
      .mocked(selectSelectedInternalAccountByScope)
      .mockReturnValue(() => MOCK_INTERNAL_ACCOUNT);
    jest
      .mocked(Engine.context.CollectiblesController.completePack)
      .mockReturnValue(new Promise(() => undefined));
    jest
      .mocked(Engine.context.AssetsController.getAssets)
      .mockResolvedValue({});
    const backListener = jest.spyOn(BackHandler, 'addEventListener');
    const { unmount } = renderScreenWithQueryClient(CollectiblesReveal, {
      name: Routes.COLLECTIBLES.REVEAL,
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
      Engine.context.CollectiblesController.dismissOperation,
    ).not.toHaveBeenCalled();
    unmount();
  });
});
