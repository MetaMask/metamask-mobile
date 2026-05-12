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

function fetchViaHttpsProxy(
  url: string,
  proxyUrl: string,
  ca: string,
): Promise<{ statusCode: number; body: string }> {
  return new Promise((resolve, reject) => {
    const agent = new HttpsProxyAgent(proxyUrl);
    const req = https.get(url, { agent, ca }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () =>
        resolve({
          statusCode: res.statusCode ?? 0,
          body: Buffer.concat(chunks).toString('utf-8'),
        }),
      );
    });
    req.on('error', reject);
  });
}

describe('MockServerE2E HTTPS proxy mode', () => {
  let server: MockServerE2E;
  let tmpDir: string;

  beforeEach(() => {
    // testSetup globally disables external network; allow localhost so the
    // test can talk to mockttp + the proxy CONNECT tunnel.
    nock.enableNetConnect('localhost');
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mockserver-https-test-'));
    server = new MockServerE2E({
      events: {},
      caCacheDir: tmpDir,
    });
    server.setServerPort(0);
  });

  afterEach(async () => {
    if (server.isStarted()) {
      await server.stop();
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('intercepts an HTTPS proxy request and responds via the cached CA', async () => {
    await server.start();

    await server.server
      .forGet('https://test.example.com/hello')
      .thenReply(200, 'hello-via-tls');

    const caPem = fs.readFileSync(path.join(tmpDir, 'ca.pem'), 'utf-8');
    const actualPort = server.server.port;
    const proxyUrl = `http://localhost:${actualPort}`;

    const result = await fetchViaHttpsProxy(
      'https://test.example.com/hello',
      proxyUrl,
      caPem,
    );

    expect(result.statusCode).toBe(200);
    expect(result.body).toBe('hello-via-tls');
  });
});
