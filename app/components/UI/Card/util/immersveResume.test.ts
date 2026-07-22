import { resolveImmersveFundingSourceId } from './immersveResume';

const mockGetFundingSources = jest.fn();
const mockCreateFundingSource = jest.fn();
jest.mock('../../../../core/Engine', () => ({
  context: {
    CardController: {
      getFundingSources: (...args: unknown[]) => mockGetFundingSources(...args),
      createFundingSource: (...args: unknown[]) =>
        mockCreateFundingSource(...args),
    },
  },
}));

describe('resolveImmersveFundingSourceId', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetFundingSources.mockResolvedValue([]);
    mockCreateFundingSource.mockResolvedValue({ id: 'fs-new' });
  });

  it('returns the existing id without any network call', async () => {
    const id = await resolveImmersveFundingSourceId({
      fundingChannelId: 'base-channel',
      existingId: 'fs-existing',
    });

    expect(id).toBe('fs-existing');
    expect(mockGetFundingSources).not.toHaveBeenCalled();
    expect(mockCreateFundingSource).not.toHaveBeenCalled();
  });

  it('matches the configured funding channel over other networks', async () => {
    mockGetFundingSources.mockResolvedValue([
      { id: 'fs-arbitrum', fundingChannelId: 'arbitrum-channel' },
      { id: 'fs-base', fundingChannelId: 'base-channel' },
    ]);

    const id = await resolveImmersveFundingSourceId({
      fundingChannelId: 'base-channel',
    });

    expect(id).toBe('fs-base');
    expect(mockCreateFundingSource).not.toHaveBeenCalled();
  });

  it('creates a funding source when none matches the channel', async () => {
    mockGetFundingSources.mockResolvedValue([
      { id: 'fs-arbitrum', fundingChannelId: 'arbitrum-channel' },
    ]);

    const id = await resolveImmersveFundingSourceId({
      fundingChannelId: 'base-channel',
    });

    expect(id).toBe('fs-new');
    expect(mockCreateFundingSource).toHaveBeenCalled();
  });
});
