import { ApprovalItem, ApprovalAssetType, Verdict } from '../types';
import { FetchAllApprovalsResult } from './fetchApprovals';

/**
 * Real approval data from 1xengineer.eth on Ethereum mainnet.
 * These use actual on-chain contract addresses so revoke transactions will work.
 */
const MOCK_APPROVALS: ApprovalItem[] = [
  // ── MALICIOUS ──────────────────────────────────────────────
  {
    id: '0x1-0xA9E8aCf069C58aEc8825542845Fd754e41a9489A-0xA6B816010Ab51e088C4F19c71ABa87E54b422E14',
    chainId: '0x1',
    chainName: 'ethereum',
    asset: {
      address: '0xA9E8aCf069C58aEc8825542845Fd754e41a9489A',
      symbol: 'PEPECOIN',
      name: 'PepeCoin',
      decimals: 18,
      type: ApprovalAssetType.ERC20,
    },
    spender: {
      address: '0xA6B816010Ab51e088C4F19c71ABa87E54b422E14',
      is_verified: false,
      features: [
        { id: 'unverified', description: 'Contract source code not verified' },
        {
          id: 'dormant',
          description: 'Contract has been dormant for 180+ days',
        },
      ],
      verdict: Verdict.Malicious,
      exposure_usd: 0,
    },
    allowance: { amount: '0', is_unlimited: true },
    verdict: Verdict.Malicious,
    exposure_usd: 0,
    last_updated: '12/25/2023 02:06:59 PM',
  },

  // ── WARNING ────────────────────────────────────────────────
  {
    id: '0x1-0xf590D1613A05aF39F1d64b7C65812fb3B06015ef-0x1E0049783F008A0085193E00003D00cd54003c71',
    chainId: '0x1',
    chainName: 'ethereum',
    asset: {
      address: '0xf590D1613A05aF39F1d64b7C65812fb3B06015ef',
      symbol: 'KEKSPACE',
      name: 'Kekspace: Christmas Cr...',
      decimals: 0,
      type: ApprovalAssetType.ERC1155,
    },
    spender: {
      address: '0x1E0049783F008A0085193E00003D00cd54003c71',
      label: 'OpenSea',
      is_verified: true,
      features: [
        { id: 'nft_marketplace', description: 'NFT marketplace contract' },
        {
          id: 'setApprovalForAll',
          description: 'Full collection approval (setApprovalForAll)',
        },
      ],
      verdict: Verdict.Warning,
      exposure_usd: 0,
    },
    allowance: { amount: 'All tokens', is_unlimited: true },
    verdict: Verdict.Warning,
    exposure_usd: 0,
    last_updated: '12/05/2024 05:33:23 PM',
  },
  {
    id: '0x1-0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2-0x1E0049783F008A0085193E00003D00cd54003c71',
    chainId: '0x1',
    chainName: 'ethereum',
    asset: {
      address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      symbol: 'WETH',
      name: 'Wrapped Ether',
      decimals: 18,
      type: ApprovalAssetType.ERC20,
    },
    spender: {
      address: '0x1E0049783F008A0085193E00003D00cd54003c71',
      label: 'OpenSea',
      is_verified: true,
      features: [
        { id: 'nft_marketplace', description: 'NFT marketplace contract' },
        { id: 'unlimited', description: 'Unlimited approval granted' },
      ],
      verdict: Verdict.Warning,
      exposure_usd: 0,
    },
    allowance: { amount: '0', is_unlimited: true },
    verdict: Verdict.Warning,
    exposure_usd: 0,
    last_updated: '12/05/2024 05:32:11 PM',
  },
  {
    id: '0x1-0x0f689C9A84B9541CEED15693BDfD1419C2e9dC72-0x1E0049783F008A0085193E00003D00cd54003c71',
    chainId: '0x1',
    chainName: 'ethereum',
    asset: {
      address: '0x0f689C9A84B9541CEED15693BDfD1419C2e9dC72',
      symbol: 'KEKSPACE',
      name: 'Kekspace: Coal Pepe',
      decimals: 0,
      type: ApprovalAssetType.ERC1155,
    },
    spender: {
      address: '0x1E0049783F008A0085193E00003D00cd54003c71',
      label: 'OpenSea',
      is_verified: true,
      features: [
        { id: 'nft_marketplace', description: 'NFT marketplace contract' },
        {
          id: 'setApprovalForAll',
          description: 'Full collection approval (setApprovalForAll)',
        },
      ],
      verdict: Verdict.Warning,
      exposure_usd: 0,
    },
    allowance: { amount: 'All tokens', is_unlimited: true },
    verdict: Verdict.Warning,
    exposure_usd: 0,
    last_updated: '12/05/2024 05:31:59 PM',
  },

  // ── BENIGN ─────────────────────────────────────────────────
  {
    id: '0x1-0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48-0x000000000022D473030F116dDEE9F6B43aC78BA3',
    chainId: '0x1',
    chainName: 'ethereum',
    asset: {
      address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      type: ApprovalAssetType.ERC20,
    },
    spender: {
      address: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
      label: 'Permit2',
      is_verified: true,
      features: [
        { id: 'verified', description: 'Contract source code verified' },
        { id: 'unlimited', description: 'Unlimited approval granted' },
      ],
      verdict: Verdict.Benign,
      exposure_usd: 16.92,
    },
    allowance: { amount: '0', is_unlimited: true },
    verdict: Verdict.Benign,
    exposure_usd: 16.92,
    last_updated: '02/28/2026 11:12:23 PM',
  },
  {
    id: '0x1-0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2-0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    chainId: '0x1',
    chainName: 'ethereum',
    asset: {
      address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      symbol: 'WETH',
      name: 'Wrapped Ether',
      decimals: 18,
      type: ApprovalAssetType.ERC20,
    },
    spender: {
      address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      label: 'Zeroex',
      is_verified: true,
      features: [
        { id: 'verified', description: 'Contract source code verified' },
        { id: 'unlimited', description: 'Unlimited approval granted' },
      ],
      verdict: Verdict.Benign,
      exposure_usd: 0,
    },
    allowance: { amount: '0', is_unlimited: true },
    verdict: Verdict.Benign,
    exposure_usd: 0,
    last_updated: '12/05/2024 05:34:35 PM',
  },
  {
    id: '0x1-0x44971ABF0251958492FeE97dA3e5C5adA88B9185-0x000000000022D473030F116dDEE9F6B43aC78BA3',
    chainId: '0x1',
    chainName: 'ethereum',
    asset: {
      address: '0x44971ABF0251958492FeE97dA3e5C5adA88B9185',
      symbol: 'BASEDAI',
      name: 'BasedAI',
      decimals: 18,
      type: ApprovalAssetType.ERC20,
    },
    spender: {
      address: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
      label: 'Permit2',
      is_verified: true,
      features: [
        { id: 'verified', description: 'Contract source code verified' },
        { id: 'unlimited', description: 'Unlimited approval granted' },
      ],
      verdict: Verdict.Benign,
      exposure_usd: 0,
    },
    allowance: { amount: '0', is_unlimited: true },
    verdict: Verdict.Benign,
    exposure_usd: 0,
    last_updated: '12/05/2024 05:29:11 PM',
  },
  {
    id: '0x1-0xA9E8aCf069C58aEc8825542845Fd754e41a9489A-0x000000000022D473030F116dDEE9F6B43aC78BA3',
    chainId: '0x1',
    chainName: 'ethereum',
    asset: {
      address: '0xA9E8aCf069C58aEc8825542845Fd754e41a9489A',
      symbol: 'PEPECOIN',
      name: 'PepeCoin',
      decimals: 18,
      type: ApprovalAssetType.ERC20,
    },
    spender: {
      address: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
      label: 'Permit2',
      is_verified: true,
      features: [
        { id: 'verified', description: 'Contract source code verified' },
        { id: 'unlimited', description: 'Unlimited approval granted' },
      ],
      verdict: Verdict.Benign,
      exposure_usd: 0,
    },
    allowance: { amount: '0', is_unlimited: true },
    verdict: Verdict.Benign,
    exposure_usd: 0,
    last_updated: '12/05/2024 05:26:47 PM',
  },
];

/**
 * Returns real approval data from 1xengineer.eth with a simulated network delay.
 * 1 malicious, 3 warning, 4 benign — all on Ethereum mainnet.
 */
export async function fetchMockApprovals(): Promise<FetchAllApprovalsResult> {
  await new Promise((resolve) => setTimeout(resolve, 1500));

  return {
    approvals: MOCK_APPROVALS,
    chainErrors: {},
  };
}
