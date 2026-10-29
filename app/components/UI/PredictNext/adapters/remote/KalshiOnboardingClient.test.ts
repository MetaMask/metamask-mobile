import { KALSHI_DEMO_AUTHORITY } from '../../auth/kalshiAuthority';
import { KALSHI_DEVICE_AUTH_HEADER } from '../../auth/kalshiDeviceAuthEnvelope';
import {
  balanceRequest,
  enrollmentCurrentRequest,
  linkRequest,
} from '../../auth/signing/kalshiOnboardingTemplates';
import {
  coveredComponents,
  kalshiContentDigest,
  type SigningInstruction,
  type VenueRequest,
} from '../../auth/signing/venueRequest';
import {
  KalshiOnboardingClient,
  KalshiOnboardingHttpError,
  KalshiOnboardingPolicyError,
} from './KalshiOnboardingClient';

const KEY = 'a1b2c3d4-1111-4222-8333-444455556666';

const instructionFor = (request: VenueRequest): SigningInstruction => ({
  ref: request.ref,
  method: request.method,
  path: request.path,
  query: request.query,
  ...(request.method === 'POST'
    ? {
        body: request.body ?? '',
        idempotencyKey: request.idempotencyKey,
        contentDigest: kalshiContentDigest(request.body ?? ''),
        contentType: 'application/json',
      }
    : {}),
  components: [...coveredComponents(request)],
});

const response = (status: number, body: string) => ({
  status,
  text: async () => body,
  headers: { get: () => null },
});

const challenge = (requests: VenueRequest[]) =>
  response(
    428,
    JSON.stringify({
      statusCode: 428,
      code: 'venue_signature_required',
      message: 'A Kalshi signature is required for this request.',
      authority: KALSHI_DEMO_AUTHORITY,
      requests: requests.map(instructionFor),
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
  signRequests: jest.Mock<Promise<string | undefined>> = jest.fn(
    async () => 'kalshi-device-auth-header',
  ),
) => {
  const invalidateSigningSession = jest.fn();
  const client = new KalshiOnboardingClient({
    baseUrl: 'https://predict.example',
    clientVersion: 'test',
    fetch: fetchImpl,
    getBearerToken: async () => 'mm-token',
    authority: KALSHI_DEMO_AUTHORITY,
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
      .mockResolvedValueOnce(
        challenge([balanceRequest(), enrollmentCurrentRequest()]),
      )
      .mockResolvedValueOnce(json(200, { state: 'none' }));
    const { client, signRequests } = clientWith(fetchImpl);

    await expect(client.getStatus()).resolves.toEqual({ state: 'none' });

    expect(signRequests).toHaveBeenCalledTimes(1);
    expect(signRequests).toHaveBeenCalledWith([
      balanceRequest(),
      enrollmentCurrentRequest(),
    ]);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(
      sent(fetchImpl, 0).headers[KALSHI_DEVICE_AUTH_HEADER],
    ).toBeUndefined();
    expect(sent(fetchImpl, 1).url).toBe(sent(fetchImpl, 0).url);
    expect(
      sent(fetchImpl, 1).headers[KALSHI_DEVICE_AUTH_HEADER].length,
    ).toBeGreaterThan(0);
    expect(sent(fetchImpl, 1).headers.Authorization).toBe('Bearer mm-token');
  });

  it('signs nothing when the 428 names a different email', async () => {
    const other = linkRequest('other@example.com', KEY);
    const fetchImpl = jest.fn().mockResolvedValueOnce(challenge([other]));
    const { client, signRequests } = clientWith(fetchImpl);

    await expect(
      client.submitEmail('user@example.com', KEY),
    ).rejects.toBeInstanceOf(KalshiOnboardingPolicyError);
    expect(signRequests).not.toHaveBeenCalled();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(sent(fetchImpl, 0).body).toBe(
      JSON.stringify({ email: 'user@example.com', idempotencyKey: KEY }),
    );
  });

  it('surfaces a second 428 and does not sign again', async () => {
    const request = linkRequest('user@example.com', KEY);
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce(challenge([request]))
      .mockResolvedValueOnce(challenge([request]));
    const { client, signRequests } = clientWith(fetchImpl);

    await expect(
      client.submitEmail('user@example.com', KEY),
    ).rejects.toMatchObject({ code: 'venue_signature_required' });
    expect(signRequests).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('reissues the A2T once after venue_auth_invalid', async () => {
    const request = linkRequest('user@example.com', KEY);
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce(challenge([request]))
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
    expect(
      sent(fetchImpl, 0).headers[KALSHI_DEVICE_AUTH_HEADER],
    ).toBeUndefined();
  });

  it('refuses to send when the service cannot sign', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce(challenge([linkRequest('user@example.com', KEY)]));
    const { client } = clientWith(
      fetchImpl,
      jest.fn(async (): Promise<string | undefined> => undefined),
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
