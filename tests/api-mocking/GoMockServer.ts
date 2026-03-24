// tests/api-mocking/GoMockServer.ts

import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import axios from 'axios';
import {
  MockEventsObject,
  MockApiEndpoint,
  Resource,
  ServerStatus,
  TestSpecificMock,
} from '../framework';
import PortManager, { ResourceType } from '../framework/PortManager';
import {
  FALLBACK_GANACHE_PORT,
  FALLBACK_DAPP_SERVER_PORT,
} from '../framework/Constants';
import { DEFAULT_ANVIL_PORT } from '../seeder/anvil-manager';
import { MockttpCompat } from './MockttpCompat';

const goArch = process.arch === 'x64' ? 'amd64' : process.arch;
const BINARY_PATH = path.join(
  __dirname,
  '../bin',
  `mock-server-${process.platform}-${goArch}`,
);

export default class GoMockServer implements Resource {
  private _process: ChildProcess | null = null;
  private _proxyPort = 0;
  private _controlPort = 0;
  private _serverStatus: ServerStatus = ServerStatus.STOPPED;
  private _events: MockEventsObject;
  private _testSpecificMock?: TestSpecificMock;

  constructor(params: {
    events: MockEventsObject;
    testSpecificMock?: TestSpecificMock;
  }) {
    this._events = params.events;
    this._testSpecificMock = params.testSpecificMock;
  }

  // ── Resource interface ────────────────────────────────────────────────────

