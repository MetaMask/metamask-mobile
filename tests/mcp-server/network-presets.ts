/**
 * Network presets for FixtureBuilder.withNetworkController().
 *
 * Static presets are hardcoded configs for well-known networks.
 * Dynamic presets (like "anvil") resolve ports from running resources.
 */

interface ProviderConfig {
  chainId: string;
  rpcUrl: string;
  type: string;
  nickname: string;
  ticker: string;
}

interface ManagedResource {
  isStarted(): boolean;
  getServerPort(): number;
}

// ─── Static Presets ──────────────────────────────────────────

const STATIC_PRESETS: Record<string, ProviderConfig> = {
  // Local development
  anvil: {
    chainId: '0x539',
    rpcUrl: 'http://localhost:8545',
    type: 'custom',
    nickname: 'Local RPC',
    ticker: 'ETH',
  },

  // Testnets
  sepolia: {
    chainId: '0xaa36a7',
    rpcUrl: 'https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
    type: 'custom',
    nickname: 'Sepolia',
    ticker: 'SepoliaETH',
  },
  'linea-sepolia': {
    chainId: '0xe705',
    rpcUrl:
      'https://linea-sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
    type: 'custom',
    nickname: 'Linea Sepolia',
    ticker: 'LineaETH',
  },

  // Tenderly forks (used in swap/bridge/card tests)
  'tenderly-mainnet': {
    chainId: '0x1',
    rpcUrl:
      'https://virtual.mainnet.rpc.tenderly.co/3472e4b3-594b-488a-a8b1-93593194615f',
    type: 'custom',
    nickname: 'Tenderly - Mainnet',
    ticker: 'ETH',
  },
  'tenderly-linea': {
    chainId: '0xe708',
    rpcUrl:
      'https://virtual.linea.rpc.tenderly.co/2c429ceb-43db-45bc-9d84-21a40d21e0d2',
    type: 'custom',
    nickname: 'Linea',
    ticker: 'ETH',
  },
  'tenderly-optimism': {
    chainId: '0xa',
    rpcUrl:
      'https://virtual.optimism.rpc.tenderly.co/3170a58e-fa67-4ccc-9697-b13aff0f5c1a',
    type: 'custom',
    nickname: 'Optimism',
    ticker: 'ETH',
  },
  'tenderly-polygon': {
    chainId: '0x89',
    rpcUrl:
      'https://virtual.polygon.rpc.tenderly.co/e834a81e-69ba-49e9-a6a5-be5b6eea3cdc',
    type: 'custom',
    nickname: 'Polygon',
    ticker: 'POL',
  },

  // Mainnets
  'mainnet-llamarpc': {
    chainId: '0x1',
    rpcUrl: 'https://eth.llamarpc.com',
    type: 'custom',
    nickname: 'Ethereum Mainnet',
    ticker: 'ETH',
  },
  optimism: {
    chainId: '0xa',
    rpcUrl: 'https://mainnet.optimism.io',
    type: 'custom',
    nickname: 'OP Mainnet',
    ticker: 'ETH',
  },
  base: {
    chainId: '0x2105',
    rpcUrl: 'https://mainnet.base.org',
    type: 'custom',
    nickname: 'Base',
    ticker: 'ETH',
  },
  polygon: {
    chainId: '0x89',
    rpcUrl: 'https://polygon-rpc.com',
    type: 'custom',
    nickname: 'Polygon Mainnet',
    ticker: 'POL',
  },
  avalanche: {
    chainId: '0xa86a',
    rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
    type: 'custom',
    nickname: 'Avalanche C-Chain',
    ticker: 'AVAX',
  },
  bnb: {
    chainId: '0x38',
    rpcUrl: 'https://bsc-dataseed.binance.org/',
    type: 'custom',
    nickname: 'BNB Smart Chain',
    ticker: 'BNB',
  },
  linea: {
    chainId: '0xe708',
    rpcUrl: 'https://rpc.linea.build',
    type: 'custom',
    nickname: 'Linea',
    ticker: 'ETH',
  },
};

// ─── Dynamic Resolution ──────────────────────────────────────

/**
 * Resolve a network preset, optionally using running resources to determine ports.
 * - "anvil" / "local" → uses the running local-node's port if available
 * - Any static preset name → returns the hardcoded config
 * - Unknown → returns null
 */
export function resolveNetworkPreset(
  presetName: string,
  resources: Map<string, ManagedResource>,
): ProviderConfig | null {
  const key = presetName.toLowerCase().trim();

  // Dynamic: resolve "anvil" from the running local node
  if (
    key === 'anvil' ||
    key === 'anvil-local' ||
    key === 'local' ||
    key === 'local-rpc'
  ) {
    const localNode = findRunningResource(resources, 'local-node');
    const port = localNode?.getServerPort() ?? 8545;
    return {
      chainId: '0x539',
      rpcUrl: `http://localhost:${port}`,
      type: 'custom',
      nickname: 'Local RPC',
      ticker: 'ETH',
    };
  }

  return STATIC_PRESETS[key] ?? null;
}

function findRunningResource(
  resources: Map<string, ManagedResource>,
  namePrefix: string,
): ManagedResource | undefined {
  for (const [name, r] of resources) {
    if (name.startsWith(namePrefix) && r.isStarted()) return r;
  }
  return undefined;
}

/**
 * List all available preset names with descriptions.
 */
export function listNetworkPresets(): {
  name: string;
  chainId: string;
  nickname: string;
  dynamic: boolean;
}[] {
  const presets: {
    name: string;
    chainId: string;
    nickname: string;
    dynamic: boolean;
  }[] = [
    {
      name: 'anvil',
      chainId: '0x539',
      nickname: 'Local RPC (auto-detects running Anvil port)',
      dynamic: true,
    },
  ];

  for (const [name, config] of Object.entries(STATIC_PRESETS)) {
    if (name === 'anvil') continue;
    presets.push({
      name,
      chainId: config.chainId,
      nickname: config.nickname,
      dynamic: false,
    });
  }

  return presets;
}
