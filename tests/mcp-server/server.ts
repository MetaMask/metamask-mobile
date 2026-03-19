/* eslint-disable import/no-nodejs-modules, @typescript-eslint/no-explicit-any */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Import real classes from the metamask-mobile test infrastructure
// NOTE: We avoid importing from ../framework/types.ts because it pulls in detox → react-native
// which esbuild/tsx cannot parse. Instead we use duck typing for the Resource interface.
import FixtureServer from '../framework/fixtures/FixtureServer.ts';
import FixtureBuilder from '../framework/fixtures/FixtureBuilder.ts';
import { AnvilManager, DEFAULT_ANVIL_PORT } from '../seeder/anvil-manager.ts';
import LocalWebSocketServer from '../websocket/server.ts';
import { resolveNetworkPreset, listNetworkPresets } from './network-presets.ts';

// Fallback ports — must match what the app expects
// Source: tests/framework/Constants.ts + tests/seeder/anvil-manager.ts + tests/websocket/constants.ts
const FALLBACK_PORTS = {
  FIXTURE_SERVER: 12345,
  MOCK_SERVER: 8000,
  ANVIL: DEFAULT_ANVIL_PORT, // 8545
  DAPP_SERVER: 8085,
  WEBSOCKET: 8089,
  GANACHE: 8546,
} as const;

// Duck-typed Resource interface — matches the real one without importing detox
interface ManagedResource {
  start(): Promise<void>;
  stop(): Promise<void>;
  isStarted(): boolean;
  getServerPort(): number;
  setServerPort(port: number): void;
}

// Simple resource tracker
const resources = new Map<string, ManagedResource>();

function registerResource(name: string, resource: ManagedResource) {
  resources.set(name, resource);
}

function getRunning(name: string): ManagedResource | undefined {
  const r = resources.get(name);
  return r?.isStarted() ? r : undefined;
}

async function stopAll(): Promise<string[]> {
  const stopped: string[] = [];
  for (const [name, resource] of resources) {
    if (resource.isStarted()) {
      try {
        await resource.stop();
        stopped.push(name);
      } catch {
        stopped.push(`${name} (error)`);
      }
    }
  }
  resources.clear();
  return stopped;
}

