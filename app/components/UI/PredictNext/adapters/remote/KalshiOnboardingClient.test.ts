import { sha256 } from '@noble/hashes/sha2';

import {
  KalshiOnboardingClient,
  KalshiOnboardingHttpError,
  KalshiOnboardingPolicyError,
} from './KalshiOnboardingClient';
import {
  onboardingSigningBase,
  onboardingSignatureParams,
} from './kalshiOnboardingSigner';

const KEY = 'a1b2c3d4-1111-4222-8333-444455556666';
const AUTH_HEADER = 'Venue-Authorization';
const CONTEXT = {
  a2t: 'a2t-token',
  deviceKey: 'device-key',
  salt: 'device-salt',
};

// ES2022 does not provide Promise.withResolvers.
const deferred = <Value>(): {
  promise: Promise<Value>;
  resolve: (value: Value) => void;
} => {
  let resolve!: (value: Value) => void;
  const promise = new Promise<Value>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

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
  overrides: {
    getA2t?: () => Promise<string | undefined>;
    getDeviceKey?: () => Promise<{ publicKey: string; salt: string } | null>;
    getBearerToken?: () => Promise<string | undefined>;
    signDeviceProof?: (message: Uint8Array) => Promise<Uint8Array>;
  } = {},
) => {
  const signDeviceProof = jest.fn(
    overrides.signDeviceProof ??
      (async (message: Uint8Array) =>
        Buffer.from(`signed:${Buffer.from(message).toString('utf8')}`)),
  );
  const invalidateA2t = jest.fn();
  const client = new KalshiOnboardingClient({
    baseUrl: 'https://predict.example',
    clientVersion: 'test',
    fetch: fetchImpl,
    getBearerToken: overrides.getBearerToken ?? (async () => 'mm-token'),
    getA2t: overrides.getA2t ?? (async () => CONTEXT.a2t),
    getDeviceKey:
      overrides.getDeviceKey ??
      (async () => ({
        publicKey: CONTEXT.deviceKey,
        salt: CONTEXT.salt,
      })),
    signDeviceProof,
    invalidateA2t,
  });
  return { client, signDeviceProof, invalidateA2t };
};

const sent = (fetchImpl: jest.Mock, index: number) => {
  const [url, init] = fetchImpl.mock.calls[index] as [string, RequestInit];
  const { body } = init;
  if (body !== undefined && typeof body !== 'string') {
    throw new Error('Kalshi onboarding test expected a string request body');
  }
  return {
    url,
    method: init.method,
    headers: init.headers as Record<string, string>,
    body,
  };
};

/** Decodes the `Venue-Authorization` envelope the client sent. */
const envelope = (fetchImpl: jest.Mock, index: number) =>
  JSON.parse(
    Buffer.from(
      sent(fetchImpl, index)
        .headers[AUTH_HEADER].replace(/-/gu, '+')
        .replace(/_/gu, '/'),
      'base64',
    ).toString('utf8'),
  ) as {
    v: number;
    signingProfileId: string;
    step: string;
    credential: { a2t: string; deviceKey: string; salt: string };
    values: Record<string, string>;
    signatures: { requestId: string; signatureInput: string }[];
  };

