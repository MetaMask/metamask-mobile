import { act, waitFor } from '@testing-library/react-native';
import Engine from '../../../../../../core/Engine';
import { collectorCryptPacksKey } from '../queries/packs';
import { createCollectorCryptError } from '../services/errors';
import {
  createPack,
  createTestQueryClient,
  renderHookWithQueryClient,
} from '../../../views/testUtils';
import { useCollectorCryptPacks } from './useCollectorCryptPacks';

jest.mock('../../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: { GachaController: { getPacks: jest.fn() } },
  },
}));

const controller = jest.mocked(Engine.context.GachaController);
const PACK = createPack();

describe('useCollectorCryptPacks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the open packs from the controller', async () => {
    controller.getPacks.mockResolvedValue([PACK]);

    const { result } = renderHookWithQueryClient(() =>
      useCollectorCryptPacks(),
    );

    await waitFor(() => expect(result.current.packs).toStrictEqual([PACK]));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeUndefined();
  });

  it('reports loading on the first fetch', async () => {
    controller.getPacks.mockReturnValue(new Promise(() => undefined));

    const { result } = renderHookWithQueryClient(() =>
      useCollectorCryptPacks(),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(true));
    expect(result.current.packs).toStrictEqual([]);
  });

  it('maps a failure to an error state', async () => {
    controller.getPacks.mockRejectedValue(
      createCollectorCryptError({ code: 'RATE_LIMITED', retryable: true }),
    );

    const { result } = renderHookWithQueryClient(() =>
      useCollectorCryptPacks(),
    );

    await waitFor(() =>
      expect(result.current.error?.code).toBe('RATE_LIMITED'),
    );
    expect(result.current.isLoading).toBe(false);
  });

  it('hides a refetch error while cached packs exist', async () => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(collectorCryptPacksKey, [PACK]);
    controller.getPacks.mockRejectedValue(new TypeError('Network failed'));
    const { result } = renderHookWithQueryClient(
      () => useCollectorCryptPacks(),
      { queryClient },
    );

    await act(async () => {
      await result.current.refetch();
    });

    expect(controller.getPacks).toHaveBeenCalled();
    expect(result.current.packs).toStrictEqual([PACK]);
    expect(result.current.error).toBeUndefined();
  });

  it('does not fetch when disabled', () => {
    const { result } = renderHookWithQueryClient(() =>
      useCollectorCryptPacks({ enabled: false }),
    );

    expect(controller.getPacks).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
  });
});
