import { endTrace, trace, TraceName, TraceOperation } from '../trace';
import {
  getSocialHardwareTierTag,
  getSocialNetworkTierTag,
  measureSocialDataFetch,
} from './socialPerformance';

jest.mock('../trace', () => ({
  trace: jest.fn(),
  endTrace: jest.fn(),
  TraceName: {
    SocialTabDataFetch: 'Social Tab Data Fetch',
  },
  TraceOperation: {
    SocialDataFetch: 'social.data_fetch',
  },
}));

jest.mock('uuid', () => ({
  v4: () => 'social-fetch-trace-id',
}));

const mockTrace = jest.mocked(trace);
const mockEndTrace = jest.mocked(endTrace);

describe('socialPerformance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('maps unresolved device cohorts to unknown independently', () => {
    const hardwareTier = getSocialHardwareTierTag(null);
    const networkTier = getSocialNetworkTierTag(null);

    expect(hardwareTier).toBe('unknown');
    expect(networkTier).toBe('unknown');
  });

  it('ends a resolved data request with bounded success data', async () => {
    const request = jest.fn().mockResolvedValue({ items: [] });

    const result = await measureSocialDataFetch({
      tab: 'trending',
      cacheState: 'cold',
      request,
    });

    expect(result).toEqual({ items: [] });
    expect(mockTrace).toHaveBeenCalledWith({
      name: TraceName.SocialTabDataFetch,
      op: TraceOperation.SocialDataFetch,
      id: 'social-fetch-trace-id',
      tags: {
        feature: 'social_v1',
        tab: 'trending',
        cache_state: 'cold',
      },
    });
    expect(mockEndTrace).toHaveBeenCalledWith({
      name: TraceName.SocialTabDataFetch,
      id: 'social-fetch-trace-id',
      status: 'ok',
      data: { success: true },
    });
  });

  it('ends a rejected data request without attaching the raw error', async () => {
    const requestError = new Error('private upstream detail');
    const request = jest.fn().mockRejectedValue(requestError);

    await expect(
      measureSocialDataFetch({
        tab: 'leaderboard',
        cacheState: 'warm',
        request,
      }),
    ).rejects.toBe(requestError);

    expect(mockEndTrace).toHaveBeenCalledWith({
      name: TraceName.SocialTabDataFetch,
      id: 'social-fetch-trace-id',
      status: 'error',
      data: {
        success: false,
        content_state: 'error',
      },
    });
    expect(JSON.stringify(mockEndTrace.mock.calls)).not.toContain(
      'private upstream detail',
    );
  });
});
