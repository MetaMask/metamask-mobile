import { VenueSigningPolicyError } from '../../auth/signing/venueSigningPolicy';
import {
  KalshiOnboardingClient,
  KalshiOnboardingHttpError,
  KalshiOnboardingPolicyError,
} from './KalshiOnboardingClient';

const KEY = 'a1b2c3d4-1111-4222-8333-444455556666';
const DEVICE_HEADER = 'Kalshi-Device-Auth';

/** The client passes the 428 through untouched; its contents are opaque. */
const REQUIRED = {
  authority: 'venue.example',
  requests: [
    {
      ref: 'link',
      method: 'POST' as const,
      path: '/venue/link',
      query: '',
      body: '{"email":"user@example.com"}',
      idempotencyKey: KEY,
      components: ['@method'],
      contentDigest: 'sha-256=:x:',
      contentType: 'application/json',
    },
  ],
};

const response = (status: number, body: string) => ({
  status,
  text: async () => body,
  headers: { get: () => null },
});

const challenge = () =>
  response(
    428,
    JSON.stringify({
      statusCode: 428,
      code: 'venue_signature_required',
      message: 'A Kalshi signature is required for this request.',
      ...REQUIRED,
    }),
  );

const json = (status: number, value: unknown, code?: string) =>
  response(
    status,
    JSON.stringify(
      code === undefined ? value : { statusCode: status, code, message: 'no' },
    ),
  );

const clientWith = (
  fetchImpl: jest.Mock,
  signRequests: jest.Mock<
    Promise<{ name: string; value: string } | undefined>
  > = jest.fn(async () => ({ name: DEVICE_HEADER, value: 'envelope' })),
) => {
  const invalidateSigningSession = jest.fn();
  const client = new KalshiOnboardingClient({
    baseUrl: 'https://predict.example',
    clientVersion: 'test',
    fetch: fetchImpl,
    getBearerToken: async () => 'mm-token',
    signRequests,
    invalidateSigningSession,
  });
  return { client, signRequests, invalidateSigningSession };
};

const sent = (fetchImpl: jest.Mock, index: number) => {
  const [url, init] = fetchImpl.mock.calls[index] as [string, RequestInit];
  return {
    url,
    method: init.method,
    headers: init.headers as Record<string, string>,
    body: init.body,
  };
};

describe('KalshiOnboardingClient', () => {
  it('signs the status reads once and retries the same route', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce(challenge())
      .mockResolvedValueOnce(json(200, { state: 'none' }));
    const { client, signRequests } = clientWith(fetchImpl);

    await expect(client.getStatus()).resolves.toEqual({ state: 'none' });

    expect(signRequests).toHaveBeenCalledTimes(1);
    expect(signRequests).toHaveBeenCalledWith(
      { operations: ['balance', 'enrollment_current'] },
      REQUIRED,
    );
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(sent(fetchImpl, 0).headers[DEVICE_HEADER]).toBeUndefined();
    expect(sent(fetchImpl, 1).url).toBe(sent(fetchImpl, 0).url);
    expect(sent(fetchImpl, 1).headers[DEVICE_HEADER]).toBe('envelope');
    expect(sent(fetchImpl, 1).headers.Authorization).toBe('Bearer mm-token');
  });

  it.each<
    [string, (client: KalshiOnboardingClient) => Promise<unknown>, unknown]
  >([
    [
      'link',
      (client) => client.submitEmail('user@example.com', KEY),
      {
        operations: ['link'],
        inputs: { email: 'user@example.com' },
        idempotencyKey: KEY,
      },
    ],
    [
      'link verify',
      (client) => client.verifyCode('888888', KEY),
      {
        operations: ['link_verify'],
        inputs: { code: '888888' },
        idempotencyKey: KEY,
      },
    ],
    [
      'intent',
      (client) => client.createIntent(KEY),
      { operations: ['enrollment_intent'], idempotencyKey: KEY },
    ],
    [
      'activate',
      (client) => client.activate('0xabc', 'base', KEY),
      {
        operations: ['wallet_register'],
        inputs: { walletAddress: '0xabc', network: 'base' },
        idempotencyKey: KEY,
      },
    ],
  ])(
    'names the %s operation and the user inputs',
    async (_name, call, intent) => {
      const fetchImpl = jest
        .fn()
        .mockResolvedValueOnce(challenge())
        .mockResolvedValueOnce(json(500, {}, 'stop'));
      const { client, signRequests } = clientWith(fetchImpl);

      await expect(call(client)).rejects.toBeInstanceOf(
        KalshiOnboardingHttpError,
      );

      expect(signRequests).toHaveBeenCalledWith(intent, REQUIRED);
    },
  );

  it('sends nothing signed when the profile refuses the 428', async () => {
    const fetchImpl = jest.fn().mockResolvedValueOnce(challenge());
    const { client, signRequests } = clientWith(
      fetchImpl,
      jest.fn(async () => {
        throw new VenueSigningPolicyError('body');
      }),
    );

    const error = await client
      .submitEmail('user@example.com', KEY)
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(KalshiOnboardingPolicyError);
    expect(error).toMatchObject({ rule: 'body' });
    expect(signRequests).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(sent(fetchImpl, 0).headers[DEVICE_HEADER]).toBeUndefined();
    expect(sent(fetchImpl, 0).body).toBe(
      JSON.stringify({ email: 'user@example.com', idempotencyKey: KEY }),
    );
  });

  it('surfaces a second 428 and does not sign again', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce(challenge())
      .mockResolvedValueOnce(challenge());
    const { client, signRequests } = clientWith(fetchImpl);

    await expect(
      client.submitEmail('user@example.com', KEY),
    ).rejects.toMatchObject({ code: 'venue_signature_required' });
    expect(signRequests).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('reissues the A2T once after venue_auth_invalid', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce(challenge())
      .mockResolvedValueOnce(json(403, {}, 'venue_auth_invalid'))
      .mockResolvedValueOnce(response(204, ''));
    const { client, signRequests, invalidateSigningSession } =
      clientWith(fetchImpl);

    await client.submitEmail('user@example.com', KEY);

    expect(invalidateSigningSession).toHaveBeenCalledTimes(1);
    expect(signRequests).toHaveBeenCalledTimes(2);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it('calls demo KYC with the bearer and no device header', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce(json(200, { state: 'approved' }));
    const { client, signRequests } = clientWith(fetchImpl);

    await expect(client.runDemoKyc()).resolves.toEqual({ state: 'approved' });

    expect(signRequests).not.toHaveBeenCalled();
    expect(sent(fetchImpl, 0).method).toBe('POST');
    expect(sent(fetchImpl, 0).url).toContain('/demo-kyc');
    expect(sent(fetchImpl, 0).headers[DEVICE_HEADER]).toBeUndefined();
  });

  it('refuses to send when the service cannot sign', async () => {
    const fetchImpl = jest.fn().mockResolvedValueOnce(challenge());
    const { client } = clientWith(
      fetchImpl,
      jest.fn(
        async (): Promise<{ name: string; value: string } | undefined> =>
          undefined,
      ),
    );

    await expect(
      client.submitEmail('user@example.com', KEY),
    ).rejects.toMatchObject({ rule: 'signing_unavailable' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('throws the body code for a rejected link', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce(json(400, {}, 'onboarding_code_incorrect'));
    const { client } = clientWith(fetchImpl);

    await expect(client.verifyCode('000000', KEY)).rejects.toBeInstanceOf(
      KalshiOnboardingHttpError,
    );
  });
});
