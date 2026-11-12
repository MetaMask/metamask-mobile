import React from 'react';
import { act, renderHook } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createDeferredPromise } from '@metamask/utils';
import Engine from '../../../../core/Engine';
import { usePackPartnerAccount } from '../providers/pack-partner/hooks/usePackPartnerAccount';
import { collectiblesDataScope } from '../services/data/queryKeys';
import { useCollectiblesFollow } from './useCollectiblesSocialCommands';

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: { CollectiblesSocialApiDataService: { setFollow: jest.fn() } },
  },
}));
jest.mock('../providers/pack-partner/hooks/usePackPartnerAccount', () => ({
  usePackPartnerAccount: jest.fn(),
}));
jest.mock('./useCollectiblesPresentation', () => ({
  useCollectiblesPresentation: () => ({ online: true }),
}));

const account = jest.mocked(usePackPartnerAccount);
const write = jest.mocked(
  Engine.context.CollectiblesSocialApiDataService.setFollow,
);
const resultProfile = { profileId: 'sam', isFollowing: true } as Awaited<
  ReturnType<typeof write>
>;

/** Narrow mutation lifetime contract: an old account/target cannot acknowledge a new command. */
describe('Social command identity', () => {
  const clients: QueryClient[] = [];
  beforeEach(() => {
    account.mockReturnValue({ address: 'alice', id: 'alice' });
    write.mockReset();
  });
  afterEach(() => clients.splice(0).forEach((client) => client.clear()));
  const setup = () => {
    const client = new QueryClient();
    clients.push(client);
    return renderHook(({ profileId }) => useCollectiblesFollow(profileId), {
      initialProps: { profileId: 'sam' },
      wrapper: ({ children }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    });
  };

  it('rejects a second account command while pending and suppresses the old completion', async () => {
    const pending = createDeferredPromise<Awaited<ReturnType<typeof write>>>();
    write.mockReturnValueOnce(pending.promise).mockResolvedValue(resultProfile);
    const hook = setup();
    let first!: Promise<unknown>;
    await act(async () => {
      first = hook.result.current
        .mutateAsync(true)
        .catch((error: unknown) => error);
    });
    account.mockReturnValue({ address: 'bob', id: 'bob' });
    hook.rerender({ profileId: 'sam' });

    await act(async () => {
      await expect(hook.result.current.mutateAsync(true)).rejects.toMatchObject(
        { message: 'A Social command is already pending.' },
      );
      pending.resolve(resultProfile);
      await expect(first).resolves.toMatchObject({
        message: 'The Social command view has changed.',
      });
    });

    expect(write).toHaveBeenCalledTimes(1);
    await act(async () => {
      await hook.result.current.mutateAsync(true);
    });
    expect(write).toHaveBeenLastCalledWith(
      collectiblesDataScope({ address: 'bob' }),
      { profileId: 'sam', following: true },
    );
  });

  it('does not treat a pending follow for one profile as a successful follow of another profile', async () => {
    const pending = createDeferredPromise<Awaited<ReturnType<typeof write>>>();
    write.mockReturnValueOnce(pending.promise);
    const hook = setup();
    let first!: Promise<unknown>;
    await act(async () => {
      first = hook.result.current
        .mutateAsync(true)
        .catch((error: unknown) => error);
    });
    hook.rerender({ profileId: 'maya' });

    await act(async () => {
      await expect(hook.result.current.mutateAsync(true)).rejects.toMatchObject(
        { message: 'A Social command is already pending.' },
      );
      pending.resolve(resultProfile);
      await expect(first).resolves.toMatchObject({
        message: 'The Social command view has changed.',
      });
    });

    expect(write).toHaveBeenCalledTimes(1);
    expect(write).toHaveBeenCalledWith(
      collectiblesDataScope({ address: 'alice' }),
      { profileId: 'sam', following: true },
    );
  });

  it('does not invoke a completion action after its view unmounts', async () => {
    const pending = createDeferredPromise<Awaited<ReturnType<typeof write>>>();
    write.mockReturnValueOnce(pending.promise);
    const hook = setup();
    const acknowledge = jest.fn();
    let first!: Promise<unknown>;
    await act(async () => {
      first = hook.result.current
        .mutateAsync(true)
        .then(acknowledge)
        .catch((error: unknown) => error);
    });
    hook.unmount();

    pending.resolve(resultProfile);
    await expect(first).resolves.toMatchObject({
      message: 'The Social command view has changed.',
    });

    expect(acknowledge).not.toHaveBeenCalled();
    expect(write).toHaveBeenCalledTimes(1);
  });
});
