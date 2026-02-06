import { PredictController } from './PredictController';

interface ActivityEntry {
  id: string;
  providerId: string;
  entry: { type: string; timestamp: number; amount: number };
}

interface Provider {
  getActivity: jest.Mock<Promise<ActivityEntry[]>, [{ address: string }]>;
}

describe('PredictController.getActivity', () => {
  // Create a type-safe mock controller interface
  interface MockPredictController {
    providers: Map<string, Provider>;
    update: jest.Mock;
    getActivity: (params: {
      address?: string;
      providerId?: string;
    }) => Promise<ActivityEntry[]>;
  }

  const makeController = (
    providers: Record<string, Provider>,
  ): MockPredictController => {
    const controller = Object.create(
      PredictController.prototype,
    ) as MockPredictController;
    controller.providers = new Map(Object.entries(providers));
    controller.update = jest.fn();
    (
      controller as unknown as { getSigner: () => { address: string } }
    ).getSigner = jest.fn(() => ({
      address: '0xselected',
    }));
    return controller;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
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

    const result = await controller.getActivity({ providerId: 'stub' });

    expect(stubProvider.getActivity).toHaveBeenCalledWith({
      address: '0xselected',
    });
    expect(Array.isArray(result)).toBe(true);
    expect(result[0].id).toBe('a1');
  });

  it('merges activity from all providers when providerId is not specified', async () => {
    const providerA: Provider = {
      getActivity: jest.fn(
        async ({ address: _address }: { address: string }) => [
          {
            id: 'a',
            providerId: 'A',
            entry: { type: 'claimWinnings', timestamp: 1, amount: 1 },
          },
        ],
      ),
    };
    const providerB: Provider = {
      getActivity: jest.fn(
        async ({ address: _address }: { address: string }) => [
          {
            id: 'b',
            providerId: 'B',
            entry: { type: 'claimWinnings', timestamp: 2, amount: 2 },
          },
        ],
      ),
    };

    const controller = makeController({ A: providerA, B: providerB });

    const result = await controller.getActivity({});

    expect(providerA.getActivity).toHaveBeenCalled();
    expect(providerB.getActivity).toHaveBeenCalled();
    expect(result.map((r) => r.id).sort()).toEqual(['a', 'b']);
  });

  it('throws when providerId is not available', async () => {
    const controller = makeController({});

    await expect(
      controller.getActivity({ providerId: 'missing' }),
    ).rejects.toThrow();
  });
});
