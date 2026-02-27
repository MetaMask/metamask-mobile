import { ApprovalItem, ApprovalAssetType, Verdict } from '../types';
import { FetchAllApprovalsResult } from './fetchApprovals';

const MOCK_APPROVALS: ApprovalItem[] = [
  // ── MALICIOUS ──────────────────────────────────────────────
  {
    id: '0x1-0xdac17f958d2ee523a2206206994597c13d831ec7-0xdead00000000000000000000000000000000beef',
    chainId: '0x1',
    chainName: 'ethereum',
    asset: {
      address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
      symbol: 'USDT',
      name: 'Tether USD',
      decimals: 6,
      type: ApprovalAssetType.ERC20,
    },
    spender: {
      address: '0xdead00000000000000000000000000000000beef',
      label: 'Fake_Uniswap_Router',
      is_contract: true,
      features: [
        { id: 'phishing', description: 'Known phishing contract' },
        { id: 'drain', description: 'Has drained funds from other wallets' },
        { id: 'unverified', description: 'Contract source code not verified' },
      ],
      verdict: Verdict.Malicious,
      exposure_usd: 8250,
    },
    allowance: { amount: '0', is_unlimited: true },
    verdict: Verdict.Malicious,
    exposure_usd: 8250,
  },
  {
    id: '0x1-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48-0xbad0000000000000000000000000000000000bad',
    chainId: '0x1',
    chainName: 'ethereum',
    asset: {
      address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      type: ApprovalAssetType.ERC20,
    },
    spender: {
      address: '0xbad0000000000000000000000000000000000bad',
      is_contract: true,
      features: [
        { id: 'honeypot', description: 'Identified as honeypot contract' },
        {
          id: 'new_contract',
          description: 'Contract deployed less than 7 days ago',
        },
      ],
      verdict: Verdict.Malicious,
      exposure_usd: 4200,
    },
    allowance: { amount: '0', is_unlimited: true },
    verdict: Verdict.Malicious,
    exposure_usd: 4200,
  },
  {
    id: '0x89-0x2791bca1f2de4661ed88a30c99a7a9449aa84174-0xscam0000000000000000000000000000000001',
    chainId: '0x89',
    chainName: 'polygon',
    asset: {
      address: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
      symbol: 'USDC.e',
      name: 'Bridged USDC (Polygon)',
      decimals: 6,
      type: ApprovalAssetType.ERC20,
    },
    spender: {
      address: '0x5ca10000000000000000000000000000000000001',
      label: 'Airdrop Scam Contract',
      is_contract: true,
      features: [
        {
          id: 'airdrop_scam',
          description: 'Linked to fraudulent airdrop campaign',
        },
      ],
      verdict: Verdict.Malicious,
      exposure_usd: 1350,
    },
    allowance: { amount: '0', is_unlimited: true },
    verdict: Verdict.Malicious,
    exposure_usd: 1350,
  },

  // ── WARNING ────────────────────────────────────────────────
  {
    id: '0x1-0x6b175474e89094c44da98b954eedeac495271d0f-0x1111111254eeb25477b68fb85ed929f73a960582',
    chainId: '0x1',
    chainName: 'ethereum',
    asset: {
      address: '0x6b175474e89094c44da98b954eedeac495271d0f',
      symbol: 'DAI',
      name: 'Dai Stablecoin',
      decimals: 18,
      type: ApprovalAssetType.ERC20,
    },
    spender: {
      address: '0x1111111254eeb25477b68fb85ed929f73a960582',
      label: '1inch v5 Router',
      is_contract: true,
      features: [
        { id: 'unlimited', description: 'Unlimited approval granted' },
        {
          id: 'upgradeable',
          description: 'Contract is upgradeable (proxy pattern)',
        },
      ],
      verdict: Verdict.Warning,
      exposure_usd: 15700,
    },
    allowance: { amount: '0', is_unlimited: true },
    verdict: Verdict.Warning,
    exposure_usd: 15700,
  },
  {
    id: '0xa4b1-0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9-0x000unknown0000000000000000000000000002',
    chainId: '0xa4b1',
    chainName: 'arbitrum',
    asset: {
      address: '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9',
      symbol: 'USDT',
      name: 'Tether USD (Arbitrum)',
      decimals: 6,
      type: ApprovalAssetType.ERC20,
    },
    spender: {
      address: '0x000000000000000000000000000000000000002',
      is_contract: true,
      features: [
        {
          id: 'dormant',
          description: 'Contract has been dormant for 180+ days',
        },
        { id: 'unlimited', description: 'Unlimited approval granted' },
      ],
      verdict: Verdict.Warning,
      exposure_usd: 920,
    },
    allowance: { amount: '0', is_unlimited: true },
    verdict: Verdict.Warning,
    exposure_usd: 920,
  },
  {
    id: '0x1-0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d-0x00000000006c3852cbef3e08e8df289169ede581',
    chainId: '0x1',
    chainName: 'ethereum',
    asset: {
      address: '0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d',
      symbol: 'BAYC',
      name: 'Bored Ape Yacht Club',
      decimals: 0,
      type: ApprovalAssetType.ERC721,
    },
    spender: {
      address: '0x00000000006c3852cbef3e08e8df289169ede581',
      label: 'OpenSea Seaport',
      is_contract: true,
      features: [
        { id: 'nft_marketplace', description: 'NFT marketplace contract' },
        {
          id: 'setApprovalForAll',
          description: 'Full collection approval (setApprovalForAll)',
        },
      ],
      verdict: Verdict.Warning,
      exposure_usd: 52000,
    },
    allowance: { amount: 'All tokens', is_unlimited: true },
    verdict: Verdict.Warning,
    exposure_usd: 52000,
  },

  // ── BENIGN ─────────────────────────────────────────────────
  {
    id: '0x1-0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2-0x7a250d5630b4cf539739df2c5dacb4c659f2488d',
    chainId: '0x1',
    chainName: 'ethereum',
    asset: {
      address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
      symbol: 'WETH',
      name: 'Wrapped Ether',
      decimals: 18,
      type: ApprovalAssetType.ERC20,
    },
    spender: {
      address: '0x7a250d5630b4cf539739df2c5dacb4c659f2488d',
      label: 'Uniswap V2 Router',
      is_contract: true,
      features: [
        { id: 'verified', description: 'Contract source code verified' },
        { id: 'audited', description: 'Has been audited by Trail of Bits' },
      ],
      verdict: Verdict.Benign,
      exposure_usd: 3200,
    },
    allowance: { amount: '5.0', is_unlimited: false },
    verdict: Verdict.Benign,
    exposure_usd: 3200,
  },
  {
    id: '0x1-0x514910771af9ca656af840dff83e8264ecf986ca-0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45',
    chainId: '0x1',
    chainName: 'ethereum',
    asset: {
      address: '0x514910771af9ca656af840dff83e8264ecf986ca',
      symbol: 'LINK',
      name: 'ChainLink Token',
      decimals: 18,
      type: ApprovalAssetType.ERC20,
    },
    spender: {
      address: '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45',
      label: 'Uniswap V3 Router 2',
      is_contract: true,
      features: [
        { id: 'verified', description: 'Contract source code verified' },
      ],
      verdict: Verdict.Benign,
      exposure_usd: 780,
    },
    allowance: { amount: '0', is_unlimited: true },
    verdict: Verdict.Benign,
    exposure_usd: 780,
  },
  {
    id: '0x2105-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913-0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad',
    chainId: '0x2105',
    chainName: 'base',
    asset: {
      address: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
      symbol: 'USDC',
      name: 'USD Coin (Base)',
      decimals: 6,
      type: ApprovalAssetType.ERC20,
    },
    spender: {
      address: '0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad',
      label: 'Uniswap Universal Router',
      is_contract: true,
      features: [
        { id: 'verified', description: 'Contract source code verified' },
        { id: 'audited', description: 'Has been audited' },
      ],
      verdict: Verdict.Benign,
      exposure_usd: 500,
    },
    allowance: { amount: '1000', is_unlimited: false },
    verdict: Verdict.Benign,
    exposure_usd: 500,
  },
  {
    id: '0xa-0x4200000000000000000000000000000000000006-0xe592427a0aece92de3edee1f18e0157c05861564',
    chainId: '0xa',
    chainName: 'optimism',
    asset: {
      address: '0x4200000000000000000000000000000000000006',
      symbol: 'WETH',
      name: 'Wrapped Ether (Optimism)',
      decimals: 18,
      type: ApprovalAssetType.ERC20,
    },
    spender: {
      address: '0xe592427a0aece92de3edee1f18e0157c05861564',
      label: 'Uniswap V3 Router',
      is_contract: true,
      features: [
        { id: 'verified', description: 'Contract source code verified' },
      ],
      verdict: Verdict.Benign,
      exposure_usd: 1100,
    },
    allowance: { amount: '2.5', is_unlimited: false },
    verdict: Verdict.Benign,
    exposure_usd: 1100,
  },
  {
    id: '0x38-0x55d398326f99059ff775485246999027b3197955-0x10ed43c718714eb63d5aa57b78b54704e256024e',
    chainId: '0x38',
    chainName: 'bsc',
    asset: {
      address: '0x55d398326f99059ff775485246999027b3197955',
      symbol: 'USDT',
      name: 'Tether USD (BSC)',
      decimals: 18,
      type: ApprovalAssetType.ERC20,
    },
    spender: {
      address: '0x10ed43c718714eb63d5aa57b78b54704e256024e',
      label: 'PancakeSwap Router',
      is_contract: true,
      features: [
        { id: 'verified', description: 'Contract source code verified' },
        { id: 'high_volume', description: 'High transaction volume' },
      ],
      verdict: Verdict.Benign,
      exposure_usd: 340,
    },
    allowance: { amount: '0', is_unlimited: true },
    verdict: Verdict.Benign,
    exposure_usd: 340,
  },
  {
    id: '0xe708-0xa219439258ca9da29e9cc4ce5596924745e12b93-0x272e156df8da513bdcc65a4f467090c2402a828',
    chainId: '0xe708',
    chainName: 'linea',
    asset: {
      address: '0xa219439258ca9da29e9cc4ce5596924745e12b93',
      symbol: 'USDT',
      name: 'Tether USD (Linea)',
      decimals: 6,
      type: ApprovalAssetType.ERC20,
    },
    spender: {
      address: '0x272e156df8da513bdcc65a4f467090c2402a828',
      label: 'SyncSwap Router',
      is_contract: true,
      features: [
        { id: 'verified', description: 'Contract source code verified' },
      ],
      verdict: Verdict.Benign,
      exposure_usd: 210,
    },
    allowance: { amount: '500', is_unlimited: false },
    verdict: Verdict.Benign,
    exposure_usd: 210,
  },
];

/**
 * Returns mock approval data with a simulated network delay.
 * Showcases: 3 malicious, 3 warning, 6 benign across 6 chains.
 */
export async function fetchMockApprovals(): Promise<FetchAllApprovalsResult> {
  // Simulate network latency so you can see the skeleton loading
  await new Promise((resolve) => setTimeout(resolve, 1500));

  return {
    approvals: MOCK_APPROVALS,
    chainErrors: {
      // Simulate one chain failing so the partial-error UI is testable
      '0xa86a': 'Failed to fetch approvals for avalanche: 503',
    },
  };
}
