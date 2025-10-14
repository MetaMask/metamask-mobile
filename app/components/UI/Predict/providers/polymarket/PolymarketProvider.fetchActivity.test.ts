import { PolymarketProvider } from './PolymarketProvider';
import { parsePolymarketActivity } from './utils';

jest.mock('./utils', () => ({
  ...jest.requireActual('./utils'),
  getPolymarketEndpoints: jest.fn(() => ({
    DATA_API_ENDPOINT: 'https://data-api.polymarket.com',
  })),
  parsePolymarketActivity: jest.fn((raw: unknown[]) => raw as unknown[]),
}));

describe('PolymarketProvider.fetchActivity', () => {
  const provider = new PolymarketProvider();

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it('throws when address is missing', async () => {
    await expect(provider.getActivity({ address: '' })).rejects.toThrow();
  });

  it('calls fetch with derived predictAddress and parses activity', async () => {
    const jsonData = [{ id: 'x1' }];
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => jsonData,
    });

    // Mock getAccountState used to derive predict address
    const spy = jest
      .spyOn(
        provider as unknown as {
          getAccountState: (p: {
            ownerAddress: string;
          }) => Promise<{
            address: string;
            isDeployed: boolean;
            hasAllowances: boolean;
            balance: number;
          }>;
        },
        'getAccountState',
      )
      .mockResolvedValue({
        address: '0xSAFE',
        isDeployed: true,
        hasAllowances: true,
        balance: 0,
      });

    const result = await provider.getActivity({ address: '0xuser' });

    expect(spy).toHaveBeenCalledWith({ ownerAddress: '0xuser' });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('user=0xSAFE'),
      expect.objectContaining({ method: 'GET' }),
    );
    expect(parsePolymarketActivity).toHaveBeenCalled();
    expect(Array.isArray(result)).toBe(true);
  });

  it('returns empty array on non-ok response', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: () => ({}),
    });
    const spy = jest
      .spyOn(
        provider as unknown as {
          getAccountState: (p: {
            ownerAddress: string;
          }) => Promise<{
            address: string;
            isDeployed: boolean;
            hasAllowances: boolean;
            balance: number;
          }>;
        },
        'getAccountState',
      )
      .mockResolvedValue({
        address: '0xSAFE',
        isDeployed: true,
        hasAllowances: true,
        balance: 0,
      });

    const result = await provider.getActivity({ address: '0xuser' });
    expect(spy).toHaveBeenCalled();
    expect(result).toEqual([]);
  });
});
