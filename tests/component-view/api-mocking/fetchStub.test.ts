import {
  restoreFetchPath,
  stubFetchPath,
  stubFetchPathDeferred,
} from './fetchStub';

const ORIGIN = 'https://predict-api.test';
const PATHS = [
  '/v1/venues/kalshi/onboarding/onboarded',
  '/v1/method',
  '/v1/deferred',
  '/v1/deferred-failure',
  '/v1/headers',
];

const flushMicrotasks = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
};

describe('fetchStub', () => {
  afterEach(() => {
    PATHS.forEach((path) => restoreFetchPath(ORIGIN, path));
  });

  it('answers with json, text, headers, status, and ok', async () => {
    stubFetchPath(
      ORIGIN,
      '/v1/venues/kalshi/onboarding/onboarded',
      { onboarded: true },
      202,
      { headers: { 'Retry-After': '7' } },
    );

    const response = await fetch(
      `${ORIGIN}/v1/venues/kalshi/onboarding/onboarded?profile=profile-1`,
    );

    expect(response.status).toBe(202);
    expect(response.ok).toBe(true);
    expect(response.headers.get('retry-after')).toBe('7');
    expect(response.headers.get('Retry-After')).toBe('7');
    expect(await response.text()).toBe('{"onboarded":true}');
    expect(await response.json()).toEqual({ onboarded: true });
  });

  it('serves a raw text body through text and json', async () => {
    stubFetchPath(ORIGIN, '/v1/headers', '{"state":"active"}', 200, {
      headers: { 'content-type': 'application/json' },
    });

    const response = await fetch(`${ORIGIN}/v1/headers`);

    expect(await response.text()).toBe('{"state":"active"}');
    expect(await response.json()).toEqual({ state: 'active' });
    expect(response.headers.get('content-type')).toBe('application/json');
  });

  it('prefers a method-specific stub and restores each method separately', async () => {
    stubFetchPath(ORIGIN, '/v1/method', { method: 'any' });
    stubFetchPath(ORIGIN, '/v1/method', { method: 'POST' }, 201, {
      method: 'POST',
    });

    const post = await fetch(`${ORIGIN}/v1/method`, { method: 'POST' });
    expect(post.status).toBe(201);
    expect(await post.json()).toEqual({ method: 'POST' });

    restoreFetchPath(ORIGIN, '/v1/method', { method: 'POST' });
    const get = await fetch(`${ORIGIN}/v1/method`);
    expect(await get.json()).toEqual({ method: 'any' });
  });

  it('holds a deferred response until respond settles it', async () => {
    const deferred = stubFetchPathDeferred(ORIGIN, '/v1/deferred');
    let settled = false;
    const pending = fetch(`${ORIGIN}/v1/deferred`).then((response) => {
      settled = true;
      return response;
    });

    await flushMicrotasks();
    expect(settled).toBe(false);

    deferred.respond({ state: 'kyc_review' }, 200);
    const response = await pending;

    expect(settled).toBe(true);
    expect(await response.json()).toEqual({ state: 'kyc_review' });
  });

  it('rejects a deferred response through fail', async () => {
    const deferred = stubFetchPathDeferred(ORIGIN, '/v1/deferred-failure');
    const pending = fetch(`${ORIGIN}/v1/deferred-failure`);

    deferred.fail(new Error('network down'));

    await expect(pending).rejects.toThrow('network down');
  });

  it('reports the request method and raw body through onRequest', async () => {
    const onRequest = jest.fn();
    stubFetchPath(ORIGIN, '/v1/method', { ok: true }, 200, {
      method: 'POST',
      onRequest,
    });

    await fetch(`${ORIGIN}/v1/method`, {
      method: 'POST',
      body: '{"wallet":"0x1"}',
    });

    expect(onRequest).toHaveBeenCalledWith({
      method: 'POST',
      body: '{"wallet":"0x1"}',
      url: `${ORIGIN}/v1/method`,
    });
  });
});
