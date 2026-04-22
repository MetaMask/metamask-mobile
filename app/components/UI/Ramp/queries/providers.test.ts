import { rampsProvidersKeys, rampsProvidersOptions } from './providers';
import Engine from '../../../../core/Engine';

jest.mock('../../../../core/Engine', () => ({
  context: {
    RampsController: {
      getProviders: jest.fn().mockResolvedValue({ providers: [] }),
    },
  },
}));

describe('rampsProvidersOptions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a stable normalized query key', () => {
    expect(
      rampsProvidersKeys.detail({
        regionCode: 'US-TX ',
      }),
    ).toEqual(['ramps', 'providers', 'us-tx']);
  });

  it('builds query options for providers', () => {
    const opts = rampsProvidersOptions({
      regionCode: 'us-tx',
    });

    expect(opts.queryKey).toEqual(['ramps', 'providers', 'us-tx']);
    expect(typeof opts.queryFn).toBe('function');
    expect(opts.staleTime).toBe(1000 * 60 * 15);
  });

  it('queryFn calls getProviders with regionCode', async () => {
    const mockProviders = [{ id: 'provider-1', name: 'Provider 1' }];
    (
      Engine.context.RampsController.getProviders as jest.Mock
    ).mockResolvedValue({ providers: mockProviders });

    const opts = rampsProvidersOptions({ regionCode: 'us-tx' });
    if (!opts.queryFn) {
      throw new Error('Expected queryFn to be defined');
    }
    const result = await opts.queryFn({} as never);

    expect(Engine.context.RampsController.getProviders).toHaveBeenCalledWith(
      'us-tx',
    );
    expect(result).toEqual(mockProviders);
  });
});
