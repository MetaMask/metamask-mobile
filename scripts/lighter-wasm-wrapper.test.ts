import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createHash } from 'node:crypto';

const html = fs.readFileSync(
  path.join(
    __dirname,
    '../app/components/UI/Perps/Lighter/wasm-wrapper.standalone.html',
  ),
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

// Slice instead of a unicode regex replace: one script is a 10MB wasm
// payload, and `String.replace(/.../u, ...)` overflows the call stack in CI.
function withStubbedWasm(script: string): string {
  const prefix = 'const wasmBase64 = "';
  const start = script.indexOf(prefix);
  if (start === -1) {
    return script;
  }

  const valueStart = start + prefix.length;
  const end = script.indexOf('";', valueStart);
  if (end === -1) {
    return script;
  }

  return `${script.slice(0, valueStart)}AA==${script.slice(end)}`;
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
    vm.runInContext(withStubbedWasm(scripts[index]), context);
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

function createGroupedOrderParams(groupingType: number, orderCount: number) {
  const orders = Array.from({ length: orderCount }, (_unused, index) => [
    4095,
    100 + index,
    index === 0 || groupingType === 1 ? '100' : '0',
    '270000',
    index === 0 ? 0 : 1,
    index === 0 ? 0 : index === 1 ? 2 : 4,
    1,
    index === 0 ? 0 : 1,
    index === 0 ? '0' : '260000',
    -1,
  ]).flat();
  return [64, groupingType, orderCount, ...orders, 7];
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
      (script) =>
        `'sha256-${createHash('sha256').update(script).digest('base64')}'`,
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

  describe('grouped orders', () => {
    it.each([
      ['OCO', 1, 2],
      ['OTO', 2, 2],
      ['OTOCO', 3, 3],
    ] as const)(
      'forwards the exact %s tuple to the signer',
      async (_name, groupingType, orderCount) => {
        const page = createPage();
        const params = createGroupedOrderParams(groupingType, orderCount);
        await page.load();

        await page.send({
          type: 'execute',
          function: '_signCreateGroupedOrders',
          params,
          executeId: 'grouped',
        });

        expect(page.context._signCreateGroupedOrders).toHaveBeenCalledWith(
          ...params,
        );
        expect(page.messages.at(-1)).toEqual({
          type: 'executeResult',
          executeId: 'grouped',
          result: { txInfo: 'signed' },
        });
      },
    );

    it.each([
      [0, 2],
      [1, 3],
      [2, 3],
      [3, 2],
      [4, 2],
      [3, 4],
    ])(
      'rejects grouping %i with count %i before signing',
      async (groupingType, orderCount) => {
        const page = createPage();
        const params = createGroupedOrderParams(groupingType, orderCount);
        await page.load();

        await page.send({
          type: 'execute',
          function: '_signCreateGroupedOrders',
          params,
          executeId: 'wrong-group',
        });

        expect(page.context._signCreateGroupedOrders).not.toHaveBeenCalled();
        expect(page.messages.at(-1)).toEqual({
          type: 'executeError',
          executeId: 'wrong-group',
          message: 'Invalid signer parameters',
        });
      },
    );

    it.each([
      ['truncated OTO', createGroupedOrderParams(2, 2).slice(0, -1)],
      ['extra OTO parameter', [...createGroupedOrderParams(2, 2), 0]],
      ['truncated OTOCO', createGroupedOrderParams(3, 3).slice(0, -1)],
      ['extra OTOCO parameter', [...createGroupedOrderParams(3, 3), 0]],
      [
        'missing third order',
        createGroupedOrderParams(3, 3).filter(
          (_value, index) => index < 23 || index === 33,
        ),
      ],
      ['object parameters', { account: 64 }],
    ])('rejects %s before signing', async (_name, params) => {
      const page = createPage();
      await page.load();

      await page.send({
        type: 'execute',
        function: '_signCreateGroupedOrders',
        params,
        executeId: 'wrong-arity',
      });

      expect(page.context._signCreateGroupedOrders).not.toHaveBeenCalled();
      expect(page.messages.at(-1)).toEqual({
        type: 'executeError',
        executeId: 'wrong-arity',
        message: 'Invalid signer parameters',
      });
    });

    const malformedOrderFields = [
      ['market ID', -1],
      ['client order ID', Number.MAX_SAFE_INTEGER + 1],
      ['base amount', '1.2'],
      ['price', '270000USD'],
      ['side', 2],
      ['order type', -1],
      ['time in force', 1.5],
      ['reduce only', 2],
      ['trigger price', '-1'],
      ['expiry', Number.MAX_SAFE_INTEGER + 1],
    ] as const;
    const malformedFields = [
      ...[0, 1, 2].flatMap((orderIndex) =>
        malformedOrderFields.map(
          ([field, value], fieldIndex) =>
            [
              `order ${orderIndex + 1} ${field}`,
              3 + orderIndex * 10 + fieldIndex,
              value,
            ] as const,
        ),
      ),
      ['account', 0, -1] as const,
      ['nonce', 33, -1] as const,
    ];

    it.each(malformedFields)(
      'rejects malformed %s before signing',
      async (_field, index, value) => {
        const page = createPage();
        const params = createGroupedOrderParams(3, 3);
        params[index] = value;
        await page.load();

        await page.send({
          type: 'execute',
          function: '_signCreateGroupedOrders',
          params,
          executeId: 'malformed-field',
        });

        expect(page.context._signCreateGroupedOrders).not.toHaveBeenCalled();
        expect(page.messages.at(-1)).toEqual({
          type: 'executeError',
          executeId: 'malformed-field',
          message: 'Invalid signer parameters',
        });
      },
    );
  });
});
