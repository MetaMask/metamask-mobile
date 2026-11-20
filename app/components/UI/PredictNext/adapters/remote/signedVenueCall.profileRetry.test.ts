import {
  refreshVenueProfileAfterRefusal,
  resolveVenueProfile,
} from '../../auth/venueSigningProfiles';
import { sendSigned, sendSignedRead } from './signedVenueCall';

jest.mock('../../../../../util/Logger', () => ({
  __esModule: true,
  default: { log: jest.fn(), error: jest.fn() },
}));

// One refetch of the registry, then one retry of the same attempt.
jest.mock('../../auth/venueSigningProfiles', () => ({
  ...jest.requireActual('../../auth/venueSigningProfiles'),
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
    const reply = { status: 409, code: 'venue_profile_not_ready' };
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
      { status: 409, code: 'venue_profile_not_ready' },
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
