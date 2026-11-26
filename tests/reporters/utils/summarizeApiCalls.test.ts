import { summarizeApiCalls } from './summarizeApiCalls';
import type { NetworkLogEntry } from '../types';

const call = (
  url: string,
  status?: number,
  method = 'GET',
): NetworkLogEntry => ({ method, url, status });

const okCall = (url: string, method = 'GET'): NetworkLogEntry =>
  call(url, 200, method);

describe('summarizeApiCalls', () => {
  it('returns null when no capture was attempted', () => {
    expect(summarizeApiCalls(null, null)).toBeNull();
    expect(summarizeApiCalls(undefined)).toBeNull();
  });

  it('returns an error summary instead of zero requests when capture failed', () => {
    expect(summarizeApiCalls(null, 'HAR download failed')).toEqual({
      status: 'error',
      error: 'HAR download failed',
    });
  });

  it('prefers the capture error over any partial entries', () => {
    expect(summarizeApiCalls([okCall('https://a.test/x')], 'boom')).toEqual({
      status: 'error',
      error: 'boom',
    });
  });

  it('reports a captured empty log as zero requests', () => {
    expect(summarizeApiCalls([])).toEqual({
      status: 'captured',
      total: 0,
      unique: 0,
      duplicates: 0,
      failed: 0,
      byHost: {},
      app: { total: 0, unique: 0, duplicates: 0, failed: 0 },
      topEndpoints: [],
    });
  });

  it('counts total, unique and duplicates by method and sanitized URL', () => {
    const summary = summarizeApiCalls([
      okCall('https://api.example.com/v1/accounts?page=1'),
      okCall('https://api.example.com/v1/accounts?page=2'),
      okCall('https://api.example.com/v1/accounts', 'POST'),
      okCall('https://mainnet.infura.io/v3/0123456789abcdef0123456789abcdef'),
      okCall('https://mainnet.infura.io/v3/fedcba9876543210fedcba9876543210'),
    ]);

    expect(summary).toMatchObject({
      status: 'captured',
      total: 5,
      unique: 3,
      duplicates: 2,
    });
  });

  it('counts status >= 400, missing and zero statuses as failed', () => {
    const summary = summarizeApiCalls([
      call('https://a.test/ok', 200),
      call('https://a.test/redirect', 304),
      call('https://a.test/client', 404),
      call('https://a.test/server', 503),
      call('https://a.test/missing', undefined),
      call('https://a.test/aborted', 0),
    ]);

    expect(summary).toMatchObject({ status: 'captured', failed: 4 });
  });

  it('groups by lowercase host without port or credentials, most requests first', () => {
    const summary = summarizeApiCalls([
      okCall('https://b.test/one'),
      okCall('https://A.test:8443/one'),
      okCall('https://a.test/two'),
      okCall('https://user:pass@a.test/three'),
      okCall('not-a-url'),
      okCall(''),
    ]);

    expect(summary).toMatchObject({ status: 'captured' });
    if (summary?.status !== 'captured') {
      throw new Error('Expected a captured summary');
    }
    expect(Object.entries(summary.byHost)).toEqual([
      ['a.test', 3],
      ['b.test', 1],
      ['not-a-url', 1],
      ['unknown', 1],
    ]);
  });

  it('lists the top endpoints by count with their failures', () => {
    const summary = summarizeApiCalls(
      [
        okCall('https://a.test/rare'),
        call('https://a.test/hot', 200),
        call('https://a.test/hot', 500),
        call('https://a.test/hot', 200),
        okCall('https://a.test/warm'),
        okCall('https://a.test/warm'),
      ],
      null,
      2,
    );

    if (summary?.status !== 'captured') {
      throw new Error('Expected a captured summary');
    }
    expect(summary.topEndpoints).toEqual([
      { method: 'GET', kind: 'app', url: 'a.test/hot', count: 3, failed: 1 },
      { method: 'GET', kind: 'app', url: 'a.test/warm', count: 2, failed: 0 },
    ]);
  });

  it('labels noise by kind, totals app requests separately and lists app endpoints first', () => {
    const summary = summarizeApiCalls(
      [
        okCall('http://localhost:8000/mock'),
        okCall('http://localhost:8000/mock'),
        okCall('http://localhost:8000/mock'),
        { method: 'OPTIONS', url: 'https://a.test/x', status: 204 },
        okCall('https://o1.ingest.sentry.io/api/1/envelope/'),
        okCall('https://a.test/x'),
        call('https://a.test/x', 500),
        okCall('https://a.test/y'),
      ],
      null,
      3,
    );

    if (summary?.status !== 'captured') {
      throw new Error('Expected a captured summary');
    }
    expect(summary.total).toBe(8);
    expect(summary.app).toEqual({
      total: 3,
      unique: 2,
      duplicates: 1,
      failed: 1,
    });
    expect(
      summary.topEndpoints.map(({ method, kind, url }) => [method, kind, url]),
    ).toEqual([
      ['GET', 'app', 'a.test/x'],
      ['GET', 'app', 'a.test/y'],
      ['GET', 'test_infra', 'localhost:8000/mock'],
    ]);
  });

  it('defaults to the ten most requested endpoints', () => {
    const calls = Array.from({ length: 15 }, (_, index) =>
      okCall(`https://a.test/endpoint-${index}`),
    );

    const summary = summarizeApiCalls(calls);

    if (summary?.status !== 'captured') {
      throw new Error('Expected a captured summary');
    }
    expect(summary.unique).toBe(15);
    expect(summary.topEndpoints).toHaveLength(10);
  });
});
