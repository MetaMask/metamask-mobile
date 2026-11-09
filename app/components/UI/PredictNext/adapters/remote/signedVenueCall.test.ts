import Logger from '../../../../../util/Logger';
import { TemplateError } from '../../auth/signing/profileTemplates';
import {
  sendSigned,
  sendSignedRead,
  VenueSigningRefusedError,
  VenueSigningUnavailableError,
} from './signedVenueCall';

jest.mock('../../../../../util/Logger', () => ({
  __esModule: true,
  default: { log: jest.fn(), error: jest.fn() },
}));

const HEADER = { name: 'Venue-Authorization', value: 'envelope' };
/** What the Engine's signOperation now resolves to: the envelope header
 * plus the exact body bytes the signature covers. */
const SIGNED = { header: HEADER, body: '', idempotencyKey: 'op-key' };

interface Reply {
  status: number;
  code?: string;
}

const run = async ({
  replies,
  sign = jest.fn().mockResolvedValue(SIGNED),
}: {
  replies: Reply[];
  sign?: jest.Mock;
}) => {
  const invalidate = jest.fn();
  const queue = [...replies];
  const send = jest.fn(async () => queue.shift() as Reply);
  const result = await sendSigned(
    { signOperation: sign, invalidateSigningSession: invalidate },
    'order.place',
    undefined,
    send,
    (reply) => reply,
  );
  return { result, send, sign, invalidate };
};

describe('sendSigned', () => {
  it('signs and sends once. The signed call is the first call', async () => {
    const { result, send, sign } = await run({ replies: [{ status: 200 }] });

    expect(result).toEqual({ status: 200 });
    expect(sign).toHaveBeenCalledTimes(1);
    expect(sign).toHaveBeenCalledWith('order.place', undefined);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(SIGNED);
  });

  it('signs again once and drops the A2T when it was stale', async () => {
    const { result, send, sign, invalidate } = await run({
      replies: [
        { status: 403, code: 'venue_authorization_invalid' },
        { status: 200 },
      ],
    });

    expect(result).toEqual({ status: 200 });
    expect(sign).toHaveBeenCalledTimes(2);
    expect(send).toHaveBeenCalledTimes(2);
    expect(invalidate).toHaveBeenCalledTimes(1);
  });

  it('signs the renewal without the user confirmation', async () => {
    const sign = jest.fn().mockResolvedValue(SIGNED);
    const queue: Reply[] = [
      { status: 403, code: 'venue_authorization_invalid' },
      { status: 200 },
    ];
    const input = {
      step: 'submit',
      confirmed: true,
      inputs: { idempotencyKey: 'key' },
    };

    await sendSigned(
      { signOperation: sign, invalidateSigningSession: jest.fn() },
      'order.place',
      input,
      async () => queue.shift() as Reply,
      (reply) => reply,
    );

    expect(sign).toHaveBeenNthCalledWith(1, 'order.place', input);
    expect(sign).toHaveBeenNthCalledWith(2, 'order.place', {
      ...input,
      confirmed: false,
    });
  });

  it('signs again once, keeping the A2T, when the signature expired in flight', async () => {
    const { result, sign, invalidate } = await run({
      replies: [
        { status: 409, code: 'venue_signature_expired' },
        { status: 200 },
      ],
    });

    expect(result).toEqual({ status: 200 });
    expect(sign).toHaveBeenCalledTimes(2);
    expect(invalidate).not.toHaveBeenCalled();
  });

  it('returns a second failure to the caller instead of looping', async () => {
    const { result, send } = await run({
      replies: [
        { status: 403, code: 'venue_authorization_invalid' },
        { status: 403, code: 'venue_authorization_invalid' },
      ],
    });

    expect(result).toEqual({
      status: 403,
      code: 'venue_authorization_invalid',
    });
    expect(send).toHaveBeenCalledTimes(2);
  });

  it.each([
    { status: 403, code: 'venue_account_not_enabled' },
    { status: 502, code: 'venue_auth_rejected' },
    { status: 429 },
  ])('does not sign again for $status $code', async (reply) => {
    const { result, sign } = await run({ replies: [reply] });

    expect(result).toEqual(reply);
    expect(sign).toHaveBeenCalledTimes(1);
  });

  it('throws a refusal with the rule and sends nothing', async () => {
    const sign = jest.fn().mockRejectedValue(new TemplateError('input'));
    const send = jest.fn();

    await expect(
      sendSigned(
        { signOperation: sign, invalidateSigningSession: jest.fn() },
        'onboarding.link',
        undefined,
        send,
        () => ({ status: 200 }),
      ),
    ).rejects.toMatchObject({
      name: 'VenueSigningRefusedError',
      rule: 'input',
    });

    expect(send).not.toHaveBeenCalled();
    expect(Logger.log).toHaveBeenCalledWith(
      'PredictNext: venue signing refused',
      'input',
    );
  });

  it('throws unavailable when the Engine cannot sign, and sends nothing', async () => {
    const send = jest.fn();

    await expect(
      sendSigned(
        {
          signOperation: jest.fn().mockResolvedValue(undefined),
          invalidateSigningSession: jest.fn(),
        },
        'order.place',
        undefined,
        send,
        () => ({ status: 200 }),
      ),
    ).rejects.toBeInstanceOf(VenueSigningUnavailableError);

    expect(send).not.toHaveBeenCalled();
  });

  it('passes other signing errors through', async () => {
    const boom = new Error('keychain locked');

    await expect(
      sendSigned(
        {
          signOperation: jest.fn().mockRejectedValue(boom),
          invalidateSigningSession: jest.fn(),
        },
        'order.place',
        undefined,
        jest.fn(),
        () => ({ status: 200 }),
      ),
    ).rejects.toBe(boom);
    expect(VenueSigningRefusedError).toBeDefined();
  });
});

