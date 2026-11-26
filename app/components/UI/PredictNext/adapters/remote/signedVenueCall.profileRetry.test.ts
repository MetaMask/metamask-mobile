import {
  TEST_VENUE_PROFILE_RAW,
  TEST_VENUE_REVOKED_RAW,
} from '../../../../../../tests/fixtures/predict/venueProfiles';
import { TemplateError } from '../../auth/signing/profileTemplates';
import type { RemoteVenueProfileClient } from '../../auth/RemoteVenueProfileClient';
import { VenueProfileStore } from '../../auth/venueProfileStore';
import {
  setVenueProfileResolverForTesting,
  VENUE_PROFILE_ACQUISITION_TIMEOUT_MS,
  VENUE_PROFILE_ID,
  VenueProfileResolver,
} from '../../auth/venueSigningProfiles';
import {
  sendSigned,
  sendSignedRead,
  VenueProfilePreviewExpiredError,
  type SignedAttempt,
} from './signedVenueCall';

jest.mock('../../../../../util/Logger', () => ({
  __esModule: true,
  default: { log: jest.fn(), error: jest.fn() },
}));

const HEADER = { name: 'Venue-Authorization', value: 'envelope' };
const SIGNED = { header: HEADER, body: '', idempotencyKey: 'op-key' };
const UPDATED_RAW = JSON.stringify({
  ...JSON.parse(TEST_VENUE_PROFILE_RAW),
  version: 2,
});

const build = () => {
  let stored: string | null = null;
  const store = new VenueProfileStore({
    environment: 'dev',
    profileId: VENUE_PROFILE_ID,
    storage: {
      getItem: async () => stored,
      setItem: async (_key, value) => { stored = value; },
      removeItem: async () => { stored = null; },
    },
  });
  const getSigningProfile = jest.fn(async () => ({
    id: VENUE_PROFILE_ID,
    version: 1,
  }));
  const client = {
    fetchRevoked: jest.fn(async () => ({
      status: 'modified' as const,
      raw: TEST_VENUE_REVOKED_RAW,
    })),
    fetchProfile: jest.fn(async ({ version }: { version: number }) =>
      version === 1 ? TEST_VENUE_PROFILE_RAW : UPDATED_RAW,
    ),
  };
  const resolver = new VenueProfileResolver({
    store,
    getSigningProfile,
    client: client as unknown as RemoteVenueProfileClient,
    log: jest.fn(),
  });
  setVenueProfileResolverForTesting(resolver);
  const refresh = jest.spyOn(resolver, 'refreshAfterRefusal');
  return { resolver, refresh, getSigningProfile, client, store };
};

