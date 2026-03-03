import type { Approval } from '@metamask/phishing-controller';
import Engine from '../../../../core/Engine';
import { SUPPORTED_CHAIN_IDS, CHAIN_DISPLAY_NAMES } from '../constants/chains';
import { ApprovalItem, ApprovalAssetType, Verdict } from '../types';
import { fetchMockApprovals } from './mockApprovals';

// TODO: Remove this flag before merging – set to true to use live PhishingController data
const USE_MOCK_DATA = false;
const MAX_UINT256 =
  '115792089237316195423570985008687907853269984665640564039457584007913129639935';

function isUnlimitedAllowance(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.toLowerCase() === 'unlimited') return true;
  if (trimmed === MAX_UINT256) return true;
  // Some contracts use slightly different large values; treat anything 70+ digits as unlimited
  if (/^\d+$/.test(trimmed) && trimmed.length >= 70) return true;
  return false;
}

function mapVerdict(verdict: string): Verdict {
  switch (verdict) {
    case 'Malicious':
      return Verdict.Malicious;
    case 'Warning':
      return Verdict.Warning;
    case 'Benign':
      return Verdict.Benign;
    case 'Error':
      return Verdict.Error;
    default:
      return Verdict.Benign;
  }
}

function mapAssetType(type?: string): ApprovalAssetType | undefined {
  if (!type) return undefined;
  switch (type.toUpperCase()) {
    case 'ERC20':
      return ApprovalAssetType.ERC20;
    case 'ERC721':
      return ApprovalAssetType.ERC721;
    case 'ERC1155':
      return ApprovalAssetType.ERC1155;
    default:
      return undefined;
  }
}

function parseNumericString(value: string | number | undefined): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function mapApprovalToItem(approval: Approval, chainId: string): ApprovalItem {
  const verdict = mapVerdict(approval.verdict);
  const legacyAllowance = approval.allowance as {
    amount?: string;
    is_unlimited?: boolean;
  };
  const allowanceValue =
    approval.allowance?.value ?? legacyAllowance.amount ?? '';
  const legacyFeatures = (
    approval as {
      features?: { feature_id: string; type?: string; description: string }[];
    }
  ).features;
  const exposureUsd =
    // New phishing-controller shape
    parseNumericString(approval.exposure?.usd_price) ||
    // Backward-compatible fallback for older payloads
    parseNumericString((approval.exposure as { usd?: string | number })?.usd);

  return {
    id: `${chainId}-${approval.asset.address}-${approval.spender.address}`,
    chainId,
    chainName: CHAIN_DISPLAY_NAMES[chainId] ?? chainId,
    asset: {
      address: approval.asset.address,
      symbol: approval.asset.symbol,
      name: approval.asset.name,
      decimals: approval.asset.decimals,
      logo_url: approval.asset.logo_url,
      type: mapAssetType(approval.asset.type),
    },
    spender: {
      address: approval.spender.address,
      label: approval.spender.label,
      is_verified: (approval.spender as { is_verified?: boolean }).is_verified,
      features: (approval.spender.features ?? legacyFeatures ?? []).map(
        (f) => ({
          id: f.feature_id,
          type: f.type,
          description: f.description,
        }),
      ),
      verdict,
      exposure_usd: exposureUsd,
    },
    allowance: {
      amount: allowanceValue,
      is_unlimited:
        legacyAllowance.is_unlimited === true ||
        isUnlimitedAllowance(allowanceValue),
    },
    verdict,
    exposure_usd: exposureUsd,
  };
}

export interface FetchAllApprovalsResult {
  approvals: ApprovalItem[];
  chainErrors: Record<string, string>;
}

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

async function fetchChainWithRetry(
  controller: {
    getApprovals: (
      chainId: string,
      address: string,
    ) => Promise<{ approvals: Approval[] }>;
  },
  chainId: string,
  address: string,
): Promise<{ approvals: Approval[] }> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await controller.getApprovals(chainId, address);
    } catch (err) {
      lastError = err;
      if (attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      }
    }
  }
  throw lastError;
}

export async function fetchAllApprovals(
  address: string,
): Promise<FetchAllApprovalsResult> {
  if (USE_MOCK_DATA) {
    return fetchMockApprovals();
  }

  const { PhishingController } = Engine.context;

  const results = await Promise.allSettled(
    SUPPORTED_CHAIN_IDS.map((chainId) =>
      fetchChainWithRetry(PhishingController, chainId, address),
    ),
  );

  const allApprovals: ApprovalItem[] = [];
  const chainErrors: Record<string, string> = {};

  results.forEach((result, index) => {
    const chainId = SUPPORTED_CHAIN_IDS[index];
    const chainName = CHAIN_DISPLAY_NAMES[chainId] ?? chainId;

    if (result.status === 'fulfilled') {
      const rawApprovals = result.value.approvals;

      const items = rawApprovals.map((approval) =>
        mapApprovalToItem(approval, chainId),
      );
      allApprovals.push(...items);
    } else {
      chainErrors[chainId] =
        result.reason?.message ?? `Failed to fetch approvals for ${chainName}`;
    }
  });

  return { approvals: allApprovals, chainErrors };
}
