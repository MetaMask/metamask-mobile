import { TemplateError } from '../../auth/signing/venueTemplates';
import {
  KalshiOnboardingClient,
  KalshiOnboardingHttpError,
  KalshiOnboardingPolicyError,
} from './KalshiOnboardingClient';

const KEY = 'a1b2c3d4-1111-4222-8333-444455556666';
const AUTH_HEADER = 'Venue-Authorization';

const response = (status: number, body: string) => ({
  status,
  text: async () => body,
  headers: { get: () => null },
});

const json = (status: number, value: unknown, code?: string) =>
  response(
    status,
    JSON.stringify(
      code === undefined ? value : { statusCode: status, code, message: 'no' },
    ),
  );

const clientWith = (
  fetchImpl: jest.Mock,
  signOperation: jest.Mock<
    Promise<{ name: string; value: string } | undefined>
  > = jest.fn(async () => ({ name: AUTH_HEADER, value: 'envelope' })),
) => {
  const invalidateSigningSession = jest.fn();
  const client = new KalshiOnboardingClient({
    baseUrl: 'https://predict.example',
    clientVersion: 'test',
    fetch: fetchImpl,
    getBearerToken: async () => 'mm-token',
    signOperation,
    invalidateSigningSession,
  });
  return { client, signOperation, invalidateSigningSession };
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
  it('signs the status operation and sends it as the first and only call', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce(json(200, { state: 'none' }));
    const { client, signOperation } = clientWith(fetchImpl);

    await expect(client.getStatus()).resolves.toEqual({ state: 'none' });

    expect(signOperation).toHaveBeenCalledTimes(1);
    expect(signOperation).toHaveBeenCalledWith('onboarding.status', undefined);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(sent(fetchImpl, 0).method).toBe('GET');
    expect(sent(fetchImpl, 0).headers[AUTH_HEADER]).toBe('envelope');
    expect(sent(fetchImpl, 0).headers.Authorization).toBe('Bearer mm-token');
  });

  it.each<
    [
      string,
      (client: KalshiOnboardingClient) => Promise<unknown>,
      string,
      unknown,
    ]
  >([
    [
      'link',
      (client) => client.submitEmail('user@example.com', KEY),
      'onboarding.link',
      { inputs: { email: 'user@example.com', idempotencyKey: KEY } },
    ],
    [
      'link verify',
      (client) => client.verifyCode('888888', KEY),
      'onboarding.verify',
      { inputs: { code: '888888', idempotencyKey: KEY } },
    ],
    [
      'intent',
      (client) => client.createIntent(KEY),
      'onboarding.start',
      { inputs: { idempotencyKey: KEY } },
    ],
    [
      'activate',
      (client) => client.activate('0xabc', 'base', KEY),
      'onboarding.activate',
      {
        inputs: {
          walletAddress: '0xabc',
          network: 'base',
          idempotencyKey: KEY,
        },
        confirmed: true,
      },
    ],
  ])(
    'names the %s operation and the user inputs',
    async (_name, call, operation, input) => {
      const fetchImpl = jest.fn().mockResolvedValueOnce(json(500, {}, 'stop'));
      const { client, signOperation } = clientWith(fetchImpl);

      await expect(call(client)).rejects.toBeInstanceOf(
        KalshiOnboardingHttpError,
      );

      expect(signOperation).toHaveBeenCalledWith(operation, input);
      expect(fetchImpl).toHaveBeenCalledTimes(1);
      expect(sent(fetchImpl, 0).headers[AUTH_HEADER]).toBe('envelope');
    },
  );

  it('sends nothing when the profile refuses the request', async () => {
    const fetchImpl = jest.fn();
    const { client, signOperation } = clientWith(
      fetchImpl,
      jest.fn(async () => {
        throw new TemplateError('shape');
      }),
    );

    const error = await client
      .submitEmail('user@example.com', KEY)
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(KalshiOnboardingPolicyError);
    expect(error).toMatchObject({ rule: 'shape' });
    expect(signOperation).toHaveBeenCalledTimes(1);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('sends nothing when the service cannot sign', async () => {
    const fetchImpl = jest.fn();
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
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('reissues the A2T once after venue_authorization_invalid', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce(json(403, {}, 'venue_authorization_invalid'))
      .mockResolvedValueOnce(response(204, ''));
    const { client, signOperation, invalidateSigningSession } =
      clientWith(fetchImpl);

    await client.submitEmail('user@example.com', KEY);

    expect(invalidateSigningSession).toHaveBeenCalledTimes(1);
    expect(signOperation).toHaveBeenCalledTimes(2);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('signs again once, keeping the A2T, after venue_signature_expired', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce(json(409, {}, 'venue_signature_expired'))
      .mockResolvedValueOnce(response(204, ''));
    const { client, signOperation, invalidateSigningSession } =
      clientWith(fetchImpl);

    await client.submitEmail('user@example.com', KEY);

    expect(invalidateSigningSession).not.toHaveBeenCalled();
    expect(signOperation).toHaveBeenCalledTimes(2);
  });

  it('surfaces a second stale-signature response and does not sign a third time', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValue(json(403, {}, 'venue_authorization_invalid'));
    const { client, signOperation } = clientWith(fetchImpl);

    await expect(
      client.submitEmail('user@example.com', KEY),
    ).rejects.toMatchObject({ code: 'venue_authorization_invalid' });
    expect(signOperation).toHaveBeenCalledTimes(2);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('calls demo KYC with the bearer and no device header', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce(json(200, { state: 'approved' }));
    const { client, signOperation } = clientWith(fetchImpl);

    await expect(client.runDemoKyc()).resolves.toEqual({ state: 'approved' });

    expect(signOperation).not.toHaveBeenCalled();
    expect(sent(fetchImpl, 0).method).toBe('POST');
    expect(sent(fetchImpl, 0).url).toContain('/demo-kyc');
    expect(sent(fetchImpl, 0).headers[AUTH_HEADER]).toBeUndefined();
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
