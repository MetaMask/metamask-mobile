/* eslint-disable import-x/no-nodejs-modules */
/* eslint-disable import-x/no-namespace */
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as https from 'https';
import { HttpsProxyAgent } from 'https-proxy-agent';
import nock from 'nock';
import MockServerE2E from './MockServerE2E.ts';

jest.mock('../framework/logger.ts', () => ({
  LogLevel: { ERROR: 0, WARN: 1, INFO: 2, DEBUG: 3, TRACE: 4 },
  createLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    trace: jest.fn(),
  }),
}));

interface ProxyResponse {
  statusCode: number;
  body: string;
}

function httpsViaProxy(
  url: string,
  proxyUrl: string,
  ca: string,
  options: { method?: 'GET' | 'POST'; body?: string } = {},
): Promise<ProxyResponse> {
  return new Promise((resolve, reject) => {
    const agent = new HttpsProxyAgent(proxyUrl);
    const req = https.request(
      url,
      {
        agent,
        ca,
        method: options.method ?? 'GET',
        headers:
          options.method === 'POST'
            ? {
                'content-type': 'application/json',
                'content-length': Buffer.byteLength(
                  options.body ?? '',
                ).toString(),
              }
            : undefined,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () =>
          resolve({
            statusCode: res.statusCode ?? 0,
            body: Buffer.concat(chunks).toString('utf-8'),
          }),
        );
      },
    );
    req.on('error', reject);
    if (options.method === 'POST' && options.body !== undefined) {
      req.write(options.body);
    }
    req.end();
  });
}

describe('MockServerE2E dual-mode dispatch', () => {
  let server: MockServerE2E;
  let tmpDir: string;
  let caPem: string;

  async function startServer(events: Record<string, unknown[]>) {
    server = new MockServerE2E({
      events: events as never,
      caCacheDir: tmpDir,
    });
    server.setServerPort(0);
    await server.start();
    caPem = fs.readFileSync(path.join(tmpDir, 'ca.pem'), 'utf-8');
  }

  beforeEach(() => {
    // testSetup globally disables external network; allow localhost so the
    // test can talk to mockttp + the proxy CONNECT tunnel.
    nock.enableNetConnect('localhost');
    tmpDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'mockserver-dualmode-test-'),
    );
  });

  afterEach(async () => {
    if (server?.isStarted()) {
      await server.stop();
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('matches a GET event for an HTTPS proxy request (absolute URL path)', async () => {
    await startServer({
      GET: [
        {
          urlEndpoint: 'https://test.example.com/data',
          responseCode: 200,
          response: { ok: true },
        },
      ],
    });

    const proxyUrl = `http://localhost:${server.server.port}`;
    const result = await httpsViaProxy(
      'https://test.example.com/data',
      proxyUrl,
      caPem,
    );

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({ ok: true });
  });

  it('matches a POST event with a matching request body', async () => {
    await startServer({
      POST: [
        {
          urlEndpoint: 'https://test.example.com/submit',
          requestBody: { id: 42 },
          responseCode: 201,
          response: { created: true },
        },
      ],
    });

    const proxyUrl = `http://localhost:${server.server.port}`;
    const result = await httpsViaProxy(
      'https://test.example.com/submit',
      proxyUrl,
      caPem,
      { method: 'POST', body: JSON.stringify({ id: 42 }) },
    );

    expect(result.statusCode).toBe(201);
    expect(JSON.parse(result.body)).toEqual({ created: true });
  });

  it('returns 404 when a POST event matches the URL but body diverges', async () => {
    await startServer({
      POST: [
        {
          urlEndpoint: 'https://test.example.com/submit',
          requestBody: { id: 42 },
          responseCode: 201,
          response: { created: true },
        },
      ],
    });

    const proxyUrl = `http://localhost:${server.server.port}`;
    const result = await httpsViaProxy(
      'https://test.example.com/submit',
      proxyUrl,
      caPem,
      { method: 'POST', body: JSON.stringify({ id: 99 }) },
    );

    expect(result.statusCode).toBe(404);
  });
});
