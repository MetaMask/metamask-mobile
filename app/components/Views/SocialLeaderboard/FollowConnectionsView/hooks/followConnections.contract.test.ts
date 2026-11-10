import { createUIQueryClient } from '@metamask/react-data-query';
import {
  Messenger,
  MOCK_ANY_NAMESPACE,
  type MessengerActions,
  type MessengerEvents,
  type MockAnyNamespace,
} from '@metamask/messenger';
import {
  SocialService,
  type SocialServiceMessenger,
} from '@metamask/social-controllers';
import type { QueryKey } from '@tanstack/react-query';
import type { Json } from '@metamask/utils';
import { buildFollowersQueryKey, MY_FOLLOWERS_QUERY_KEY } from './useFollowers';
import { buildTraderFollowingQueryKey } from './useTraderFollowing';

/**
 * Runs the exact query keys the follow hooks build through the same path the
 * app uses -- `createUIQueryClient` dispatching onto a messenger that the real
 * Core `SocialService` is registered on -- and pins the HTTP request each one
 * produces. Catches a key/option shape drifting from what Core accepts, which
 * the hook tests cannot see because they stub `useQuery`.
 */

const BASE_URL = 'https://social.test';
const V1_URL = `${BASE_URL}/api/v1`;

type RootMessenger = Messenger<
  MockAnyNamespace,
  MessengerActions<SocialServiceMessenger>,
  MessengerEvents<SocialServiceMessenger>
>;

const PROFILE = {
  profileId: 'profile-bob',
  address: '0x00000000000000000000000000000000000000b0',
  name: 'bob',
  imageUrl: null,
};

const jsonResponse = (body: Json) => ({
  ok: true,
  status: 200,
  json: async () => body,
});

const setup = () => {
  const root: RootMessenger = new Messenger({ namespace: MOCK_ANY_NAMESPACE });
  root.registerActionHandler(
    'AuthenticationController:getBearerToken',
    async () => 'token',
  );
  const serviceMessenger: SocialServiceMessenger = new Messenger({
    namespace: 'SocialService',
    parent: root,
  });
  root.delegate({
    messenger: serviceMessenger,
    actions: ['AuthenticationController:getBearerToken'],
  });
  new SocialService({ messenger: serviceMessenger, baseUrl: BASE_URL });

  const queryClient = createUIQueryClient(
    ['SocialService'],
    {
      call: async (method: string, ...params: Json[]) =>
        // @ts-expect-error The adapter erases the action/params pairing.
        (await root.call(method, ...params)) as Json,
      subscribe: () => undefined,
      unsubscribe: () => undefined,
    },
    { defaultOptions: { queries: { retry: false } } },
  );

  return { queryClient };
};

describe('follow connections contract with Core SocialService', () => {
  const mockFetch = jest.fn();
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = mockFetch;
    mockFetch.mockReset();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  const run = async (queryKey: QueryKey, body: Json) => {
    mockFetch.mockResolvedValueOnce(jsonResponse(body));
    const { queryClient } = setup();
    const data = await queryClient.query({ queryKey });
    const [url, init] = mockFetch.mock.calls[0];
    return { data, url: String(url), init };
  };

  it('loads the signed-in user followers from /users/me/followers', async () => {
    const { data, url, init } = await run(MY_FOLLOWERS_QUERY_KEY, {
      followers: [PROFILE],
      count: 1,
    });

    expect(url).toBe(`${V1_URL}/users/me/followers`);
    expect(init.headers).toStrictEqual({ Authorization: 'Bearer token' });
    expect(data).toStrictEqual({ followers: [PROFILE], count: 1 });
  });

  it('loads another trader followers from /traders/:id/followers', async () => {
    const { data, url } = await run(
      buildFollowersQueryKey({ addressOrId: '0xabc' }),
      { followers: [PROFILE], count: 42 },
    );

    expect(url).toBe(`${V1_URL}/traders/0xabc/followers`);
    expect(data).toStrictEqual({ followers: [PROFILE], count: 42 });
  });

  it('asks for mutuals only with ?mutuals=true', async () => {
    const { url } = await run(
      buildFollowersQueryKey({ addressOrId: '0xabc', mutuals: true }),
      { followers: [], count: 0 },
    );

    expect(url).toBe(`${V1_URL}/traders/0xabc/followers?mutuals=true`);
  });

  it('encodes a profile id used as the trader key', async () => {
    const { url } = await run(
      buildFollowersQueryKey({ addressOrId: 'profile/with space' }),
      { followers: [], count: 0 },
    );

    expect(url).toBe(`${V1_URL}/traders/profile%2Fwith%20space/followers`);
  });

  it('loads another trader following from /traders/:id/following', async () => {
    const { data, url } = await run(
      buildTraderFollowingQueryKey({ addressOrId: '0xabc' }),
      { following: [PROFILE], count: 3 },
    );

    expect(url).toBe(`${V1_URL}/traders/0xabc/following`);
    expect(data).toStrictEqual({ following: [PROFILE], count: 3 });
  });

  it('loads the signed-in user following from /users/me/following', async () => {
    const { data, url } = await run(['SocialService:fetchFollowing'], {
      following: [PROFILE],
      count: 1,
    });

    expect(url).toBe(`${V1_URL}/users/me/following`);
    expect(data).toStrictEqual({ following: [PROFILE], count: 1 });
  });

  it('rejects a followers payload that does not match the Core contract', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ followers: [PROFILE] }));
    const { queryClient } = setup();

    await expect(
      queryClient.query({
        queryKey: buildFollowersQueryKey({ addressOrId: '0xabc' }),
      }),
    ).rejects.toThrow();
  });
});
