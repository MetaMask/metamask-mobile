import Engine from '../../../../core/Engine';
import { waitFor } from '@testing-library/react-native';
import {
  acquireSocialRealtime,
  resetSocialRealtimeLeases,
} from './socialRealtimeLease';

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: { context: {} },
}));

const mockContext = Engine.context as unknown as Record<string, unknown>;

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

    await waitFor(() => {
      expect(service.setScopes).toHaveBeenCalledWith(['all']);
      expect(service.setActive).toHaveBeenLastCalledWith(true);
      expect(onStatus).toHaveBeenCalledWith('live');
    });
  });

  it('subscribes to the union of scopes held by every lease', async () => {
    acquireSocialRealtime('trending');
    acquireSocialRealtime('all');

    await waitFor(() =>
      expect(service.setScopes).toHaveBeenLastCalledWith(['trending', 'all']),
    );
  });

  it('stays active until the last lease on a scope is released', async () => {
    const releaseFirst = acquireSocialRealtime('all');
    const releaseSecond = acquireSocialRealtime('all');

    releaseFirst();
    await waitFor(() =>
      expect(service.setActive).not.toHaveBeenCalledWith(false),
    );

    releaseSecond();
    await waitFor(() =>
      expect(service.setActive).toHaveBeenLastCalledWith(false),
    );
  });

  it('sets unchanged scopes only once when a release and an acquire land together', async () => {
    const releaseTrending = acquireSocialRealtime('trending');
    await waitFor(() =>
      expect(service.setScopes).toHaveBeenCalledWith(['trending']),
    );
    service.setScopes.mockClear();

    releaseTrending();
    const onStatus = jest.fn();
    acquireSocialRealtime('all', onStatus);

    await waitFor(() => expect(onStatus).toHaveBeenCalledWith('live'));
    expect(service.setScopes).toHaveBeenCalledTimes(1);
    expect(service.setScopes).toHaveBeenCalledWith(['all']);
  });

  it('sets the scopes again after a failed update', async () => {
    service.setScopes.mockRejectedValueOnce(new Error('subscribe failed'));
    const releaseFirst = acquireSocialRealtime('all');
    await waitFor(() => expect(service.setScopes).toHaveBeenCalledTimes(1));

    releaseFirst();
    acquireSocialRealtime('all');

    await waitFor(() => expect(service.setScopes).toHaveBeenCalledTimes(2));
    expect(service.setScopes).toHaveBeenLastCalledWith(['all']);
  });

  it('reports unavailable when the subscription fails', async () => {
    service.setActive.mockRejectedValueOnce(new Error('socket down'));
    const onStatus = jest.fn();

    acquireSocialRealtime('all', onStatus);

    await waitFor(() => expect(onStatus).toHaveBeenCalledWith('unavailable'));
  });
});