describe('profile refetch retry', () => {
  afterEach(() => {
    setVenueProfileResolverForTesting(undefined);
  });

  it.each([false, true])('does not re-sign an unchanged snapshot, pinned=%s', async (pinned) => {
    const { resolver, refresh, store } = build();
    const profile = await resolver.ensure();
    const sign = jest.fn().mockResolvedValue(SIGNED);
    const response = { status: 409, code: 'venue_profile_update_required' };
    const send = jest.fn().mockResolvedValue(response);

    await expect(sendSigned(
      { signOperation: sign, invalidateSigningSession: jest.fn() },
      'order.place',
      pinned ? { confirmed: true, profile } : undefined,
      send,
      (reply: SignedAttempt) => reply,
    )).resolves.toBe(response);

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(sign).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledTimes(1);
    expect((await store.load())?.floor).toBe(0);
  });

  it('requires another review when the pinned snapshot changes', async () => {
    const { resolver, refresh, getSigningProfile, store } = build();
    const profile = await resolver.ensure();
    getSigningProfile.mockResolvedValue({ id: VENUE_PROFILE_ID, version: 2 });
    const sign = jest.fn().mockResolvedValue(SIGNED);
    const send = jest.fn().mockResolvedValue({
      status: 409,
      code: 'venue_profile_update_required',
    });

    await expect(sendSigned(
      { signOperation: sign, invalidateSigningSession: jest.fn() },
      'order.place',
      { confirmed: true, profile },
      send,
      (reply: SignedAttempt) => reply,
    )).rejects.toBeInstanceOf(VenueProfilePreviewExpiredError);

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(sign).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledTimes(1);
    expect((await store.load())?.floor).toBe(0);
  });

  it('retries an unpinned mutation only when its snapshot changes', async () => {
    const { resolver, getSigningProfile, store } = build();
    await resolver.ensure();
    getSigningProfile.mockResolvedValue({ id: VENUE_PROFILE_ID, version: 2 });
    const sign = jest.fn().mockResolvedValue(SIGNED);
    const send = jest.fn()
      .mockResolvedValueOnce({ status: 409, code: 'venue_profile_update_required' })
      .mockResolvedValueOnce({ status: 200 });

    await expect(sendSigned(
      { signOperation: sign, invalidateSigningSession: jest.fn() },
      'account.activate', undefined, send, (reply: SignedAttempt) => reply,
    )).resolves.toEqual({ status: 200 });
    expect(sign).toHaveBeenCalledTimes(2);
    expect(send).toHaveBeenCalledTimes(2);
    expect((await store.load())?.floor).toBe(2);
  });

  it('retries not_ready once when refresh admits a snapshot', async () => {
    const { refresh } = build();
    const sign = jest.fn().mockResolvedValue(SIGNED);
    const response = { status: 503, code: 'venue_profile_not_ready' };
    const send = jest.fn().mockResolvedValue(response);

    await expect(sendSigned(
      { signOperation: sign, invalidateSigningSession: jest.fn() },
      'order.place', undefined, send, (reply: SignedAttempt) => reply,
    )).resolves.toBe(response);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(sign).toHaveBeenCalledTimes(2);
    expect(send).toHaveBeenCalledTimes(2);
  });

  it('does not retry not_ready when no snapshot is admitted', async () => {
    const { client } = build();
    client.fetchProfile.mockRejectedValue(new Error('unpublished'));
    const sign = jest.fn().mockResolvedValue(SIGNED);
    const response = { status: 503, code: 'venue_profile_not_ready' };
    const send = jest.fn().mockResolvedValue(response);

    await expect(sendSigned(
      { signOperation: sign, invalidateSigningSession: jest.fn() },
      'order.place', undefined, send, (reply: SignedAttempt) => reply,
    )).resolves.toBe(response);
    expect(sign).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('keeps the original response when the real resolver reaches its deadline', async () => {
    jest.useFakeTimers();
    try {
      const { resolver, getSigningProfile } = build();
      await resolver.ensure();
      getSigningProfile.mockImplementation(async () =>
        new Promise<{ id: string; version: number }>(() => undefined),
      );
      const sign = jest.fn().mockResolvedValue(SIGNED);
      const response = { status: 409, code: 'venue_profile_update_required' };
      const send = jest.fn().mockResolvedValue(response);
      const pending = sendSigned(
        { signOperation: sign, invalidateSigningSession: jest.fn() },
        'order.place', undefined, send, (reply: SignedAttempt) => reply,
      );
      await jest.advanceTimersByTimeAsync(VENUE_PROFILE_ACQUISITION_TIMEOUT_MS + 1);
      await expect(pending).resolves.toBe(response);
      expect(sign).toHaveBeenCalledTimes(1);
      expect(send).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });

  it('raises and persists the floor only after a successful mutation, across reloads', async () => {
    const { resolver, store, getSigningProfile, client } = build();
    getSigningProfile.mockResolvedValue({ id: VENUE_PROFILE_ID, version: 2 });
    const profile = await resolver.ensure();
    expect((await store.load())?.floor).toBe(0);
    await sendSigned(
      { signOperation: jest.fn().mockResolvedValue(SIGNED), invalidateSigningSession: jest.fn() },
      'order.place', { confirmed: true, profile },
      async () => ({ status: 200 }), (reply) => reply,
    );
    expect((await store.load())?.floor).toBe(2);
    getSigningProfile.mockResolvedValue({ id: VENUE_PROFILE_ID, version: 1 });
    const reloaded = new VenueProfileResolver({
      store,
      getSigningProfile,
      client: client as unknown as RemoteVenueProfileClient,
      log: jest.fn(),
    });
    await reloaded.refresh();
    await expect(reloaded.resolve()).resolves.toMatchObject({ version: 2 });
    expect((await store.load())?.floor).toBe(2);
  });

  it('does not confirm a profile on an ordinary mutation failure', async () => {
    const { resolver, store } = build();
    await resolver.ensure();
    await sendSigned(
      { signOperation: jest.fn().mockResolvedValue(SIGNED), invalidateSigningSession: jest.fn() },
      'order.place', undefined,
      async () => ({ status: 502, code: 'venue_auth_rejected' }), (reply) => reply,
    );
    expect((await store.load())?.floor).toBe(0);
  });

  it('only treats the contract status of each profile code as stale', async () => {
    const { refresh } = build();
    const response = { status: 409, code: 'venue_profile_not_ready' };
    const sign = jest.fn().mockResolvedValue(SIGNED);
    await expect(sendSigned(
      { signOperation: sign, invalidateSigningSession: jest.fn() },
      'order.place', undefined, async () => response, (reply) => reply,
    )).resolves.toBe(response);
    expect(refresh).not.toHaveBeenCalled();
    expect(sign).toHaveBeenCalledTimes(1);
  });

  it('refreshes once when signing had no admitted profile', async () => {
    const { refresh } = build();
    const sign = jest.fn().mockResolvedValueOnce(undefined).mockResolvedValueOnce(SIGNED);
    await expect(sendSigned(
      { signOperation: sign, invalidateSigningSession: jest.fn() },
      'order.place', undefined, async () => ({ status: 200 }), (reply) => reply,
    )).resolves.toEqual({ status: 200 });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(sign).toHaveBeenCalledTimes(2);
  });

  it.each(['mutation', 'read'])('normalizes a %s refusal after acquiring a missing profile', async (kind) => {
    const { refresh } = build();
    const sign = jest.fn().mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new TemplateError('input'));
    const request = { method: 'GET', path: '/trade-api/v2/portfolio/balance', query: '' };
    const send = jest.fn().mockResolvedValue({ status: 200, signRequired: { request } });
    const pending = kind === 'mutation'
      ? sendSigned(
          { signOperation: sign, invalidateSigningSession: jest.fn() },
          'order.place', undefined, send, (reply: SignedAttempt) => reply,
        )
      : sendSignedRead(
          { signRead: sign, invalidateSigningSession: jest.fn() },
          send, (reply: SignedAttempt) => reply,
        );
    await expect(pending).rejects.toMatchObject({
      name: 'VenueSigningRefusedError', rule: 'input', requestSent: kind === 'read',
    });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(sign).toHaveBeenCalledTimes(2);
    expect(send).toHaveBeenCalledTimes(kind === 'read' ? 1 : 0);
  });

  it('propagates a transport failure from the second mutation send', async () => {
    build();
    const failure = new Error('network disconnected');
    const send = jest.fn()
      .mockResolvedValueOnce({ status: 503, code: 'venue_profile_not_ready' })
      .mockRejectedValueOnce(failure);
    const sign = jest.fn().mockResolvedValue(SIGNED);
    await expect(sendSigned(
      { signOperation: sign, invalidateSigningSession: jest.fn() },
      'order.place', undefined, send, (reply: SignedAttempt) => reply,
    )).rejects.toBe(failure);
    expect(send).toHaveBeenCalledTimes(2);
    expect(sign).toHaveBeenCalledTimes(2);
  });

  it('does not spend a second signature when a profile is already admitted', async () => {
    const { resolver, refresh } = build();
    await resolver.ensure();
    const sign = jest.fn().mockResolvedValue(undefined);
    await expect(sendSigned(
      { signOperation: sign, invalidateSigningSession: jest.fn() },
      'order.place', undefined, async () => ({ status: 200 }), (reply) => reply,
    )).rejects.toMatchObject({ name: 'VenueSigningUnavailableError' });
    expect(refresh).not.toHaveBeenCalled();
    expect(sign).toHaveBeenCalledTimes(1);
  });

  it('keeps the signed-read profile retry behavior', async () => {
    const { refresh, store } = build();
    const request = { method: 'GET', path: '/trade-api/v2/portfolio/balance', query: '' };
    const send = jest.fn()
      .mockResolvedValueOnce({ status: 200, signRequired: { request } })
      .mockResolvedValueOnce({ status: 503, code: 'venue_profile_not_ready' })
      .mockResolvedValueOnce({ status: 200 });
    await expect(sendSignedRead(
      { signRead: jest.fn().mockResolvedValue(HEADER), invalidateSigningSession: jest.fn() },
      send, (reply: SignedAttempt) => reply,
    )).resolves.toEqual({ status: 200 });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect((await store.load())?.floor).toBe(0);
  });

  it('propagates a transport failure from the retried bearer read', async () => {
    build();
    const failure = new Error('network disconnected');
    const send = jest.fn()
      .mockResolvedValueOnce({ status: 503, code: 'venue_profile_not_ready' })
      .mockRejectedValueOnce(failure);
    await expect(sendSignedRead(
      { signRead: jest.fn(), invalidateSigningSession: jest.fn() },
      send, (reply: SignedAttempt) => reply,
    )).rejects.toBe(failure);
    expect(send).toHaveBeenCalledTimes(2);
  });
});