  async start(): Promise<void> {
    this._proxyPort = await PortManager.getInstance().allocatePort(
      ResourceType.MOCK_SERVER,
    );
    this._controlPort = await PortManager.getInstance().allocatePort(
      ResourceType.MOCK_SERVER_CONTROL,
    );

    const portMaps = this._buildPortMaps();
    const defaultMocksJson = this._serializeEvents(this._events);

    this._process = spawn(BINARY_PATH, [
      '--proxy-port', String(this._proxyPort),
      '--control-port', String(this._controlPort),
      '--defaults', defaultMocksJson,
      ...portMaps,
    ]);

    this._process.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        this._serverStatus = ServerStatus.STOPPED;
        console.error(`[GoMockServer] binary exited unexpectedly with code ${code}`);
      }
    });

    this._process.on('error', (err) => {
      console.error(`[GoMockServer] failed to start binary: ${err.message}`);
    });

    await this._waitForHealthy();

    if (this._testSpecificMock) {
      await this._testSpecificMock(this._makeCompat());
    }

    this._serverStatus = ServerStatus.STARTED;
  }

  async stop(): Promise<void> {
    this._process?.kill('SIGTERM');
    this._process = null;
    this._serverStatus = ServerStatus.STOPPED;
    PortManager.getInstance().releasePort(ResourceType.MOCK_SERVER);
    PortManager.getInstance().releasePort(ResourceType.MOCK_SERVER_CONTROL);
  }

  isStarted(): boolean {
    return this._serverStatus === ServerStatus.STARTED;
  }

  setServerPort(port: number): void {
    this._proxyPort = port;
  }

  getServerPort(): number {
    return this._proxyPort;
  }

  getServerStatus(): ServerStatus {
    return this._serverStatus;
  }

  // Note: declared as a getter matching MockServerE2E's existing pattern.
  // Resource interface declares this as `getServerUrl?: string` (optional property),
  // satisfied by a TypeScript getter. No change from the existing pattern.
  get getServerUrl(): string {
    return `http://localhost:${this._proxyPort}`;
  }

  // ── Mock lifecycle ────────────────────────────────────────────────────────

  // Called between tests to clear per-test rules.
  // Reserved for the future per-worker resource reform.
  // FixtureHelper does not call this yet.
  async reset(): Promise<void> {
    await axios.delete(`${this._controlUrl}/mocks`);
  }

  // Async — FixtureHelper.ts must await this call (see FixtureHelper changes below).
  async validateLiveRequests(): Promise<void> {
    await axios.post(`${this._controlUrl}/mocks/validate`);
  }

  // No-op stubs — FixtureHelper calls these; they are unnecessary in Go.
  startDraining(): void {}
  async removeAbortFilter(): Promise<void> {}

  // Exposes a MockttpCompat object for use in helpers and analytics.
  // Replaces the `.server` property (Mockttp) from MockServerE2E.
  get server(): MockttpCompat {
    return this._makeCompat();
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private get _controlUrl(): string {
    return `http://localhost:${this._controlPort}`;
  }

  private async _waitForHealthy(timeoutMs = 5000): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        await axios.get(`${this._controlUrl}/health`);
        return;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }
    throw new Error(
      `[GoMockServer] did not become healthy within ${timeoutMs}ms. ` +
      `Check that binary exists at: ${BINARY_PATH}`,
    );
  }

  private _serializeEvents(events: MockEventsObject): string {
    const serialized: Record<string, unknown[]> = {};
    for (const [method, rules] of Object.entries(events)) {
      serialized[method] = (rules as MockApiEndpoint[]).map((rule) => {
        const isRegexEndpoint = rule.urlEndpoint instanceof RegExp;
        return {
          ...rule,
          // Spread first, then override — avoids isRegex being clobbered by spread
          // if a rule was already pre-serialized with isRegex: true on a string endpoint.
          urlEndpoint: isRegexEndpoint
            ? (rule.urlEndpoint as RegExp).source
            : rule.urlEndpoint,
          isRegex: isRegexEndpoint || (rule as { isRegex?: boolean }).isRegex === true,
        };
      });
    }
    return JSON.stringify(serialized);
  }

  private _buildPortMaps(): string[] {
    const portManager = PortManager.getInstance();
    const maps: string[] = [];
    const ganachePort = portManager.getPort(ResourceType.GANACHE);
    if (ganachePort !== undefined) {
      maps.push('--port-map', `${FALLBACK_GANACHE_PORT}:${ganachePort}`);
    }
    const anvilPort = portManager.getPort(ResourceType.ANVIL);
    if (anvilPort !== undefined) {
      maps.push('--port-map', `${DEFAULT_ANVIL_PORT}:${anvilPort}`);
    }
    // Dapp servers: each gets its own mapping
    for (let i = 0; i < 10; i++) {
      const dappPort = portManager.getMultiInstancePort(
        ResourceType.DAPP_SERVER,
        `dapp-server-${i}`,
      );
      if (dappPort !== undefined) {
        maps.push('--port-map', `${FALLBACK_DAPP_SERVER_PORT + i}:${dappPort}`);
      }
    }
    return maps;
  }

  private _makeCompat(): MockttpCompat {
    const controlUrl = this._controlUrl;

    const makeRule = (method: string, url: string | RegExp) => ({
      thenReply: async (status: number, body: unknown) => {
        await axios.post(`${controlUrl}/mocks`, {
          method,
          urlEndpoint: url instanceof RegExp ? url.source : url,
          isRegex: url instanceof RegExp,
          responseCode: status,
          response: body,
        });
      },
    });

    return {
      forGet: (url) => makeRule('GET', url),
      forPost: (url) => makeRule('POST', url),
      forDelete: (url) => makeRule('DELETE', url),
      forAnyRequest: () => ({
        thenCallback: async (_cb) => {
          // forAnyRequest().thenCallback() is used by a small number of specs
          // for dynamic response generation. This is registered as a wildcard rule.
          // For the initial migration, specs using forAnyRequest().thenCallback()
          // must be identified and migrated to static testSpecificMock rules instead.
          throw new Error(
            '[GoMockServer] forAnyRequest().thenCallback() is not supported. ' +
            'Use testSpecificMock with static forGet/forPost rules instead.',
          );
        },
      }),
      getMockedEndpoints: async () => [],
    };
  }
}