export function createServer() {
  const server = new McpServer({
    name: 'metamask-test-infra',
    version: '0.2.0',
  });

  // ─── Lifecycle ──────────────────────────────────────────────

  server.tool(
    'start_fixture_server',
    'Start a fixture server that serves app state as JSON at GET /state.json. Uses the real FixtureBuilder from metamask-mobile.',
    {
      port: z
        .number()
        .optional()
        .describe(
          `Port to listen on (default: ${FALLBACK_PORTS.FIXTURE_SERVER})`,
        ),
      name: z
        .string()
        .optional()
        .describe('Instance name (default: fixture-server)'),
      recipe: z
        .array(
          z.union([
            z
              .string()
              .describe(
                'Method name with no args (e.g. "withMetaMetricsOptIn")',
              ),
            z.object({
              method: z.string().describe('Method name'),
              args: z
                .any()
                .optional()
                .describe('Arguments to pass to the method'),
            }),
          ]),
        )
        .optional()
        .describe(
          'FixtureBuilder recipe steps — method names from the real FixtureBuilder class.',
        ),
      state: z
        .any()
        .optional()
        .describe('Raw state object to serve (bypasses FixtureBuilder)'),
    },
    async ({ port, name, recipe, state }) => {
      const instanceName = name ?? 'fixture-server';
      const existing = getRunning(instanceName);
      if (existing) {
        return {
          content: [
            {
              type: 'text',
              text: `Fixture server "${instanceName}" is already running on port ${existing.getServerPort()}`,
            },
          ],
        };
      }

      const fixtureServer = new FixtureServer();
      fixtureServer.setServerPort(port ?? FALLBACK_PORTS.FIXTURE_SERVER);
      await fixtureServer.start();

      if (state) {
        fixtureServer.loadJsonState(state, null);
      } else {
        // Use real FixtureBuilder
        let builder = new FixtureBuilder();
        if (recipe) {
          for (const step of recipe) {
            const methodName = typeof step === 'string' ? step : step.method;
            let args = typeof step === 'string' ? undefined : step.args;

            // Resolve network presets: if withNetworkController receives a string,
            // treat it as a preset name (e.g., "anvil", "sepolia", "tenderly-mainnet")
            if (
              methodName === 'withNetworkController' &&
              typeof args === 'string'
            ) {
              const preset = resolveNetworkPreset(args, resources);
              if (!preset) {
                await fixtureServer.stop();
                const available = listNetworkPresets()
                  .map((p) => p.name)
                  .join(', ');
                return {
                  content: [
                    {
                      type: 'text',
                      text: `Unknown network preset: "${args}". Available: ${available}`,
                    },
                  ],
                  isError: true,
                };
              }
              args = preset;
            }

            if (typeof (builder as any)[methodName] !== 'function') {
              await fixtureServer.stop();
              return {
                content: [
                  {
                    type: 'text',
                    text: `Unknown FixtureBuilder method: "${methodName}". Check the FixtureBuilder class for available methods.`,
                  },
                ],
                isError: true,
              };
            }

            builder =
              args !== undefined
                ? (builder as any)[methodName](args)
                : (builder as any)[methodName]();
          }
        }
        const fixture = builder.build();
        fixtureServer.loadJsonState(fixture, null);
      }

      registerResource(instanceName, fixtureServer);

      return {
        content: [
          {
            type: 'text',
            text: `Fixture server "${instanceName}" started on http://localhost:${fixtureServer.getServerPort()} with state loaded`,
          },
        ],
      };
    },
  );

  server.tool(
    'start_local_node',
    'Start a local Anvil Ethereum node. Uses the real AnvilManager from metamask-mobile.',
    {
      port: z.number().optional().describe('Port to listen on (default: 8545)'),
      name: z
        .string()
        .optional()
        .describe('Instance name (default: local-node)'),
      chainId: z.number().optional().describe('Chain ID (default: 1337)'),
      hardfork: z
        .string()
        .optional()
        .describe('Hardfork name (default: prague)'),
      balance: z
        .number()
        .optional()
        .describe('Initial balance per account in ETH (default: 1000)'),
    },
    async ({ port, name, chainId, hardfork, balance }) => {
      const instanceName = name ?? 'local-node';
      const existing = getRunning(instanceName);
      if (existing) {
        return {
          content: [
            {
              type: 'text',
              text: `Local node "${instanceName}" is already running on port ${existing.getServerPort()}`,
            },
          ],
        };
      }

      const anvil = new AnvilManager();
      const nodePort = port ?? FALLBACK_PORTS.ANVIL;
      anvil.setServerPort(nodePort);
      anvil.setStartOptions({
        ...(chainId !== undefined && { chainId }),
        ...(hardfork !== undefined && { hardfork: hardfork as any }),
        ...(balance !== undefined && { balance }),
      });

      await anvil.start();
      registerResource(instanceName, anvil as unknown as ManagedResource);

      let accountsInfo = '';
      try {
        const accounts = await anvil.getAccounts();
        accountsInfo = `\nAccounts (${accounts.length}): ${accounts.slice(0, 3).join(', ')}${accounts.length > 3 ? '...' : ''}`;
      } catch {
        /* ignore */
      }

      return {
        content: [
          {
            type: 'text',
            text: `Local Anvil node "${instanceName}" started on http://127.0.0.1:${nodePort} (chainId: ${chainId ?? 1337})${accountsInfo}`,
          },
        ],
      };
    },
  );

  server.tool(
    'start_websocket_server',
    'Start a WebSocket server for push notifications.',
    {
      port: z.number().optional().describe('Port to listen on (default: 8089)'),
      name: z
        .string()
        .optional()
        .describe('Instance name (default: websocket-server)'),
    },
    async ({ port, name }) => {
      const instanceName = name ?? 'websocket-server';
      const existing = getRunning(instanceName);
      if (existing) {
        return {
          content: [
            {
              type: 'text',
              text: `WebSocket server "${instanceName}" is already running on port ${existing.getServerPort()}`,
            },
          ],
        };
      }

      const wsServer = new LocalWebSocketServer(instanceName);
      wsServer.setServerPort(port ?? FALLBACK_PORTS.WEBSOCKET);
      await wsServer.start();
      registerResource(instanceName, wsServer as unknown as ManagedResource);

      return {
        content: [
          {
            type: 'text',
            text: `WebSocket server "${instanceName}" started on ws://localhost:${wsServer.getServerPort()}`,
          },
        ],
      };
    },
  );

  server.tool(
    'stop_resource',
    'Stop a running resource by name.',
    { name: z.string().describe('Name of the resource to stop') },
    async ({ name }) => {
      const resource = resources.get(name);
      if (!resource) {
        return {
          content: [
            { type: 'text', text: `No resource found with name "${name}"` },
          ],
          isError: true,
        };
      }
      if (resource.isStarted()) await resource.stop();
      resources.delete(name);
      return { content: [{ type: 'text', text: `Stopped "${name}"` }] };
    },
  );

  server.tool(
    'stop_all',
    'Stop all running resources and clean up.',
    {},
    async () => {
      const stopped = await stopAll();
      if (stopped.length === 0) {
        return {
          content: [{ type: 'text', text: 'No resources were running' }],
        };
      }
      return {
        content: [
          {
            type: 'text',
            text: `Stopped ${stopped.length} resources: ${stopped.join(', ')}`,
          },
        ],
      };
    },
  );

  server.tool(
    'list_resources',
    'List all managed resources and their current status.',
    {},
    async () => {
      if (resources.size === 0) {
        return { content: [{ type: 'text', text: 'No resources registered' }] };
      }
      const lines = Array.from(resources.entries()).map(([name, r]) => {
        const status = r.isStarted() ? 'running' : 'stopped';
        const port = r.getServerPort();
        return `${name}: ${status} (port ${port})`;
      });
      return { content: [{ type: 'text', text: lines.join('\n') }] };
    },
  );

  // ─── Queries ────────────────────────────────────────────────

  server.tool(
    'node_get_accounts',
    'Get all accounts on a running local node. Precondition: local node must be running.',
    {
      serverName: z
        .string()
        .optional()
        .describe('Node instance name (default: local-node)'),
    },
    async ({ serverName }) => {
      const name = serverName ?? 'local-node';
      const resource = getRunning(name);
      if (!resource) {
        return {
          content: [
            {
              type: 'text',
              text: `Precondition failed: no local node running with name "${name}".`,
            },
          ],
          isError: true,
        };
      }
      const anvil = resource as unknown as AnvilManager;
      const accounts = await anvil.getAccounts();
      return { content: [{ type: 'text', text: accounts.join('\n') }] };
    },
  );

  server.tool(
    'node_get_balance',
    'Get ETH balance of an account on a running local node.',
    {
      serverName: z
        .string()
        .optional()
        .describe('Node instance name (default: local-node)'),
      address: z
        .string()
        .optional()
        .describe('Account address (defaults to first account)'),
    },
    async ({ serverName, address }) => {
      const name = serverName ?? 'local-node';
      const resource = getRunning(name);
      if (!resource) {
        return {
          content: [
            {
              type: 'text',
              text: `Precondition failed: no local node running with name "${name}".`,
            },
          ],
          isError: true,
        };
      }
      const anvil = resource as unknown as AnvilManager;
      // Use getProvider to query balance
      const { publicClient } = anvil.getProvider();
      const accounts = address ? [address] : await anvil.getAccounts();
      const balance = await publicClient.getBalance({
        address: accounts[0] as `0x${string}`,
      });
      const ethBalance = Number(balance) / 1e18;
      return {
        content: [
          {
            type: 'text',
            text: `${ethBalance % 1 === 0 ? String(ethBalance) : ethBalance.toFixed(4)} ETH`,
          },
        ],
      };
    },
  );

  server.tool(
    'node_set_balance',
    'Set ETH balance of an account on a running local node.',
    {
      serverName: z
        .string()
        .optional()
        .describe('Node instance name (default: local-node)'),
      amount: z.string().describe('Balance in ETH to set'),
      address: z
        .string()
        .optional()
        .describe('Account address (defaults to first account)'),
    },
    async ({ serverName, amount, address }) => {
      const name = serverName ?? 'local-node';
      const resource = getRunning(name);
      if (!resource) {
        return {
          content: [
            {
              type: 'text',
              text: `Precondition failed: no local node running with name "${name}".`,
            },
          ],
          isError: true,
        };
      }
      const anvil = resource as unknown as AnvilManager;
      await anvil.setAccountBalance(
        amount,
        address as `0x${string}` | undefined,
      );
      return {
        content: [{ type: 'text', text: `Balance set to ${amount} ETH` }],
      };
    },
  );

  // ─── Platform Helpers ─────────────────────────────────────

  server.tool(
    'get_ios_launch_args',
    'Get iOS launch arguments with ports for all running resources.',
    {},
    async () => {
      const args: Record<string, number> = {};
      for (const [name, r] of resources) {
        if (!r.isStarted()) continue;
        if (name.includes('fixture'))
          args.fixtureServerPort = r.getServerPort();
        if (name.includes('mock')) args.mockServerPort = r.getServerPort();
        if (name.includes('websocket'))
          args.accountActivityWsPort = r.getServerPort();
      }
      return {
        content: [{ type: 'text', text: JSON.stringify(args, null, 2) }],
      };
    },
  );

  server.tool(
    'get_android_launch_args',
    'Get Android launch arguments with ports for all running resources.',
    {},
    async () => {
      const args: Record<string, number> = {};
      for (const [name, r] of resources) {
        if (!r.isStarted()) continue;
        if (name.includes('fixture'))
          args.fixtureServerPort = r.getServerPort();
        if (name.includes('mock')) args.mockServerPort = r.getServerPort();
        if (name.includes('websocket'))
          args.accountActivityWsPort = r.getServerPort();
      }
      return {
        content: [{ type: 'text', text: JSON.stringify(args, null, 2) }],
      };
    },
  );

  server.tool(
    'setup_android_port_forwarding',
    'Run adb reverse for all running resources so Android device/emulator can reach them.',
    {},
    async () => {
      const running = Array.from(resources.entries()).filter(([, r]) =>
        r.isStarted(),
      );
      if (running.length === 0) {
        return {
          content: [{ type: 'text', text: 'No running resources to forward' }],
        };
      }

      const results: string[] = [];
      for (const [name, r] of running) {
        const port = r.getServerPort();
        try {
          execSync(`adb reverse tcp:${port} tcp:${port}`, { timeout: 5000 });
          results.push(`tcp:${port} → tcp:${port} (${name})`);
        } catch {
          results.push(`FAILED: tcp:${port} (${name})`);
        }
      }

      return {
        content: [
          { type: 'text', text: `Port forwarding:\n${results.join('\n')}` },
        ],
      };
    },
  );

  // ─── Composite Setup ─────────────────────────────────────────

  server.tool(
    'setup_test_environment',
    'One-call test environment setup: stops all resources, starts Anvil node + fixture server, wires platform ports, and returns flow file paths. Replaces 5-6 sequential calls.',
    {
      platform: z.enum(['android', 'ios']).describe('Target platform'),
      recipe: z
        .array(
          z.union([
            z.string().describe('Method name with no args'),
            z.object({
              method: z.string().describe('Method name'),
              args: z.any().optional().describe('Arguments'),
            }),
          ]),
        )
        .optional()
        .describe(
          'Additional FixtureBuilder recipe steps (withNetworkController for the preset is auto-prepended)',
        ),
      networkPreset: z
        .string()
        .optional()
        .describe('Network preset name (default: "anvil"). Set to "" to skip.'),
      anvilPort: z
        .number()
        .optional()
        .describe(`Anvil port (default: ${FALLBACK_PORTS.ANVIL})`),
      fixturePort: z
        .number()
        .optional()
        .describe(
          `Fixture server port (default: ${FALLBACK_PORTS.FIXTURE_SERVER})`,
        ),
    },
    async ({ platform, recipe, networkPreset, anvilPort, fixturePort }) => {
      const results: string[] = [];

      // 1. Stop all existing resources
      const stopped = await stopAll();
      if (stopped.length > 0) {
        results.push(
          `Stopped ${stopped.length} resources: ${stopped.join(', ')}`,
        );
      }

      // 2. Start Anvil node
      const nodePort = anvilPort ?? FALLBACK_PORTS.ANVIL;
      const anvil = new AnvilManager();
      anvil.setServerPort(nodePort);
      await anvil.start();
      registerResource('local-node', anvil as unknown as ManagedResource);
      results.push(`Anvil node started on port ${nodePort}`);

      // 3. Get accounts
      let accounts: string[] = [];
      try {
        accounts = await anvil.getAccounts();
      } catch {
        /* ignore */
      }

      // 4. Build recipe with network preset auto-prepended
      const fullRecipe: (string | { method: string; args?: any })[] = [];
      const preset = networkPreset ?? 'anvil';
      if (preset !== '') {
        fullRecipe.push({ method: 'withNetworkController', args: preset });
      }
      if (recipe) {
        fullRecipe.push(...recipe);
      }

      // 5. Start fixture server
      const fPort = fixturePort ?? FALLBACK_PORTS.FIXTURE_SERVER;
      const fixtureServer = new FixtureServer();
      fixtureServer.setServerPort(fPort);
      await fixtureServer.start();

      let builder = new FixtureBuilder();
      for (const step of fullRecipe) {
        const methodName = typeof step === 'string' ? step : step.method;
        let args = typeof step === 'string' ? undefined : step.args;

        if (
          methodName === 'withNetworkController' &&
          typeof args === 'string'
        ) {
          const resolved = resolveNetworkPreset(args, resources);
          if (!resolved) {
            await fixtureServer.stop();
            const available = listNetworkPresets()
              .map((p) => p.name)
              .join(', ');
            return {
              content: [
                {
                  type: 'text',
                  text: `Unknown network preset: "${args}". Available: ${available}`,
                },
              ],
              isError: true,
            };
          }
          args = resolved;
        }

        if (typeof (builder as any)[methodName] !== 'function') {
          await fixtureServer.stop();
          return {
            content: [
              {
                type: 'text',
                text: `Unknown FixtureBuilder method: "${methodName}"`,
              },
            ],
            isError: true,
          };
        }

        builder =
          args !== undefined
            ? (builder as any)[methodName](args)
            : (builder as any)[methodName]();
      }

      const fixture = builder.build();
      fixtureServer.loadJsonState(fixture, null);
      registerResource('fixture-server', fixtureServer);
      results.push(`Fixture server started on port ${fPort}`);

      // 6. Platform wiring
      if (platform === 'android') {
        const running = Array.from(resources.entries()).filter(([, r]) =>
          r.isStarted(),
        );
        const portResults: string[] = [];
        for (const [name, r] of running) {
          const port = r.getServerPort();
          try {
            execSync(`adb reverse tcp:${port} tcp:${port}`, { timeout: 5000 });
            portResults.push(`tcp:${port} (${name})`);
          } catch {
            portResults.push(`FAILED: tcp:${port} (${name})`);
          }
        }
        results.push(`Port forwarding: ${portResults.join(', ')}`);
      }

      // 7. Resolve flow file paths
      const flowsDir = resolve(
        dirname(fileURLToPath(import.meta.url)),
        'flows',
      );
      const launchFlow =
        platform === 'ios'
          ? resolve(flowsDir, 'ios-launch-and-unlock.yaml')
          : resolve(flowsDir, 'android-launch-and-unlock.yaml');
      const sendFlow = resolve(flowsDir, 'send-eth-to-account.yaml');
      const fullFlow =
        platform === 'ios'
          ? resolve(flowsDir, 'send-eth-full-ios.yaml')
          : resolve(flowsDir, 'send-eth-full-android.yaml');

      return {
        content: [
          {
            type: 'text',
            text: [
              ...results,
              '',
              `Platform: ${platform}`,
              `Accounts: ${accounts.slice(0, 3).join(', ')}${accounts.length > 3 ? '...' : ''}`,
              '',
              'Flow files:',
              `  launch: ${launchFlow}`,
              `  send:   ${sendFlow}`,
              `  full:   ${fullFlow}`,
              '',
              `Next: run_flow_files with the launch flow, then your test flow.`,
            ].join('\n'),
          },
        ],
      };
    },
  );

  // ─── Recipe Discovery ──────────────────────────────────────

  server.tool(
    'list_recipes',
    'List all available FixtureBuilder methods that can be used as recipe steps.',
    {},
    async () => {
      // Get all "with*" methods from FixtureBuilder prototype
      const builder = new FixtureBuilder();
      const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(builder))
        .filter(
          (m) =>
            m.startsWith('with') && typeof (builder as any)[m] === 'function',
        )
        .sort();

      return {
        content: [
          {
            type: 'text',
            text: `Available FixtureBuilder methods (${methods.length}):\n${methods.map((m) => `  - ${m}`).join('\n')}`,
          },
        ],
      };
    },
  );

  server.tool(
    'list_network_presets',
    'List all available network presets that can be used as shorthand with withNetworkController (e.g., "anvil", "sepolia", "tenderly-mainnet"). Dynamic presets auto-detect ports from running resources.',
    {},
    async () => {
      const presets = listNetworkPresets();
      const lines = presets.map((p) => {
        const tag = p.dynamic ? ' (dynamic)' : '';
        return `  ${p.name} — ${p.nickname} [${p.chainId}]${tag}`;
      });
      return {
        content: [
          {
            type: 'text',
            text: `Available network presets (${presets.length}):\n${lines.join('\n')}\n\nUsage in recipe: { method: "withNetworkController", args: "anvil" }`,
          },
        ],
      };
    },
  );

  return server;
}
