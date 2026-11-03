import Logger from '../../../../../util/Logger';
import { TemplateError } from '../../auth/signing/venueTemplates';
import {
  sendSigned,
  VenueSigningRefusedError,
  VenueSigningUnavailableError,
} from './signedVenueCall';

jest.mock('../../../../../util/Logger', () => ({
  __esModule: true,
  default: { log: jest.fn(), error: jest.fn() },
}));

const HEADER = { name: 'Venue-Authorization', value: 'envelope' };

interface Reply {
  status: number;
  code?: string;
}

const run = async ({
  replies,
  sign = jest.fn().mockResolvedValue(HEADER),
}: {
  replies: Reply[];
  sign?: jest.Mock;
}) => {
  const invalidate = jest.fn();
  const queue = [...replies];
  const send = jest.fn(async () => queue.shift() as Reply);
  const result = await sendSigned(
    { signOperation: sign, invalidateSigningSession: invalidate },
    'portfolio.balance',
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
    expect(sign).toHaveBeenCalledWith('portfolio.balance', undefined);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(HEADER);
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
        'portfolio.balance',
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
        'portfolio.balance',
        undefined,
        jest.fn(),
        () => ({ status: 200 }),
      ),
    ).rejects.toBe(boom);
    expect(VenueSigningRefusedError).toBeDefined();
  });
});
