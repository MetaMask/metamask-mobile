import Engine from '../../../../core/Engine';
import { resolveGeoCountry } from './resolveGeoCountry';

const mockGetGeoCountry = jest.fn();
const mockKycState: { geoCountry: string | null } = { geoCountry: null };

jest.mock('../../../../core/Engine', () => ({
  context: {
    KycController: {
      get state() {
        return mockKycState;
      },
    },
    KycService: {
      getGeoCountry: (...args: unknown[]) => mockGetGeoCountry(...args),
    },
  },
}));

interface MutableContext {
  KycController?: unknown;
  KycService?: unknown;
}

describe('resolveGeoCountry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockKycState.geoCountry = null;
    mockGetGeoCountry.mockResolvedValue('BRA');
  });

  it('returns the country stored on the KYC controller', async () => {
    mockKycState.geoCountry = 'ARG';

    await expect(resolveGeoCountry()).resolves.toBe('ARG');
  });

  it('skips the detection request when a country is stored', async () => {
    mockKycState.geoCountry = 'ARG';

    await resolveGeoCountry();

    expect(mockGetGeoCountry).not.toHaveBeenCalled();
  });

  it('falls back to the detected country when none is stored', async () => {
    await expect(resolveGeoCountry()).resolves.toBe('BRA');
  });

  it('falls back to the detected country when the controller is absent', async () => {
    const context = Engine.context as MutableContext;
    const originalController = context.KycController;
    context.KycController = undefined;

    try {
      await expect(resolveGeoCountry()).resolves.toBe('BRA');
    } finally {
      context.KycController = originalController;
    }
  });

  it('rejects when no country is stored and the KYC service is unavailable', async () => {
    const context = Engine.context as MutableContext;
    const originalService = context.KycService;
    context.KycService = undefined;

    try {
      await expect(resolveGeoCountry()).rejects.toThrow(
        'KYC service is unavailable',
      );
    } finally {
      context.KycService = originalService;
    }
  });

  it('propagates a detection failure', async () => {
    mockGetGeoCountry.mockRejectedValue(new Error('geo failed'));

    await expect(resolveGeoCountry()).rejects.toThrow('geo failed');
  });
});
