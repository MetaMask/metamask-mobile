import Engine from '../../../../core/Engine';
import {
  acquireSocialRealtime,
  resetSocialRealtimeLeases,
} from './socialRealtimeLease';

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: { context: {} },
}));

const mockContext = Engine.context as unknown as Record<string, unknown>;

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const createService = () => ({
  setScopes: jest.fn().mockResolvedValue(undefined),
  setActive: jest.fn().mockResolvedValue(undefined),
});

describe('acquireSocialRealtime', () => {
  let service: ReturnType<typeof createService>;

  beforeEach(() => {
    resetSocialRealtimeLeases();
    service = createService();
    mockContext.SocialRealtimeService = service;
  });

  it('subscribes to the leased scope and reports live', async () => {
    const onStatus = jest.fn();

    acquireSocialRealtime('all', onStatus);
    await flush();

    expect(service.setScopes).toHaveBeenCalledWith(['all']);
    expect(service.setActive).toHaveBeenLastCalledWith(true);
    expect(onStatus).toHaveBeenCalledWith('live');
  });

  it('subscribes to the union of scopes held by every lease', async () => {
    acquireSocialRealtime('trending');
    acquireSocialRealtime('all');
    await flush();

    expect(service.setScopes).toHaveBeenLastCalledWith(['trending', 'all']);
  });

  it('stays active until the last lease on a scope is released', async () => {
    const releaseFirst = acquireSocialRealtime('all');
    const releaseSecond = acquireSocialRealtime('all');
    await flush();

    releaseFirst();
    await flush();
    expect(service.setActive).not.toHaveBeenCalledWith(false);

    releaseSecond();
    await flush();
    expect(service.setActive).toHaveBeenLastCalledWith(false);
  });

  it('keeps the new holder subscribed when the old one releases after it acquires', async () => {
    const releaseFeed = acquireSocialRealtime('trending');
    await flush();

    acquireSocialRealtime('all');
    releaseFeed();
    await flush();

    expect(service.setScopes).toHaveBeenLastCalledWith(['all']);
    expect(service.setActive).toHaveBeenLastCalledWith(true);
  });

  it('ignores a second release of the same lease', async () => {
    const release = acquireSocialRealtime('all');
    acquireSocialRealtime('all');
    await flush();

    release();
    release();
    await flush();

    expect(service.setActive).not.toHaveBeenCalledWith(false);
  });

  it('reports unavailable when the subscription fails', async () => {
    service.setActive.mockRejectedValueOnce(new Error('socket down'));
    const onStatus = jest.fn();

    acquireSocialRealtime('all', onStatus);
    await flush();

    expect(onStatus).toHaveBeenCalledWith('unavailable');
  });

  it('reports unavailable without a realtime service', () => {
    delete mockContext.SocialRealtimeService;
    const onStatus = jest.fn();

    const release = acquireSocialRealtime('all', onStatus);
    release();

    expect(onStatus).toHaveBeenCalledWith('unavailable');
  });

  it('does not report status after the lease is released', async () => {
    const onStatus = jest.fn();

    const release = acquireSocialRealtime('all', onStatus);
    release();
    await flush();

    expect(onStatus).not.toHaveBeenCalled();
  });
});
