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

  it('reports unavailable when the subscription fails', async () => {
    service.setActive.mockRejectedValueOnce(new Error('socket down'));
    const onStatus = jest.fn();

    acquireSocialRealtime('all', onStatus);

    await waitFor(() => expect(onStatus).toHaveBeenCalledWith('unavailable'));
  });
});