describe('KalshiOnboardingClient', () => {
  it('passes the status signal to fetch', async () => {
    const controller = new AbortController();
    const fetchImpl = jest
      .fn()
      .mockResolvedValue(json(200, { onboarded: true }));
    const { client } = clientWith(fetchImpl);

    await client.getStatus({ signal: controller.signal });

    expect(fetchImpl.mock.calls[0][1].signal).toBe(controller.signal);
  });

  it('stops before obtaining credentials when already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const getA2t = jest.fn(async () => CONTEXT.a2t);
    const fetchImpl = jest.fn();
    const { client, signDeviceProof } = clientWith(fetchImpl, { getA2t });

    await expect(
      client.getStatus({ signal: controller.signal }),
    ).rejects.toMatchObject({ name: 'AbortError' });

    expect(getA2t).not.toHaveBeenCalled();
    expect(signDeviceProof).not.toHaveBeenCalled();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('stops after credential resolution if aborted during it', async () => {
    const controller = new AbortController();
    const credential = deferred<string | undefined>();
    const fetchImpl = jest.fn();
    const { client, signDeviceProof } = clientWith(fetchImpl, {
      getA2t: async () => credential.promise,
    });
    const result = client.getStatus({ signal: controller.signal });

    controller.abort();
    credential.resolve(CONTEXT.a2t);

    await expect(result).rejects.toMatchObject({ name: 'AbortError' });
    expect(signDeviceProof).not.toHaveBeenCalled();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('does not send after abort during signing', async () => {
    const controller = new AbortController();
    const signature = deferred<Uint8Array>();
    const signingStarted = deferred<void>();
    const fetchImpl = jest.fn();
    const { client } = clientWith(fetchImpl, {
      signDeviceProof: async () => {
        signingStarted.resolve();
        return signature.promise;
      },
    });
    const result = client.getStatus({ signal: controller.signal });
    await signingStarted.promise;

    controller.abort();
    signature.resolve(new Uint8Array([1]));

    await expect(result).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('does not send after abort during bearer token resolution', async () => {
    const controller = new AbortController();
    const token = deferred<string | undefined>();
    const tokenStarted = deferred<void>();
    const fetchImpl = jest.fn();
    const { client } = clientWith(fetchImpl, {
      getBearerToken: async () => {
        tokenStarted.resolve();
        return token.promise;
      },
    });
    const result = client.getStatus({ signal: controller.signal });
    await tokenStarted.promise;

    controller.abort();
    token.resolve('mm-token');

    await expect(result).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('discards a response body resolved after abort', async () => {
    const controller = new AbortController();
    const body = deferred<string>();
    const bodyStarted = deferred<void>();
    const fetchImpl = jest.fn().mockResolvedValue({
      status: 200,
      text: async () => {
        bodyStarted.resolve();
        return body.promise;
      },
      headers: { get: () => null },
    });
    const { client } = clientWith(fetchImpl);
    const result = client.getStatus({ signal: controller.signal });
    await bodyStarted.promise;

    controller.abort();
    body.resolve('{"onboarded":true}');

    await expect(result).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('does not renew credentials after an aborted stale response', async () => {
    const controller = new AbortController();
    const pending = deferred<{
      status: number;
      text: () => Promise<string>;
      headers: { get: () => null };
    }>();
    const fetchStarted = deferred<void>();
    const fetchImpl = jest.fn(async () => {
      fetchStarted.resolve();
      return pending.promise;
    });
    const { client, invalidateA2t } = clientWith(fetchImpl);
    const result = client.getStatus({ signal: controller.signal });
    await fetchStarted.promise;

    controller.abort();
    pending.resolve(json(403, {}, 'venue_authorization_invalid'));

    await expect(result).rejects.toMatchObject({ name: 'AbortError' });
    expect(invalidateA2t).not.toHaveBeenCalled();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('returns a status after one credential renewal', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce(json(403, {}, 'venue_authorization_invalid'))
      .mockResolvedValueOnce(json(200, { onboarded: true }));
    const { client, invalidateA2t } = clientWith(fetchImpl);
    const controller = new AbortController();

    await expect(
      client.getStatus({ signal: controller.signal }),
    ).resolves.toEqual({ state: 'active' });

    expect(invalidateA2t).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(fetchImpl.mock.calls[1][1].signal).toBe(controller.signal);
  });

  it('renews a status request only once', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValue(json(403, {}, 'venue_authorization_invalid'));
    const { client, invalidateA2t } = clientWith(fetchImpl);

    await expect(
      client.getStatus({ signal: new AbortController().signal }),
    ).rejects.toMatchObject({ code: 'venue_authorization_invalid' });

    expect(invalidateA2t).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('sends the onboarded probe device-signed with an envelope', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce(json(200, { onboarded: true }));
    const { client, signDeviceProof } = clientWith(fetchImpl);

    await expect(client.getStatus()).resolves.toEqual({ state: 'active' });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(sent(fetchImpl, 0).method).toBe('GET');
    expect(sent(fetchImpl, 0).url).toContain(
      '/v1/venues/kalshi/onboarding/onboarded',
    );
    expect(sent(fetchImpl, 0).headers.Authorization).toBe('Bearer mm-token');
    const decoded = envelope(fetchImpl, 0);
    expect(decoded.v).toBe(2);
    expect(decoded.signingProfileId).toBe('kalshi-demo-signing-v2');
    expect(decoded.step).toBe('default');
    expect(decoded.credential).toEqual(CONTEXT);
    expect(decoded.values).toEqual({});
    expect(decoded.signatures).toHaveLength(2);
    // The first signature must cover the enrollment-intent read: the
    // server's verifyOperation array is order-sensitive.
    const firstSignedMessage = Buffer.from(
      signDeviceProof.mock.calls[0][0] as Uint8Array,
    ).toString('utf8');
    expect(firstSignedMessage).toContain(
      '"@path": /trade-api/v2/isv/enrollment/intents/current',
    );
  });

  it('passes the linked balance through when the server reports it', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce(
        json(200, { onboarded: true, balanceDollars: '10.00' }),
      );
    const { client } = clientWith(fetchImpl);

    await expect(client.getStatus()).resolves.toEqual({
      state: 'active',
      balanceDollars: '10.00',
    });
  });

  it('maps a failed probe to the enrollment state the server reports', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce(
        json(200, { onboarded: false, state: 'link_pending' }),
      );
    const { client } = clientWith(fetchImpl);

    await expect(client.getStatus()).resolves.toEqual({
      state: 'link_pending',
    });
  });

  it.each<
    [
      string,
      (client: KalshiOnboardingClient) => Promise<unknown>,
      { path: string; body: string; dto: Record<string, string> },
    ]
  >([
    [
      'link',
      async (client): Promise<unknown> =>
        client.submitEmail('user@example.com', KEY),
      {
        path: '/trade-api/v2/isv/users/link',
        body: '{"email":"user@example.com"}',
        dto: { email: 'user@example.com', idempotencyKey: KEY },
      },
    ],
    [
      'link verify',
      async (client): Promise<unknown> => client.verifyCode('888888', KEY),
      {
        path: '/trade-api/v2/isv/users/link/verify',
        body: '{"code":"888888"}',
        dto: { code: '888888', idempotencyKey: KEY },
      },
    ],
    [
      'intent',
      async (client): Promise<unknown> => client.createIntent(KEY),
      {
        path: '/trade-api/v2/isv/enrollment/intents',
        body: '',
        dto: { idempotencyKey: KEY },
      },
    ],
    [
      'activate',
      async (client): Promise<unknown> => client.activate('0xabc', 'base', KEY),
      {
        path: '/trade-api/v2/isv/wallet/register',
        body: '{"wallet_address":"0xabc","network":"base"}',
        dto: { walletAddress: '0xabc', network: 'base', idempotencyKey: KEY },
      },
    ],
  ])(
    'signs exactly the fixed upstream bytes of the %s request',
    async (_name, call, { path, body, dto }) => {
      const fetchImpl = jest.fn().mockResolvedValue(json(500, {}, 'stop'));
      const { client, signDeviceProof } = clientWith(fetchImpl);

      await expect(call(client)).rejects.toBeInstanceOf(
        KalshiOnboardingHttpError,
      );

      // The signature input pins the components, their order, the request id
      // and the params; the signed bytes are the signing base itself.
      const decoded = envelope(fetchImpl, 0);
      const [signature] = decoded.signatures;
      expect(signature.signatureInput).toBe(
        `kalshi=${onboardingSignatureParams(
          { method: 'POST', path, query: '', body, idempotencyKey: KEY },
          signature.requestId,
          // created is derived from the params; recompute the base from the
          // signature input instead of the clock.
          Number(/created=(\d+);/u.exec(signature.signatureInput)?.[1] ?? 0),
        )}`,
      );
      expect(signDeviceProof).toHaveBeenCalledTimes(1);
      // The phone signs the exact base it built; the mock input is those
      // raw bytes.
      const signedMessage = Buffer.from(
        signDeviceProof.mock.calls[0][0] as Uint8Array,
      ).toString('utf8');
      expect(signedMessage.startsWith('"@method": POST')).toBe(true);
      // The base carries the fixed upstream request bytes.
      expect(signedMessage).toContain(`"@path": ${path}`);
      expect(signedMessage).toContain(
        `"content-digest": sha-256=:${Buffer.from(
          sha256(new TextEncoder().encode(body)),
        ).toString('base64')}:`,
      );
      expect(signedMessage).toContain(`"idempotency-key": ${KEY}`);
      // The regression: the HTTP body must carry the DTO fields and the
      // envelope values must repeat them, or the server answers 400 (empty
      // DTO) or 403 (values mismatch).
      expect(JSON.parse(sent(fetchImpl, 0).body ?? '{}')).toEqual(dto);
      expect(decoded.values).toEqual(dto);
    },
  );

  it('covers the GET component list without body components', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce(json(200, { onboarded: true }));
    const { client, signDeviceProof } = clientWith(fetchImpl);

    await client.getStatus();

    const signedMessage = Buffer.from(
      signDeviceProof.mock.calls[0][0] as Uint8Array,
    ).toString('utf8');
    expect(signedMessage.startsWith('"@method": GET')).toBe(true);
    expect(signedMessage).toContain('"@query": ?');
    expect(signedMessage).not.toContain('"content-digest"');
    expect(signedMessage).toContain('"@authority": demo-api.kalshi.co');
    expect(signedMessage).toContain('"authorization": Kalshi-A2T a2t-token');
  });

  it('sends nothing when there is no A2T', async () => {
    const fetchImpl = jest.fn();
    const { client } = clientWith(fetchImpl, { getA2t: async () => undefined });

    await expect(
      client.submitEmail('user@example.com', KEY),
    ).rejects.toMatchObject({ rule: 'signing_unavailable' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('sends nothing when there is no device key', async () => {
    const fetchImpl = jest.fn();
    const { client } = clientWith(fetchImpl, {
      getDeviceKey: async () => null,
    });

    await expect(
      client.submitEmail('user@example.com', KEY),
    ).rejects.toBeInstanceOf(KalshiOnboardingPolicyError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('invalidates the A2T once and signs again after venue_authorization_invalid', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce(json(403, {}, 'venue_authorization_invalid'))
      .mockResolvedValueOnce(response(204, ''));
    const { client, signDeviceProof, invalidateA2t } = clientWith(fetchImpl);

    await client.submitEmail('user@example.com', KEY);

    expect(invalidateA2t).toHaveBeenCalledTimes(1);
    expect(signDeviceProof).toHaveBeenCalledTimes(2);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('signs again once, keeping the A2T, after venue_signature_expired', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce(json(409, {}, 'venue_signature_expired'))
      .mockResolvedValueOnce(response(204, ''));
    const { client, signDeviceProof, invalidateA2t } = clientWith(fetchImpl);

    await client.submitEmail('user@example.com', KEY);

    expect(invalidateA2t).not.toHaveBeenCalled();
    expect(signDeviceProof).toHaveBeenCalledTimes(2);
  });

  it('surfaces a second stale-signature response and does not sign a third time', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValue(json(403, {}, 'venue_authorization_invalid'));
    const { client, signDeviceProof } = clientWith(fetchImpl);

    await expect(
      client.submitEmail('user@example.com', KEY),
    ).rejects.toMatchObject({ code: 'venue_authorization_invalid' });
    expect(signDeviceProof).toHaveBeenCalledTimes(2);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('calls demo KYC with the bearer and no device header', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce(json(200, { state: 'approved' }));
    const { client, signDeviceProof } = clientWith(fetchImpl);

    await expect(client.runDemoKyc()).resolves.toEqual({ state: 'approved' });

    expect(signDeviceProof).not.toHaveBeenCalled();
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

  it('builds the signing base with the branch component order', () => {
    const base = onboardingSigningBase({
      request: {
        method: 'POST',
        path: '/trade-api/v2/isv/users/link',
        query: '',
        body: '{"email":"user@example.com"}',
        idempotencyKey: KEY,
      },
      context: CONTEXT,
      requestId: 'req-1',
      signatureParams: '(params)',
    });
    const lines = base.split('\n');
    expect(lines).toEqual([
      '"@method": POST',
      '"@authority": demo-api.kalshi.co',
      '"@path": /trade-api/v2/isv/users/link',
      '"@query": ?',
      '"authorization": Kalshi-A2T a2t-token',
      '"kalshi-device-request-id": req-1',
      '"kalshi-device-key": device-key',
      '"kalshi-device-key-salt": device-salt',
      expect.stringMatching(/^"content-digest": sha-256=:/u),
      '"content-type": application/json',
      `"idempotency-key": ${KEY}`,
      '"@signature-params": (params)',
    ]);
  });
});
