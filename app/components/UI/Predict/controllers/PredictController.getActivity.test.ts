import { PredictController } from './PredictController';

// Mock Engine AccountsController for selected address
jest.mock('../../../../core/Engine', () => ({
  context: {
    AccountsController: {
      getSelectedAccount: jest.fn(() => ({ address: '0xselected' })),
    },
  },
}));

interface ActivityEntry {
  id: string;
  providerId: string;
  entry: { type: string; timestamp: number; amount: number };
}

interface Provider {
  getActivity: jest.Mock<
    Promise<ActivityEntry[]>,
    [params?: { address: string }]
  >;
}

describe('PredictController.getActivity', () => {
  const makeController = (providers: Record<string, Provider>) => {
    const controller = Object.create(
      PredictController.prototype,
    ) as PredictController & {
      providers: Map<string, Provider>;
      update: jest.Mock;
    };
    controller.providers = new Map(Object.entries(providers));
    controller.update = jest.fn();
    return controller;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches activity from a specific provider and passes selected address', async () => {
    const stubProvider: Provider = {
      getActivity: jest.fn(
        async ({ address: _address }: { address: string }) => [
          {
            id: 'a1',
            providerId: 'stub',
            entry: { type: 'claimWinnings', timestamp: 1, amount: 10 },
          },
        ],
      ),
    };

    const controller = makeController({ stub: stubProvider });

    const getActivity = PredictController.prototype.getActivity as unknown as (
      this: PredictController,
      params: { providerId?: string },
    ) => Promise<ActivityEntry[]>;

    const result = await getActivity.call(controller, { providerId: 'stub' });

    expect(stubProvider.getActivity).toHaveBeenCalledWith({
      address: '0xselected',
    });
    expect(Array.isArray(result)).toBe(true);
    expect(result[0].id).toBe('a1');
  });

  it('merges activity from all providers when providerId is not specified', async () => {
    const providerA: Provider = {
      getActivity: jest.fn(async () => [
        {
          id: 'a',
          providerId: 'A',
          entry: { type: 'claimWinnings', timestamp: 1, amount: 1 },
        },
      ]),
    };
    const providerB: Provider = {
      getActivity: jest.fn(async () => [
        {
          id: 'b',
          providerId: 'B',
          entry: { type: 'claimWinnings', timestamp: 2, amount: 2 },
        },
      ]),
    };

    const controller = makeController({ A: providerA, B: providerB });

    const getActivity = PredictController.prototype.getActivity as unknown as (
      this: PredictController,
      params: { providerId?: string },
    ) => Promise<ActivityEntry[]>;
    const result = await getActivity.call(controller, {});

    expect(providerA.getActivity).toHaveBeenCalled();
    expect(providerB.getActivity).toHaveBeenCalled();
    expect(result.map((r) => r.id).sort()).toEqual(['a', 'b']);
  });

  it('throws when providerId is not available', async () => {
    const controller = makeController({});

    const getActivity = PredictController.prototype.getActivity as unknown as (
      this: PredictController,
      params: { providerId?: string },
    ) => Promise<ActivityEntry[]>;
    await expect(
      getActivity.call(controller, { providerId: 'missing' }),
    ).rejects.toThrow();
  });
});