describe('sendSignedRead', () => {
  const PROPOSAL_BODY = {
    kind: 'sign_required',
    request: { method: 'GET', path: '/upstream/balance', query: '?a=1' },
    proposal: 'token-1',
  };
  /** A sign_required reply, with just enough Response shape. */
  const propose = {
    ok: true,
    status: 200,
    json: async () => PROPOSAL_BODY,
  } as unknown as Response;
  const result = {
    ok: true,
    status: 200,
  } as unknown as Response;

  const run = async ({
    replies,
    signRead = jest.fn().mockResolvedValue(HEADER),
  }: {
    replies: Response[];
    signRead?: jest.Mock;
  }) => {
    const invalidate = jest.fn();
    const queue = [...replies];
    const send = jest.fn(
      async (deviceAuth?: { name: string }, proposal?: string) => {
        if (deviceAuth && proposal !== 'token-1') {
          throw new Error('unexpected proposal');
        }
        return queue.shift() as Response;
      },
    );
    const readAttempt = async (response: Response) => {
      if (!response.ok) {
        const body = (await response.json().catch(() => undefined)) as
          | { code?: unknown }
          | undefined;
        return {
          status: response.status,
          code: typeof body?.code === 'string' ? body.code : undefined,
        };
      }
      return {
        status: response.status,
        signRequired: (response as unknown as {
          json?: () => Promise<typeof PROPOSAL_BODY>;
        }).json
          ? PROPOSAL_BODY
          : null,
      };
    };
    const result = await sendSignedRead(
      { signRead, invalidateSigningSession: invalidate },
      send,
      readAttempt,
    );
    return { result, send, signRead, invalidate };
  };

  it('proposes bearer-only, then signs and re-calls with the token', async () => {
    const { send, signRead } = await run({
      replies: [propose, result],
    });

    expect(send).toHaveBeenCalledTimes(2);
    expect(signRead).toHaveBeenCalledWith(PROPOSAL_BODY.request);
  });

  it('returns the first response when it is not a proposal', async () => {
    const { send, signRead } = await run({
      replies: [result],
    });

    expect(send).toHaveBeenCalledTimes(1);
    expect(signRead).not.toHaveBeenCalled();
  });

  it('re-proposes and signs again once when the signature expired', async () => {
    const stale = {
      ok: false,
      status: 409,
      json: async () => ({ code: 'venue_signature_expired' }),
    } as unknown as Response;
    const { send, signRead } = await run({
      replies: [propose, stale, propose, result],
    });

    expect(send).toHaveBeenCalledTimes(4);
    expect(signRead).toHaveBeenCalledTimes(2);
  });
});
