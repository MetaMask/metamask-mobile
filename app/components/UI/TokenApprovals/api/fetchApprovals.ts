import AppConstants from '../../../../core/AppConstants';
import {
  CHAIN_ID_TO_BLOCKAID_NAME,
  SUPPORTED_CHAIN_IDS,
} from '../constants/chains';
import { APPROVALS_API_ENDPOINT } from '../constants/approvals';
import {
  ApprovalItem,
  ApprovalAssetType,
  BlockaidApprovalResponse,
  Verdict,
} from '../types';

function getApiUrl(endpoint: string): string {
  const host = AppConstants.SECURITY_ALERTS_API.URL;
  if (!host) {
    throw new Error('Security alerts API URL is not set');
  }
  return `${host}/${endpoint}`;
}

async function fetchChainApprovals(
  address: string,
  chainName: string,
): Promise<BlockaidApprovalResponse> {
  const url = getApiUrl(APPROVALS_API_ENDPOINT);

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      address,
      chain: chainName,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Approvals API request failed for ${chainName}: ${response.status}`,
    );
  }

  return response.json();
}

function normalizeVerdict(verdict: string): Verdict {
  switch (verdict.toLowerCase()) {
    case 'malicious':
      return Verdict.Malicious;
    case 'warning':
      return Verdict.Warning;
    default:
      return Verdict.Benign;
  }
}

function normalizeAssetType(type: string): ApprovalAssetType {
  switch (type.toUpperCase()) {
    case 'ERC721':
      return ApprovalAssetType.ERC721;
    case 'ERC1155':
      return ApprovalAssetType.ERC1155;
    default:
      return ApprovalAssetType.ERC20;
  }
}

function normalizeApprovals(
  response: BlockaidApprovalResponse,
  chainId: string,
  chainName: string,
): ApprovalItem[] {
  const items: ApprovalItem[] = [];

  for (const rawApproval of response.approvals) {
    for (const spender of rawApproval.spenders) {
      const id = `${chainId}-${rawApproval.asset.address}-${spender.address}`;
      const verdict = normalizeVerdict(spender.verdict);

      items.push({
        id,
        chainId,
        chainName,
        asset: {
          address: rawApproval.asset.address,
          symbol: rawApproval.asset.symbol,
          name: rawApproval.asset.name,
          decimals: rawApproval.asset.decimals,
          logo_url: rawApproval.asset.logo_url,
          type: normalizeAssetType(rawApproval.asset.type),
        },
        spender: {
          address: spender.address,
          label: spender.label,
          is_contract: spender.is_contract,
          features: spender.features,
          verdict,
          exposure_usd: spender.exposure_usd,
        },
        allowance: {
          amount: spender.approval.amount,
          is_unlimited: spender.approval.is_unlimited,
        },
        verdict,
        exposure_usd: spender.exposure_usd ?? 0,
      });
    }
  }

  return items;
}

export interface FetchAllApprovalsResult {
  approvals: ApprovalItem[];
  chainErrors: Record<string, string>;
}

export async function fetchAllApprovals(
  address: string,
): Promise<FetchAllApprovalsResult> {
  const chainEntries = SUPPORTED_CHAIN_IDS.map((chainId) => ({
    chainId,
    chainName: CHAIN_ID_TO_BLOCKAID_NAME[chainId],
  }));

  const results = await Promise.allSettled(
    chainEntries.map(({ chainName }) =>
      fetchChainApprovals(address, chainName),
    ),
  );

  const allApprovals: ApprovalItem[] = [];
  const chainErrors: Record<string, string> = {};

  results.forEach((result, index) => {
    const { chainId, chainName } = chainEntries[index];

    if (result.status === 'fulfilled') {
      const normalized = normalizeApprovals(result.value, chainId, chainName);
      allApprovals.push(...normalized);
    } else {
      chainErrors[chainId] =
        result.reason?.message ?? `Failed to fetch approvals for ${chainName}`;
    }
  });

  return { approvals: allApprovals, chainErrors };
}
