import {
  MOCK_ANY_NAMESPACE,
  Messenger,
  type MessengerActions,
  type MessengerEvents,
  type MockAnyNamespace,
} from '@metamask/messenger';

import { PolymarketProvider } from '../providers/polymarket/PolymarketProvider';
import type { PredictActivity } from '../types';
import {
  PredictController,
  type PredictControllerMessenger,
} from './PredictController';

jest.mock('../providers/polymarket/PolymarketProvider');

type AllPredictControllerMessengerActions =
  MessengerActions<PredictControllerMessenger>;

type AllPredictControllerMessengerEvents =
  MessengerEvents<PredictControllerMessenger>;

type RootMessenger = Messenger<
  MockAnyNamespace,
  AllPredictControllerMessengerActions,
  AllPredictControllerMessengerEvents
>;

function getRootMessenger(): RootMessenger {
  return new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });
}

describe('PredictController.getActivity', () => {
  const mockPolymarketProvider = {
    getActivity: jest.fn<Promise<PredictActivity[]>, [{ address: string }]>(),
    isEligible: jest.fn().mockResolvedValue({ isEligible: false }),
  } as unknown as jest.Mocked<PolymarketProvider>;

  const createController = () => {
    const rootMessenger = getRootMessenger();

    rootMessenger.registerActionHandler(
      'AccountsController:getSelectedAccount',
      jest.fn().mockReturnValue({
        id: 'mock-account-id',
        address: '0xselected',
        metadata: { name: 'Test Account' },
      }),
    );

    rootMessenger.registerActionHandler(
      'AccountTreeController:getAccountsFromSelectedAccountGroup',
      jest.fn().mockReturnValue([
        {
          id: 'mock-account-id',
          address: '0xselected',
          type: 'eip155:eoa',
          metadata: {},
        },
      ]),
    );

    const messenger = new Messenger<
      'PredictController',
      AllPredictControllerMessengerActions,
      AllPredictControllerMessengerEvents,
      RootMessenger
    >({
      namespace: 'PredictController',
      parent: rootMessenger,
    });

    rootMessenger.delegate({
      actions: [
        'AccountsController:getSelectedAccount',
        'AccountTreeController:getAccountsFromSelectedAccountGroup',
      ],
      events: ['TransactionController:transactionStatusUpdated'],
      messenger,
    });

    return new PredictController({ messenger });
  };

  beforeEach(() => {
    jest.clearAllMocks();

    (
      PolymarketProvider as unknown as jest.MockedClass<
        typeof PolymarketProvider
      >
    ).mockImplementation(() => mockPolymarketProvider);
  });

  it('fetches activity from provider with selected address', async () => {
    const stubActivity: PredictActivity[] = [
      {
        id: 'a1',
        providerId: 'stub',
        entry: { type: 'claimWinnings', timestamp: 1, amount: 10 },
      },
    ];
    mockPolymarketProvider.getActivity.mockResolvedValue(stubActivity);
    const controller = createController();

    const result = await controller.getActivity({});

    expect(mockPolymarketProvider.getActivity).toHaveBeenCalledWith({
      address: '0xselected',
    });
    expect(result).toEqual(stubActivity);
  });

  it('fetches activity with explicit address', async () => {
    const stubActivity: PredictActivity[] = [
      {
        id: 'a',
        providerId: 'stub',
        entry: { type: 'claimWinnings', timestamp: 2, amount: 2 },
      },
    ];
    mockPolymarketProvider.getActivity.mockResolvedValue(stubActivity);
    const controller = createController();

    const result = await controller.getActivity({ address: '0xcustom' });

    expect(mockPolymarketProvider.getActivity).toHaveBeenCalledWith({
      address: '0xcustom',
    });
    expect(result).toEqual(stubActivity);
  });
});
