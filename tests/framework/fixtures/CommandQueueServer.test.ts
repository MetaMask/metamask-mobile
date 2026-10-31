import CommandQueueServer from './CommandQueueServer';

const SECRET_JWT =
  'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJlMmUtZml4dHVyZSJ9.e2e-signature';
const SECRET_VAULT = 'e2e-vault-cipher';
const SECRET_MNEMONIC =
  'e2e abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

function renderLogArg(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function listeningPort(commandQueueServer: CommandQueueServer): number {
  const nodeServer = (
    commandQueueServer as unknown as {
      _server?: { address: () => { port?: number } | string | null };
    }
  )._server;
  const address = nodeServer?.address();
  if (!address || typeof address === 'string' || address.port === undefined) {
    throw new Error('Command queue server did not bind to a port');
  }
  return address.port;
}

describe('CommandQueueServer', () => {
  let commandQueueServer: CommandQueueServer | undefined;
  let consoleLog: jest.SpyInstance;

  beforeEach(() => {
    consoleLog = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(async () => {
    if (commandQueueServer?.isStarted()) {
      await commandQueueServer.stop();
    }
    consoleLog.mockRestore();
  });

  it('leaves exported secrets out of server logs and diagnostic responses', async () => {
    commandQueueServer = new CommandQueueServer();
    commandQueueServer.setServerPort(0);
    await commandQueueServer.start();
    const port = listeningPort(commandQueueServer);
    const exportedState = {
      redux: { settings: { displayName: SECRET_JWT } },
      engine: {
        AuthenticationController: { jwt: SECRET_JWT },
        KeyringController: {
          vault: SECRET_VAULT,
          keyrings: [{ mnemonic: SECRET_MNEMONIC }],
        },
      },
    };

    const postResponse = await fetch(
      `http://localhost:${port}/exported-state`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exportedState),
      },
    );
    const postBody = await postResponse.text();
    const debugResponse = await fetch(`http://localhost:${port}/debug.json`);
    const debugBody = await debugResponse.text();
    const queueResponse = await fetch(`http://localhost:${port}/queue.json`);
    const queueBody = await queueResponse.text();
    const logs = consoleLog.mock.calls
      .map((call: unknown[]) => call.map((arg) => renderLogArg(arg)).join(' '))
      .join('\n');
    const exposedSurfaces = [postBody, debugBody, queueBody, logs].join('\n');

    expect(postResponse.status).toBe(200);
    expect(exposedSurfaces).not.toContain(SECRET_JWT);
    expect(exposedSurfaces).not.toContain(SECRET_VAULT);
    expect(exposedSurfaces).not.toContain(SECRET_MNEMONIC);
  });

  it('queues and stores the in-app state export separately from the raw snapshot', async () => {
    commandQueueServer = new CommandQueueServer();
    commandQueueServer.setServerPort(0);
    await commandQueueServer.start();
    const port = listeningPort(commandQueueServer);
    const appState = {
      loggedIn: true,
      engine: {
        backgroundState: {
          KeyringController: { vaultExists: true, keyrings: [] },
        },
      },
    };

    commandQueueServer.requestAppStateExport();
    const queueResponse = await fetch(`http://localhost:${port}/queue.json`);
    const queueBody = (await queueResponse.json()) as {
      queue: { type: string; args: Record<string, unknown> }[];
    };
    const postResponse = await fetch(
      `http://localhost:${port}/exported-app-state`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appState),
      },
    );

    await expect(commandQueueServer.getExportedAppState()).resolves.toEqual(
      appState,
    );
    expect(queueBody.queue).toEqual([{ type: 'export-app-state', args: {} }]);
    expect(postResponse.status).toBe(200);
    await expect(postResponse.json()).resolves.toEqual({ success: true });
  });
});
