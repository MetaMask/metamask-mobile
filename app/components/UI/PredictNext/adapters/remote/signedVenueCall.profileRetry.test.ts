import { TemplateError } from '../../auth/signing/profileTemplates';
import {
  refreshVenueProfileAfterRefusal,
  resolveVenueProfile,
} from '../../auth/venueSigningProfiles';
import {
  sendSigned,
  sendSignedRead,
  type SignedAttempt,
} from './signedVenueCall';

jest.mock('../../../../../util/Logger', () => ({
  __esModule: true,
  default: { log: jest.fn(), error: jest.fn() },
}));

// One refetch of the registry, then one retry of the same attempt.
jest.mock('../../auth/venueSigningProfiles', () => ({
  resolveVenueProfile: jest.fn().mockResolvedValue({}),
  refreshVenueProfileAfterRefusal: jest.fn().mockResolvedValue(undefined),
}));

const HEADER = { name: 'Venue-Authorization', value: 'envelope' };
const SIGNED = { header: HEADER, body: '', idempotencyKey: 'op-key' };

const refresh = jest.mocked(refreshVenueProfileAfterRefusal);
const resolve = jest.mocked(resolveVenueProfile);

describe('profile refetch retry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    refresh.mockResolvedValue(undefined);
    resolve.mockResolvedValue({} as never);
  });

  it('refetches once and retries the mutation after venue_profile_update_required', async () => {
    const replies = [
      { status: 409, code: 'venue_profile_update_required' },
      { status: 200 },
    ];
    const sign = jest.fn().mockResolvedValue(SIGNED);

    const result = await sendSigned(
      { signOperation: sign, invalidateSigningSession: jest.fn() },
      'order.place',
      undefined,
      async () => replies.shift() as (typeof replies)[number],
      (reply) => reply,
    );

    expect(result).toEqual({ status: 200 });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(sign).toHaveBeenCalledTimes(2);
  });

  it('does not loop when the retry is refused again', async () => {
    const reply = { status: 503, code: 'venue_profile_not_ready' };
    const replies = [reply, reply];

    const result = await sendSigned(
      {
        signOperation: jest.fn().mockResolvedValue(SIGNED),
        invalidateSigningSession: jest.fn(),
      },
      'order.place',
      undefined,
      async () => replies.shift() as (typeof replies)[number],
      (r) => r,
    );

    expect(result).toEqual(reply);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('returns the initial response when the profile refetch hangs', async () => {
    jest.useFakeTimers();
    try {
      refresh.mockImplementation(async () => new Promise(() => undefined));
      const sign = jest.fn().mockResolvedValue(SIGNED);
      const response = {
        status: 409,
        code: 'venue_profile_update_required',
        outcome: 'not_placed',
      };
      const send = jest.fn().mockResolvedValue(response);

      const pending = sendSigned(
        { signOperation: sign, invalidateSigningSession: jest.fn() },
        'order.place',
        undefined,
        send,
        (reply: SignedAttempt): SignedAttempt => reply,
      );
      await jest.advanceTimersByTimeAsync(10_000);

      await expect(pending).resolves.toBe(response);
      expect(send).toHaveBeenCalledTimes(1);
      expect(sign).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });

  it('only treats the contract status of each profile code as stale', async () => {
    // api-errors.v1.json: update_required is 409, not_ready is 503.
    const reply = { status: 409, code: 'venue_profile_not_ready' };
    const sign = jest.fn().mockResolvedValue(SIGNED);

    const result = await sendSigned(
      { signOperation: sign, invalidateSigningSession: jest.fn() },
      'order.place',
      undefined,
      async () => reply,
      (r) => r,
    );

    expect(result).toEqual(reply);
    expect(refresh).not.toHaveBeenCalled();
    expect(sign).toHaveBeenCalledTimes(1);
  });

  it('refreshes once when signing had no admitted profile', async () => {
    const sign = jest
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(SIGNED);
    resolve.mockResolvedValue(undefined);

    const result = await sendSigned(
      { signOperation: sign, invalidateSigningSession: jest.fn() },
      'order.place',
      undefined,
      async () => ({ status: 200 }),
      (reply) => reply,
    );

    expect(result).toEqual({ status: 200 });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(sign).toHaveBeenCalledTimes(2);
  });

  it('normalizes a mutation refusal after acquiring a missing profile', async () => {
    resolve.mockResolvedValue(undefined);
    const sign = jest
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new TemplateError('input'));
    const send = jest.fn();

    await expect(
      sendSigned(
        { signOperation: sign, invalidateSigningSession: jest.fn() },
        'order.place',
        undefined,
        send,
        (reply: SignedAttempt) => reply,
      ),
    ).rejects.toMatchObject({
      name: 'VenueSigningRefusedError',
      rule: 'input',
      requestSent: false,
    });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(sign).toHaveBeenCalledTimes(2);
    expect(send).not.toHaveBeenCalled();
  });

  it('normalizes a read refusal after acquiring a missing profile', async () => {
    resolve.mockResolvedValue(undefined);
    const signRead = jest
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new TemplateError('class'));
    const request = { method: 'GET', path: '/upstream/balance', query: '' };
    const response = { status: 200, signRequired: { request } };
    const send = jest.fn().mockResolvedValue(response);

    await expect(
      sendSignedRead(
        { signRead, invalidateSigningSession: jest.fn() },
        send,
        (reply: SignedAttempt) => reply,
      ),
    ).rejects.toMatchObject({
      name: 'VenueSigningRefusedError',
      rule: 'class',
      requestSent: true,
    });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(signRead).toHaveBeenCalledTimes(2);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('returns the profile refusal when the reviewed pin cannot be signed after refresh', async () => {
    const profile = { version: 1, sha256: 'reviewed-profile-hash' };
    const input = { confirmed: true, profile };
    const sign = jest
      .fn()
      .mockResolvedValueOnce(SIGNED)
      .mockRejectedValueOnce(new TemplateError('input'));
    const response = {
      status: 409,
      code: 'venue_profile_update_required',
      outcome: 'not_placed',
    };
    const send = jest.fn().mockResolvedValue(response);

    const result = await sendSigned(
      { signOperation: sign, invalidateSigningSession: jest.fn() },
      'order.place',
      input,
      send,
      (reply: SignedAttempt) => reply,
    );

    expect(result).toBe(response);
    expect(sign).toHaveBeenNthCalledWith(1, 'order.place', input);
    expect(sign).toHaveBeenNthCalledWith(2, 'order.place', {
      ...input,
      confirmed: false,
    });
    expect(send).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('returns the profile refusal when refresh fails before retrying', async () => {
    refresh.mockRejectedValueOnce(new Error('registry unavailable'));
    const sign = jest.fn().mockResolvedValue(SIGNED);
    const response = {
      status: 409,
      code: 'venue_profile_update_required',
      outcome: 'not_placed',
    };
    const send = jest.fn().mockResolvedValue(response);

    const result = await sendSigned(
      { signOperation: sign, invalidateSigningSession: jest.fn() },
      'order.place',
      undefined,
      send,
      (reply: SignedAttempt) => reply,
    );

    expect(result).toBe(response);
    expect(sign).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('propagates a transport failure from the second mutation send', async () => {
    const failure = new Error('network disconnected');
    const send = jest
      .fn()
      .mockResolvedValueOnce({
        status: 409,
        code: 'venue_profile_update_required',
        outcome: 'not_placed',
      })
      .mockRejectedValueOnce(failure);
    const sign = jest.fn().mockResolvedValue(SIGNED);

    await expect(
      sendSigned(
        { signOperation: sign, invalidateSigningSession: jest.fn() },
        'order.place',
        undefined,
        send,
        (reply: SignedAttempt) => reply,
      ),
    ).rejects.toBe(failure);
    expect(send).toHaveBeenCalledTimes(2);
    expect(sign).toHaveBeenCalledTimes(2);
  });

  it.each(['bearer', 'signed'])(
    'returns the %s read response when profile refresh fails',
    async (phase) => {
      refresh.mockRejectedValueOnce(new Error('registry unavailable'));
      const request = { method: 'GET', path: '/upstream/balance', query: '' };
      const proposal = { status: 200, signRequired: { request } };
      const response = { status: 503, code: 'venue_profile_not_ready' };
      const signRead = jest.fn().mockResolvedValue(HEADER);
      const send = jest.fn();
      if (phase === 'signed') {
        send.mockResolvedValueOnce(proposal).mockResolvedValueOnce(response);
      } else {
        send.mockResolvedValueOnce(response);
      }

      const result = await sendSignedRead(
        { signRead, invalidateSigningSession: jest.fn() },
        send,
        (reply: SignedAttempt) => reply,
      );

      expect(result).toBe(response);
      expect(send).toHaveBeenCalledTimes(phase === 'signed' ? 2 : 1);
      expect(signRead).toHaveBeenCalledTimes(phase === 'signed' ? 1 : 0);
    },
  );

  it('propagates a transport failure from the retried bearer read', async () => {
    const failure = new Error('network disconnected');
    const send = jest
      .fn()
      .mockResolvedValueOnce({
        status: 503,
        code: 'venue_profile_not_ready',
      })
      .mockRejectedValueOnce(failure);

    await expect(
      sendSignedRead(
        { signRead: jest.fn(), invalidateSigningSession: jest.fn() },
        send,
        (reply: SignedAttempt) => reply,
      ),
    ).rejects.toBe(failure);
    expect(send).toHaveBeenCalledTimes(2);
  });

  it('does not spend a second signature when a profile is already admitted', async () => {
    const sign = jest.fn().mockResolvedValue(undefined);

    await expect(
      sendSigned(
        { signOperation: sign, invalidateSigningSession: jest.fn() },
        'order.place',
        undefined,
        async () => ({ status: 200 }),
        (reply) => reply,
      ),
    ).rejects.toBeDefined();
    expect(refresh).not.toHaveBeenCalled();
    expect(sign).toHaveBeenCalledTimes(1);
  });

  it('refetches once and retries a read after venue_profile_not_ready', async () => {
    const replies = [
      { status: 200, code: 'sign_required' },
      { status: 503, code: 'venue_profile_not_ready' },
      { status: 200 },
    ];
    const signRead = jest.fn().mockResolvedValue(HEADER);

    const result = await sendSignedRead(
      { signRead, invalidateSigningSession: jest.fn() },
      async () => replies.shift() as (typeof replies)[number],
      async (reply) =>
        reply.code === 'sign_required'
          ? {
              status: reply.status,
              code: reply.code,
              signRequired: {
                request: {
                  method: 'GET',
                  path: '/trade-api/v2/portfolio/balance',
                  query: '',
                },
              },
            }
          : reply,
    );

    expect(result).toEqual({ status: 200 });
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
