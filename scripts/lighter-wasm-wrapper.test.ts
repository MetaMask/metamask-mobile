import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createHash } from 'node:crypto';

const html = fs.readFileSync(
  path.join(__dirname, '../app/components/UI/Perps/Lighter/wasm-wrapper.standalone.html'),
  'utf8',
);
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/gu)].map(
  (match) => match[1],
);
const operations = [
  '_createClient',
  '_signChangePubKey',
  '_signCreateOrder',
  '_signCreateGroupedOrders',
  '_signCancelOrder',
  '_signUpdateLeverage',
  '_signUpdateMargin',
  '_signWithdraw',
  '_createAuthToken',
];

function installOperations(context: vm.Context) {
  for (const name of operations) {
    context[name] = jest.fn(() => () => ({ txInfo: 'signed', prv: 'private' }));
  }
}

function createPage(
  start = (context: vm.Context): Promise<void> => {
    installOperations(context);
    return new Promise(() => undefined);
  },
) {
  const messages: Record<string, unknown>[] = [];
  const listeners = new Map<string, (event?: { data: string }) => unknown>();
  const network = jest.fn();
  const instantiate = jest.fn().mockResolvedValue({ instance: {} });
  const context = vm.createContext({
    console: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
    WebAssembly: { instantiate },
    atob: (value: string) => Buffer.from(value, 'base64').toString('binary'),
    URLSearchParams,
    location: { search: '' },
    navigator: { sendBeacon: network },
    fetch: network,
    XMLHttpRequest: network,
    WebSocket: network,
    RTCPeerConnection: network,
    document: { addEventListener: jest.fn() },
    addEventListener: (
      name: string,
      callback: (event?: { data: string }) => unknown,
    ) => listeners.set(name, callback),
    ReactNativeWebView: {
      postMessage: (value: string) => messages.push(JSON.parse(value)),
    },
  });
  class Go {
    importObject = {};
    exited = false;
    run() {
      return start(context);
    }
  }
  context.Go = Go;
  vm.runInContext('window = globalThis', context);
  // Use the actual producer and dispatcher; only the Go engine is substituted.
  for (const index of [0, 2, 3]) {
    vm.runInContext(
      scripts[index].replace(
        /const wasmBase64 = "[^"]+";/u,
        'const wasmBase64 = "AA==";',
      ),
      context,
    );
  }
  return {
    context,
    messages,
    network,
    instantiate,
    load: async () => {
      await listeners.get('DOMContentLoaded')?.();
    },
    send: async (message: unknown) => {
      await listeners.get('message')?.({ data: JSON.stringify(message) });
    },
  };
}

describe('Lighter WASM page', () => {
  it('allows only the exact embedded scripts in its content security policy', () => {
    const policy = html.match(
      /http-equiv="Content-Security-Policy" content="([^"]+)"/u,
    )?.[1];
    const scriptPolicy = policy
      ?.split(';')
      .map((directive) => directive.trim())
      .find((directive) => directive.startsWith('script-src '));
    const hashes = scripts.map(
      (script) => `'sha256-${createHash('sha256').update(script).digest('base64')}'`,
    );

    expect(scripts).toHaveLength(4);
    expect(scriptPolicy?.split(/\s+/u)).toStrictEqual([
      'script-src',
      ...hashes,
      "'wasm-unsafe-eval'",
    ]);
  });

  it.each([
    'fetch',
    'XMLHttpRequest',
    'WebSocket',
    'RTCPeerConnection',
    'navigator.sendBeacon',
  ])('denies %s before the runtime starts', (api) => {
    const page = createPage();

    expect(() =>
      vm.runInContext(`${api}('https://example.invalid')`, page.context),
    ).toThrow('network access is disabled');

    expect(page.network).not.toHaveBeenCalled();
    expect(page.instantiate).not.toHaveBeenCalled();
  });

  it('prevents replacing the denied fetch function', () => {
    const page = createPage();

    vm.runInContext('fetch = () => true', page.context);

    expect(() => vm.runInContext('fetch()', page.context)).toThrow(
      'network access is disabled',
    );
  });

  it('announces ready only after signer operations exist', async () => {
    const page = createPage();

    await page.load();

    expect(page.messages).toEqual([{ type: 'ready' }]);
  });

  it('reports an instantiate rejection to native recovery', async () => {
    const page = createPage();
    page.instantiate.mockRejectedValueOnce(new Error('Allocation failed'));

    await page.load();

    expect(page.messages).toEqual([
      { type: 'initError', message: 'Allocation failed' },
    ]);
  });

  it('reports a rejected Go startup without announcing ready', async () => {
    const page = createPage((context) => {
      installOperations(context);
      return Promise.reject(new Error('Go startup failed'));
    });

    await page.load();

    expect(page.messages).toEqual([
      { type: 'initError', message: 'Go startup failed' },
    ]);
  });

  it('refuses readiness when an expected signer export is missing', async () => {
    const page = createPage((context) => {
      installOperations(context);
      delete context._signWithdraw;
      return new Promise(() => undefined);
    });

    await page.load();

    expect(page.messages).toEqual([
      {
        type: 'initError',
        message: 'Lighter signer runtime did not initialize its operations',
      },
    ]);
  });

  it('reports an unexpected Go runtime exit after readiness', async () => {
    let exitRuntime!: () => void;
    const exit = new Promise<void>((resolve) => {
      exitRuntime = resolve;
    });
    const page = createPage((context) => {
      installOperations(context);
      return exit;
    });
    await page.load();

    exitRuntime();
    await exit;

    expect(page.messages).toEqual([
      { type: 'ready' },
      { type: 'initError', message: 'Lighter Go runtime exited unexpectedly' },
    ]);
  });

  it('rejects operations outside the signer contract', async () => {
    const page = createPage();
    page.context.arbitrary = jest.fn();
    await page.load();

    await page.send({
      type: 'execute',
      function: 'arbitrary',
      params: [],
      executeId: 'unknown',
    });

    expect(page.context.arbitrary).not.toHaveBeenCalled();
    expect(page.messages.at(-1)).toEqual({
      type: 'executeError',
      executeId: 'unknown',
      message: 'Unsupported signer operation',
    });
  });

  it('rejects malformed parameters before invoking the signer', async () => {
    const page = createPage();
    await page.load();

    await page.send({
      type: 'execute',
      function: '_signCancelOrder',
      params: [1, 4096, 123, 0],
      executeId: 'malformed',
    });

    expect(page.context._signCancelOrder).not.toHaveBeenCalled();
    expect(page.messages.at(-1)?.type).toBe('executeError');
  });

  it('dispatches an allowed operation and strips private key output', async () => {
    const page = createPage();
    await page.load();

    await page.send({
      type: 'execute',
      function: '_signCancelOrder',
      params: [1, 4096, '123', 0],
      executeId: 'cancel',
    });

    expect(page.messages.at(-1)).toEqual({
      type: 'executeResult',
      executeId: 'cancel',
      result: { txInfo: 'signed' },
    });
  });
});
