import type { Approval } from '@metamask/phishing-controller';
import Engine from '../../../../core/Engine';
import { SUPPORTED_CHAIN_IDS, CHAIN_DISPLAY_NAMES } from '../constants/chains';
import { ApprovalItem, ApprovalAssetType, Verdict } from '../types';
import { fetchMockApprovals } from './mockApprovals';

// TODO: Remove this flag before merging – set to true to use live PhishingController data
const USE_MOCK_DATA = true;

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

function mapApprovalToItem(approval: Approval, chainId: string): ApprovalItem {
  const verdict = mapVerdict(approval.verdict);

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
      is_verified: approval.spender.is_verified,
      features: (approval.features ?? []).map((f) => ({
        id: f.feature_id,
        type: f.type,
        description: f.description,
      })),
      verdict,
      exposure_usd: approval.exposure.usd,
    },
    allowance: {
      amount: approval.allowance.amount,
      is_unlimited: approval.allowance.is_unlimited,
    },
    verdict,
    exposure_usd: approval.exposure.usd ?? 0,
  };
}

export interface FetchAllApprovalsResult {
  approvals: ApprovalItem[];
  chainErrors: Record<string, string>;
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
      PhishingController.getApprovals(chainId, address),
    ),
  );

  const allApprovals: ApprovalItem[] = [];
  const chainErrors: Record<string, string> = {};

  results.forEach((result, index) => {
    const chainId = SUPPORTED_CHAIN_IDS[index];

    if (result.status === 'fulfilled') {
      const items = result.value.approvals.map((approval) =>
        mapApprovalToItem(approval, chainId),
      );
      allApprovals.push(...items);
    } else {
      chainErrors[chainId] =
        result.reason?.message ??
        `Failed to fetch approvals for ${CHAIN_DISPLAY_NAMES[chainId] ?? chainId}`;
    }
  });

  return { approvals: allApprovals, chainErrors };
}
